'use strict';
const jwt=require('jsonwebtoken');const db=require('../config/db');const {env}=require('../config/env');
const {hash}=require('../middleware/auth');const {event,EVENT_SEVERITY}=require('../services/proctor');
const {attach,teacherRoom,studentRoom,publish,privateStudent}=require('../services/events');const {audit}=require('../services/audit');
const LIMIT=12000;
function attachSockets(io){
 attach(io);
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
  const limited=(event,minMs=250)=>{const now=Date.now();if(now-(throttle.get(event)||0)<minMs)return true;throttle.set(event,now);return false;};
  const guard=async(fn)=>{try{await fn();}catch(err){socket.emit('exam:error',{message:err.status?err.message:'Operation rejected.'});}};
  const checkStudent=async()=>{
   if(ident.kind!=='student')throw Object.assign(new Error('Student session required.'),{status:403});
   const q=await db.query(`SELECT s.*,e.status AS exam_status,e.start_time,e.end_time
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
  socket.on('student:joinExamRoom',()=>guard(async()=>{
   const s=await checkStudent();socket.join(`exam:${s.exam_id}:students`);socket.join(studentRoom(s.id));
   await db.query(`UPDATE exam_sessions SET active_socket_id=$1,status=CASE WHEN status='disconnected' THEN 'active' ELSE status END
   WHERE id=$2`,[socket.id,s.id]);
   publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,status:'connected'});
   socket.emit('exam:joined',{sessionId:s.id,monitoring:{webcam:s.consent_webcam,screen:s.consent_screen}});
  }));
  socket.on('student:heartbeat',()=>guard(async()=>{
   if(limited('heartbeat',10000))return;const s=await checkStudent();
   await db.query('UPDATE exam_sessions SET updated_at=now() WHERE id=$1',[s.id]);
   publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,status:'online',at:new Date().toISOString()});
  }));
  for(const name of ['student:answerUpdate','student:codeUpdate','student:questionChange']){
   socket.on(name,data=>guard(async()=>{
    if(limited(name,800))return;
    const s=await checkStudent();
    const qid=String(data?.questionId||'');
    const q=await db.query('SELECT id FROM questions WHERE id=$1 AND exam_id=$2',[qid,s.exam_id]);
    if(!q.rowCount)return;
    const mapped={'student:answerUpdate':'exam:answerLiveUpdate','student:codeUpdate':'exam:codeLiveUpdate','student:questionChange':'exam:studentStatusUpdate'};
    publish(s.exam_id,mapped[name],{sessionId:s.id,questionId:qid,at:new Date().toISOString()});
   }));
  }
  socket.on('student:proctorEvent',data=>guard(async()=>{
   if(limited('proctor',1000))return;const s=await checkStudent();
   if(!EVENT_SEVERITY[data?.eventType])return;
   await event({examId:s.exam_id,sessionId:s.id,eventType:data.eventType,message:'Browser-reported event (unverified).',metadata:data.metadata});
  }));
  for(const name of ['student:webcamStatus','student:screenStatus']){
   socket.on(name,data=>guard(async()=>{
    if(limited(name,1000))return;const s=await checkStudent();const active=data?.active===true;
    const consent=name==='student:webcamStatus'?s.consent_webcam:s.consent_screen;
    if(active&&!consent)return;
    const label=name==='student:webcamStatus'?'webcam':'screen';
    publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,[label]:active});
    if(!active&&consent)await event({examId:s.exam_id,sessionId:s.id,
     eventType:label==='webcam'?'WEBCAM_STOPPED':'SCREEN_SHARE_STOPPED',message:'Student reported media sharing stopped.'});
   }));
  }
  socket.on('teacher:joinMonitorRoom',data=>guard(async()=>{
   const examId=String(data?.examId||'');await checkTeacher(examId);
   socket.join(teacherRoom(examId));socket.emit('teacher:monitorJoined',{examId});
  }));
  // Teacher can ask for a view only when the specific student has already
  // consented. The request NEVER calls browser media APIs or starts capture.
  // A consenting student still needs an active, explicitly opened stream.
  socket.on('teacher:requestMediaPreview',data=>guard(async()=>{
   if(limited('media-preview',1000))return;
   const mediaType=String(data?.mediaType||'');
   if(!['webcam','screen'].includes(mediaType))return;
   const session=await checkOwnedStudent(String(data?.sessionId||''));
   if(!['joined','active','disconnected','flagged'].includes(session.status))return;
   if(mediaType==='webcam'&&!session.consent_webcam)return;
   if(mediaType==='screen'&&!session.consent_screen)return;
   privateStudent(session.id,'teacher:mediaRequest',{sessionId:session.id,mediaType});
  }));
  socket.on('teacher:requestStudentDetail',data=>guard(async()=>{
   if(limited('detail',1000))return;
   const s=await checkOwnedStudent(String(data?.sessionId||''));
   socket.emit('teacher:studentDetail',{sessionId:s.id,status:s.status,flags:s.flags_count,joinedAt:s.joined_at,submittedAt:s.submitted_at});
  }));
  socket.on('teacher:sendWarning',data=>guard(async()=>{
   if(limited('warning',3000))return;
   const s=await checkOwnedStudent(String(data?.sessionId||''));
   const message=String(data?.message||'').slice(0,300).trim();if(!message)return;
   privateStudent(s.id,'teacher:warningSent',{message,at:new Date().toISOString()});
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
   if(limited(event,100))return;
   if(JSON.stringify(data||{}).length>LIMIT)return;
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
   if(ident.kind!=='student')return;
   db.query(`UPDATE exam_sessions SET active_socket_id=NULL,
   status=CASE WHEN status='active' THEN 'disconnected' ELSE status END
   WHERE id=$1 AND active_socket_id=$2 RETURNING exam_id,status`,[ident.id,socket.id]).then(q=>{
    if(q.rowCount){publish(q.rows[0].exam_id,'exam:studentDisconnected',{sessionId:ident.id});
     // A disconnection is an operational event, NOT a verified cheating incident.
    }
   }).catch(err=>console.error('[socket disconnect]',err.message));
  });
 });
}
module.exports={attachSockets};
