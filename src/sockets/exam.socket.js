'use strict';
const jwt=require('jsonwebtoken');const db=require('../config/db');const {env}=require('../config/env');
const {hash}=require('../middleware/auth');const {event,EVENT_SEVERITY}=require('../services/proctor');
const {attach,teacherRoom,studentRoom,publish,privateStudent}=require('../services/events');const {audit}=require('../services/audit');
const LIMIT=12000;
function attachSockets(io){
 attach(io);
 // Snapshot subscriptions live in memory for a single Socket.IO process.
 // A subscription is opt-in, short-lived, per selected student and per teacher.
 // No image data is written to SQL, audit logs, object storage or disk.
 const snapshotSubscribers=new Map(); // sessionId => Map(teacherSocketId,expiresAt)
 const SNAPSHOT_SUBSCRIPTION_MS=50000;
 const SNAPSHOT_MAX_DATA_URI=130000;
 function subscribers(sessionId,examId) {
  const map=snapshotSubscribers.get(sessionId);
  if(!map)return [];
  const now=Date.now();
  for(const [id,until] of map) {
   const peer=io.sockets.sockets.get(id);
   if(until<now || !peer || !peer.rooms.has(teacherRoom(examId)))map.delete(id);
  }
  if(map.size===0){snapshotSubscribers.delete(sessionId);return [];}
  return [...map.keys()];
 }
 function detachTeacher(id) {
  for(const [sessionId,map] of snapshotSubscribers) {
   if(!map.delete(id))continue;
   if(map.size===0){
    snapshotSubscribers.delete(sessionId);
    privateStudent(sessionId,'teacher:snapshotRequested',{sessionId,requested:false});
   }
  }
 }
 function notifySnapshotTeachers(sessionId,examId,status) {
  for(const id of subscribers(sessionId,examId))
   io.to(id).emit('teacher:snapshotStatus',{sessionId,status});
 }

 io.use(async(socket,next)=>{
  const token=socket.handshake.auth?.token;
  if(typeof token!=='string')return next(new Error('Authentication required.'));
  try {
   try {const t=jwt.verify(token,env.JWT_SECRET,{issuer:'dps-exam'});
    if(t.kind==='teacher'){
     const q=await db.query('SELECT id,role FROM teachers WHERE id=$1 AND active=true',[t.sub]);
     if(q.rowCount){socket.data.identity={kind:'teacher',id:t.sub};return next();}
    }
   }catch{}
   const t=jwt.verify(token,env.STUDENT_SESSION_SECRET,{issuer:'dps-exam'});
   if(t.kind!=='student')throw new Error('Wrong role.');
   const q=await db.query(`SELECT id,exam_id,token_hash,status,consent_webcam,consent_screen
     FROM exam_sessions WHERE id=$1 AND exam_id=$2`,[t.sub,t.examId]);
   if(!q.rowCount||q.rows[0].token_hash!==hash(token)||['submitted','revoked'].includes(q.rows[0].status))throw new Error('Invalid session.');
   socket.data.identity={kind:'student',id:t.sub,examId:t.examId};
   return next();
  }catch{next(new Error('Authentication expired or invalid.'));}
 });
 io.on('connection',socket=>{
  const ident=socket.data.identity;
  const throttle=new Map();
  const relayWindow=[]; // Permit ICE bursts, but bound total signaling traffic per socket.
  socket.data.snapshotOptIn=false;
  const limited=(event,minMs=250)=>{const now=Date.now();if(now-(throttle.get(event)||0)<minMs)return true;throttle.set(event,now);return false;};
  const guard=async(fn)=>{try{await fn();}catch(err){socket.emit('exam:error',{message:err.status?err.message:'Operation rejected.'});}};
  const checkStudent=async()=>{
   if(ident.kind!=='student')throw Object.assign(new Error('Student session required.'),{status:403});
   const q=await db.query(`SELECT s.*,e.status AS exam_status,e.start_time,e.end_time,e.duration_minutes
     FROM exam_sessions s JOIN exams e ON e.id=s.exam_id WHERE s.id=$1`,[ident.id]);
   const s=q.rows[0];if(!s||['revoked','submitted'].includes(s.status))throw Object.assign(new Error('Session closed.'),{status:403});
   if(!['active','scheduled'].includes(s.exam_status)||Date.now()<new Date(s.start_time).getTime()||
      Date.now()>new Date(s.end_time).getTime()||
      Date.now()>new Date(s.joined_at).getTime()+s.duration_minutes*60000)
    throw Object.assign(new Error('Exam session time expired.'),{status:403});
   return s;
  };
  const checkTeacher=async(examId)=>{
   if(ident.kind!=='teacher')throw Object.assign(new Error('Teacher required.'),{status:403});
   const q=await db.query('SELECT e.id FROM exams e JOIN teachers t ON t.id=e.teacher_id AND t.active=true WHERE e.id=$1 AND e.teacher_id=$2',[examId,ident.id]);
   if(!q.rowCount)throw Object.assign(new Error('Exam access denied.'),{status:403});
  };
  const checkOwnedStudent=async(sessionId)=>{
   const q=await db.query(`SELECT s.* FROM exam_sessions s JOIN exams e ON e.id=s.exam_id
   WHERE s.id=$1 AND e.teacher_id=$2`,[sessionId,ident.id]);
   if(!q.rowCount)throw Object.assign(new Error('Student is not in your exam.'),{status:403});return q.rows[0];
  };
  socket.on('teacher:communityJoin',()=>guard(async()=>{
   if(ident.kind!=='teacher')return;
   const q=await db.query('SELECT active FROM teachers WHERE id=$1 AND active=true',[ident.id]);
   if(!q.rowCount)return;
   socket.join('teachers:community');socket.emit('teachers:communityJoined',{ok:true});
  }));
  socket.on('student:joinExamRoom',()=>guard(async()=>{
   const s=await checkStudent();socket.join(`exam:${s.exam_id}:students`);socket.join(studentRoom(s.id));
   await db.query(`UPDATE exam_sessions SET active_socket_id=$1,status=CASE WHEN status='disconnected' THEN 'active' ELSE status END
   WHERE id=$2`,[socket.id,s.id]);
   publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,status:s.status==='flagged'?'flagged':'active',connected:true});
   socket.emit('exam:joined',{sessionId:s.id,monitoring:{webcam:s.consent_webcam,screen:s.consent_screen}});
   // A student can only begin sending pictures after explicitly opting in.
   if(subscribers(s.id,s.exam_id).length)
    socket.emit('teacher:snapshotRequested',{sessionId:s.id,requested:true});
  }));
  socket.on('student:heartbeat',()=>guard(async()=>{
   if(limited('heartbeat',10000))return;const s=await checkStudent();
   await db.query('UPDATE exam_sessions SET updated_at=now() WHERE id=$1',[s.id]);
   publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,status:s.status==='flagged'?'flagged':'active',connected:true,at:new Date().toISOString()});
  }));
  for(const name of ['student:answerUpdate','student:codeUpdate','student:questionChange']){
   socket.on(name,data=>guard(async()=>{
    if(limited(name,800))return;
    const s=await checkStudent();
    const qid=String(data?.questionId||'');
    const q=await db.query(`SELECT id, row_number() OVER(ORDER BY sort_order,id) AS position
      FROM questions WHERE exam_id=$1`,[s.exam_id]);
    const match=q.rows.find(row=>row.id===qid);if(!match)return;
    const mapped={'student:answerUpdate':'exam:answerLiveUpdate','student:codeUpdate':'exam:codeLiveUpdate','student:questionChange':'exam:studentStatusUpdate'};
    publish(s.exam_id,mapped[name],{sessionId:s.id,questionId:qid,
      ...(name==='student:questionChange'?{currentQuestion:Number(match.position)}:{}),
      at:new Date().toISOString()});
   }));
  }
  socket.on('student:proctorEvent',data=>guard(async()=>{
   if(limited('proctor:'+data?.eventType,1000))return;const s=await checkStudent();
   if(!EVENT_SEVERITY[data?.eventType])return;
   await event({examId:s.exam_id,sessionId:s.id,eventType:data.eventType,message:'Browser-reported event (unverified).',metadata:data.metadata});
  }));
  for(const name of ['student:webcamStatus','student:screenStatus']){
   socket.on(name,data=>guard(async()=>{
    if(limited(name,1000))return;const s=await checkStudent();const active=data?.active===true;
    const consent=name==='student:webcamStatus'?s.consent_webcam:s.consent_screen;
    if(active&&!consent)return;
    const label=name==='student:webcamStatus'?'webcam':'screen';
    publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,[label+'Active']:active,connected:true});
    if(!active&&consent)await event({examId:s.exam_id,sessionId:s.id,
     eventType:label==='webcam'?'WEBCAM_STOPPED':'SCREEN_SHARE_STOPPED',message:'Student reported media sharing stopped.'});
   }));
  }
  // Only the student can report that a requested stream is not currently shared.
  // This operational status is not a misconduct flag and contains no media.
  socket.on('student:mediaUnavailable',data=>guard(async()=>{
   if(limited('media-unavailable:'+data?.mediaType,1000))return;
   const s=await checkStudent();const kind=String(data?.mediaType||'');
   if(!['webcam','screen'].includes(kind))return;
   publish(s.exam_id,'teacher:mediaStatus',{sessionId:s.id,mediaType:kind,status:'not-sharing'});
  }));
  socket.on('teacher:joinMonitorRoom',data=>guard(async()=>{
   const examId=String(data?.examId||'');await checkTeacher(examId);
   socket.join(teacherRoom(examId));socket.emit('teacher:monitorJoined',{examId});
  }));
  socket.on('teacher:requestMediaPreview',data=>guard(async()=>{
   const mediaType=String(data?.mediaType||'');
   if(!['webcam','screen'].includes(mediaType))return;
   // Separate quotas: a paired webcam + screen request must not drop one feed.
   if(limited('media-preview:'+mediaType,700))return;
   const session=await checkOwnedStudent(String(data?.sessionId||''));
   const sessionId=session.id;
   const reply=status=>socket.emit('teacher:mediaStatus',{sessionId,mediaType,status});
   if(!['joined','active','disconnected','flagged'].includes(session.status))return reply('session-ended');
   if(mediaType==='webcam'&&!session.consent_webcam)return reply('not-consented');
   if(mediaType==='screen'&&!session.consent_screen)return reply('not-consented');
   if(!session.active_socket_id)return reply('student-offline');
   reply('requested');
   privateStudent(session.id,'teacher:mediaRequest',{sessionId,mediaType});
  }));

  // ---- Optional, consented JPEG webcam snapshot relay (NOT gaze detection) ----
  socket.on('teacher:snapshotSubscribe',data=>guard(async()=>{
   if(limited('snapshot-subscribe',700))return;
   const s=await checkOwnedStudent(String(data?.sessionId||''));
   if(!socket.rooms.has(teacherRoom(s.exam_id)))
    throw Object.assign(new Error('Join the exam monitor first.'),{status:403});
   if(!['joined','active','flagged','disconnected'].includes(s.status)){
    return socket.emit('teacher:snapshotStatus',{sessionId:s.id,status:'session-ended'});
   }
   if(!s.consent_webcam){
    return socket.emit('teacher:snapshotStatus',{sessionId:s.id,status:'not-consented'});
   }
   detachTeacher(socket.id); // One selected student per teacher socket, always.
   if(!s.active_socket_id){
    return socket.emit('teacher:snapshotStatus',{sessionId:s.id,status:'student-offline'});
   }
   // Remove expired viewers first; never create a new map before cleanup.
   const current=subscribers(s.id,s.exam_id);
   let map=snapshotSubscribers.get(s.id);
   if(current.length>=3 && !map?.has(socket.id)){
    return socket.emit('teacher:snapshotStatus',{sessionId:s.id,status:'busy'});
   }
   if(!map){map=new Map();snapshotSubscribers.set(s.id,map);}
   map.set(socket.id,Date.now()+SNAPSHOT_SUBSCRIPTION_MS);
   socket.emit('teacher:snapshotStatus',{sessionId:s.id,status:'awaiting-consent'});
   privateStudent(s.id,'teacher:snapshotRequested',{sessionId:s.id,requested:true});
  }));
  socket.on('teacher:snapshotKeepalive',data=>guard(async()=>{
   if(limited('snapshot-keepalive',12000))return;
   const sessionId=String(data?.sessionId||'');
   const map=snapshotSubscribers.get(sessionId);
   if(!map?.has(socket.id))return;
   const s=await checkOwnedStudent(sessionId);
   if(!socket.rooms.has(teacherRoom(s.exam_id))||
      !['joined','active','flagged','disconnected'].includes(s.status)||!s.consent_webcam) {
    detachTeacher(socket.id);
    return socket.emit('teacher:snapshotStatus',{sessionId,status:'session-ended'});
   }
   map.set(socket.id,Date.now()+SNAPSHOT_SUBSCRIPTION_MS);
   if(s.active_socket_id)
    privateStudent(sessionId,'teacher:snapshotRequested',{sessionId,requested:true});
  }));
  socket.on('teacher:snapshotUnsubscribe',data=>{
   if(ident.kind!=='teacher')return;
   const sessionId=String(data?.sessionId||'');
   const map=snapshotSubscribers.get(sessionId);
   if(!map?.has(socket.id))return;
   map.delete(socket.id);
   if(map.size===0){
    snapshotSubscribers.delete(sessionId);
    privateStudent(sessionId,'teacher:snapshotRequested',{sessionId,requested:false});
   }
   socket.emit('teacher:snapshotStatus',{sessionId,status:'stopped'});
  });
  socket.on('student:snapshotConsent',data=>guard(async()=>{
   if(limited('snapshot-consent',500))return;
   const s=await checkStudent();
   if(s.active_socket_id!==socket.id)return;
   const available=subscribers(s.id,s.exam_id);
   const enabled=data?.enabled===true && s.consent_webcam===true && available.length>0;
   socket.data.snapshotOptIn=enabled;
   for(const id of available)io.to(id).emit('teacher:snapshotStatus',{
    sessionId:s.id,status:enabled?'sharing':'student-stopped'
   });
  }));
  socket.on('student:snapshotFrame',data=>guard(async()=>{
   // Validate before any DB read to bound bandwidth and CPU even for a
   // malicious authenticated client. Ignore instead of persisting bad frames.
   if(!socket.data.snapshotOptIn || limited('snapshot-frame',3500))return;
   const jpeg=data?.jpeg;
   if(typeof jpeg!=='string'||jpeg.length<300||jpeg.length>SNAPSHOT_MAX_DATA_URI||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(jpeg))return;
   const s=await checkStudent();
   if(s.active_socket_id!==socket.id || !s.consent_webcam)return;
   const active=subscribers(s.id,s.exam_id);
   if(!active.length){
    socket.data.snapshotOptIn=false;
    return socket.emit('teacher:snapshotRequested',{sessionId:s.id,requested:false});
   }
   const packet={sessionId:s.id,jpeg,ts:new Date().toISOString()};
   for(const id of active)io.to(id).emit('teacher:snapshotFrame',packet);
  }));
  // ---- End private webcam snapshot relay ----
  socket.on('teacher:requestStudentDetail',data=>guard(async()=>{
   if(limited('detail',1000))return;
   const s=await checkOwnedStudent(String(data?.sessionId||''));
   socket.emit('teacher:studentDetail',{sessionId:s.id,status:s.status,flags:s.flags_count,joinedAt:s.joined_at,submittedAt:s.submitted_at});
  }));
  socket.on('teacher:sendWarning',data=>guard(async()=>{
   if(limited('warning',3000))return;
   const s=await checkOwnedStudent(String(data?.sessionId||''));
   const message=String(data?.message||'').slice(0,300).trim();if(!message)return;
   const at=new Date().toISOString();
   // A teacher can document a possible concern, but this observation does NOT
   // alter the student's automated flag/cheating score or constitute proof.
   await audit({teacherId:ident.id,examId:s.exam_id,action:'teacher:warning',details:{sessionId:s.id,message}});
   publish(s.exam_id,'exam:proctorFlag',{sessionId:s.id,event:{
      eventType:'TEACHER_OBSERVATION',message,details:{message},createdAt:at,severity:'info'
   },reviewRequired:true});
   privateStudent(s.id,'teacher:warningSent',{message,at});
   socket.emit('teacher:warningSent',{sessionId:s.id,dispatched:true,deliveryConfirmed:false});
  }));
  socket.on('teacher:lockStudentExam',data=>guard(async()=>{
   const s=await checkOwnedStudent(String(data?.sessionId||''));
   await db.query(`UPDATE exam_sessions SET status='revoked',token_hash=encode(gen_random_bytes(32),'hex'),updated_at=now()
    WHERE id=$1 AND status<>'submitted'`,[s.id]);
   await audit({teacherId:ident.id,examId:s.exam_id,action:'session:locked',details:{sessionId:s.id}});
   privateStudent(s.id,'teacher:lockExam',{reason:'Teacher closed this session.'});
   publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,status:'revoked'});
  }));
  // Only signaling messages are relayed; there is NO server-side media capture/recording.
  async function webrtcRelay(event,data){
   const now=Date.now();while(relayWindow.length&&relayWindow[0]<now-10000)relayWindow.shift();
   if(relayWindow.length>=240)return;relayWindow.push(now);
   const cap=event==='webrtc:iceCandidate'?4096:65536;
   if(JSON.stringify(data||{}).length>cap)return;
   const sessionId=String(data?.sessionId||'');
   const mediaType=String(data?.mediaType||'');
   if(!['webcam','screen'].includes(mediaType))return;
   if(ident.kind==='student'){
    const s=await checkStudent();if(s.id!==sessionId)return;
    if(mediaType==='webcam'&&!s.consent_webcam)return;
    if(mediaType==='screen'&&!s.consent_screen)return;
    if(event==='webrtc:answer')return;
    io.to(teacherRoom(s.exam_id)).emit(event,{sessionId:s.id,mediaType,payload:data?.payload});
   }else{
    const s=await checkOwnedStudent(sessionId);
    if(mediaType==='webcam'&&!s.consent_webcam)return;
    if(mediaType==='screen'&&!s.consent_screen)return;
    if(event==='webrtc:offer')return; // Students initiate all sharing after explicit browser consent.
    privateStudent(s.id,event,{sessionId:s.id,mediaType,payload:data?.payload});
   }
  }
  for(const e of ['webrtc:offer','webrtc:answer','webrtc:iceCandidate','webrtc:endStream'])
   socket.on(e,data=>guard(()=>webrtcRelay(e,data)));
  socket.on('disconnect',()=>{
   if(ident.kind==='teacher'){
    detachTeacher(socket.id);
    return;
   }
   socket.data.snapshotOptIn=false;
   const old=snapshotSubscribers.get(ident.id);
   if(old)for(const id of old.keys())io.to(id).emit('teacher:snapshotStatus',{
    sessionId:ident.id,status:'student-offline'
   });
   if(ident.kind!=='student')return;
   db.query(`UPDATE exam_sessions SET active_socket_id=NULL,
   status=CASE WHEN status='active' THEN 'disconnected' ELSE status END
   WHERE id=$1 AND active_socket_id=$2 RETURNING exam_id,status`,[ident.id,socket.id]).then(q=>{
    if(q.rowCount){publish(q.rows[0].exam_id,'exam:studentDisconnected',{sessionId:ident.id,status:'disconnected',connected:false});
     // A disconnection is an operational event, NOT a verified cheating incident.
    }
   }).catch(err=>console.error('[socket disconnect]',err.message));
  });
 });
}
module.exports={attachSockets};
