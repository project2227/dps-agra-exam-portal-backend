'use strict';
/**
 * Ephemeral PostgreSQL + real Socket.IO signaling integration check.
 * NO cameras, students, real credentials, or media streams are involved.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const crypto=require('node:crypto');
const {Server}=require('socket.io');
const {io:connect}=require('socket.io-client');
const {pool}=require('../src/config/db');
const {teacherToken,studentToken,hash}=require('../src/middleware/auth');
const {attachSockets}=require('../src/sockets/exam.socket');

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function waitFor(client,event,predicate=()=>true,timeout=10000) {
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{client.off(event,handler);reject(new Error('Timed out waiting for '+event))},timeout);
  function handler(value){if(!predicate(value))return;clearTimeout(timer);client.off(event,handler);resolve(value)}
  client.on(event,handler);
 });
}
function waitMany(client,event,predicate,n,timeout=10000){
 return new Promise((resolve,reject)=>{
  const found=[];
  const timer=setTimeout(()=>{client.off(event,handler);reject(new Error(event+': got '+found.length+' of '+n))},timeout);
  function handler(value){
   if(!predicate(value))return;
   found.push(value);
   if(found.length===n){clearTimeout(timer);client.off(event,handler);resolve(found)}
  }
  client.on(event,handler);
 });
}

test('independent teacher and student sockets request webcam and screen, exchange ICE and preserve review semantics', {timeout:55000},async t=>{
 const teacherId=crypto.randomUUID(),examId=crypto.randomUUID(),sessionId=crypto.randomUUID();
 await pool.query(`INSERT INTO teachers(id,name,email,password_hash,role,assigned_classes)
  VALUES($1,'Integration Teacher','integration-test@example.invalid','not-an-actual-password','teacher','["IX"]'::jsonb)`,[teacherId]);
 await pool.query(`INSERT INTO exams(id,title,subject,class_name,section,teacher_id,exam_type,start_time,end_time,duration_minutes,status)
  VALUES($1,'Mock Socket Test','Computers','IX','A',$2,'quiz',now()-interval '2 minutes',now()+interval '45 minutes',45,'active')`,[examId,teacherId]);
 const studentJwt=studentToken({id:sessionId,exam_id:examId},3600);
 await pool.query(`INSERT INTO exam_sessions(id,exam_id,student_name,roll_number,class_name,section,token_hash,status,consent_webcam,consent_screen)
  VALUES($1,$2,'Synthetic Student','test-roll','IX','A',$3,'active',true,true)`,[sessionId,examId,hash(studentJwt)]);
 const server=http.createServer((req,res)=>{res.statusCode=404;res.end()});
 const io=new Server(server,{cors:{origin:['http://localhost'],methods:['GET','POST']},pingTimeout:20000});
 attachSockets(io);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const opts={transports:['websocket'],forceNew:true,reconnection:false};
 const teacher=connect(url,{...opts,auth:{token:teacherToken({id:teacherId,role:'teacher'})}});
 const student=connect(url,{...opts,auth:{token:studentJwt}});
 t.after(async()=>{
  teacher.disconnect();student.disconnect();
  await new Promise(resolve=>io.close(resolve));
  await new Promise(resolve=>server.close(resolve));
  await pool.end();
 });
 await Promise.all([waitFor(teacher,'connect'),waitFor(student,'connect')]);
 const teacherReady=waitFor(teacher,'teacher:monitorJoined');
 teacher.emit('teacher:joinMonitorRoom',{examId});
 assert.equal((await teacherReady).examId,examId);
 const studentReady=waitFor(student,'exam:joined');
 student.emit('student:joinExamRoom',{examId,sessionId});
 assert.equal((await studentReady).sessionId,sessionId);
 const statuses=waitMany(teacher,'teacher:mediaStatus',s=>s.sessionId===sessionId&&s.status==='requested',2);
 const requested=waitMany(student,'teacher:mediaRequest',s=>s.sessionId===sessionId,2);
 teacher.emit('teacher:requestMediaPreview',{sessionId,mediaType:'webcam'});
 teacher.emit('teacher:requestMediaPreview',{sessionId,mediaType:'screen'});
 assert.deepEqual((await statuses).map(s=>s.mediaType).sort(),['screen','webcam']);
 assert.deepEqual((await requested).map(s=>s.mediaType).sort(),['screen','webcam']);
 const offers=waitMany(teacher,'webrtc:offer',s=>s.sessionId===sessionId,2);
 for(const kind of ['webcam','screen']){
  student.emit('webrtc:offer',{sessionId,mediaType:kind,payload:{type:'offer',sdp:'v=0\r\n'}});
 }
 assert.deepEqual((await offers).map(s=>s.mediaType).sort(),['screen','webcam']);
 const ice=waitMany(teacher,'webrtc:iceCandidate',s=>s.sessionId===sessionId,6);
 for(const kind of ['webcam','screen'])for(let idx=0;idx<3;idx++)
  student.emit('webrtc:iceCandidate',{sessionId,mediaType:kind,payload:{
    candidate:'candidate:'+idx+' 1 udp 12345 127.0.0.1 5000 typ host',sdpMid:'0',sdpMLineIndex:0
  }});
 assert.equal((await ice).length,6,'ICE burst must reach the teacher without silent drops');
 const answer=waitFor(student,'webrtc:answer',s=>s.mediaType==='webcam');
 teacher.emit('webrtc:answer',{sessionId,mediaType:'webcam',payload:{type:'answer',sdp:'v=0\r\n'}});
 assert.equal((await answer).mediaType,'webcam');
 const noStream=waitFor(teacher,'teacher:mediaStatus',s=>s.mediaType==='screen'&&s.status==='not-sharing');
 student.emit('student:mediaUnavailable',{sessionId,mediaType:'screen'});
 await noStream;
 // Tab hiding and losing focus can occur within milliseconds. Neither may
 // suppress the other type; both are fallible signals needing human review.
 const flags=waitMany(teacher,'exam:proctorFlag',
   x=>['TAB_SWITCH','WINDOW_BLUR'].includes(x.event?.eventType),2);
 student.emit('student:proctorEvent',{eventType:'TAB_SWITCH',metadata:{source:'browser'}});
 student.emit('student:proctorEvent',{eventType:'WINDOW_BLUR',metadata:{source:'browser'}});
 assert.deepEqual((await flags).map(x=>x.event.eventType).sort(),['TAB_SWITCH','WINDOW_BLUR']);
 const heartbeat=waitFor(teacher,'exam:studentStatusUpdate',p=>p.sessionId===sessionId&&p.status==='flagged');
 student.emit('student:heartbeat');
 assert.equal((await heartbeat).connected,true);
 // A flagged student remains permitted to share consensual media.
 await pause(750);
 const repeat=waitFor(student,'teacher:mediaRequest',m=>m.mediaType==='webcam');
 teacher.emit('teacher:requestMediaPreview',{sessionId,mediaType:'webcam'});
 await repeat;
 const humanNote=waitFor(teacher,'exam:proctorFlag',x=>x.event?.eventType==='TEACHER_OBSERVATION');
 teacher.emit('teacher:sendWarning',{sessionId,message:'Please stay on your exam page.'});
 assert.equal((await humanNote).event.severity,'info');
 // A staff viewer must deliberately select a student; no camera traffic
 // should reach the staff before the student separately opts in.
 const waiting=waitFor(teacher,'teacher:snapshotStatus',x=>x.sessionId===sessionId&&x.status==='awaiting-consent');
 const stillRequest=waitFor(student,'teacher:snapshotRequested',x=>x.sessionId===sessionId&&x.requested===true);
 teacher.emit('teacher:snapshotSubscribe',{sessionId});
 await Promise.all([waiting,stillRequest]);
 let seen=0;
 const onImage=()=>{seen++};
 teacher.on('teacher:snapshotFrame',onImage);
 const fakeJpeg='data:image/jpeg;base64,'+'A'.repeat(600);
 student.emit('student:snapshotFrame',{jpeg:fakeJpeg});
 await pause(120);
 assert.equal(seen,0,'A webcam frame must NEVER relay before separate opt-in');
 const accepted=waitFor(teacher,'teacher:snapshotStatus',x=>x.sessionId===sessionId&&x.status==='sharing');
 student.emit('student:snapshotConsent',{enabled:true});
 await accepted;
 const incoming=waitFor(teacher,'teacher:snapshotFrame',x=>x.sessionId===sessionId);
 student.emit('student:snapshotFrame',{jpeg:fakeJpeg});
 assert.equal((await incoming).jpeg,fakeJpeg,'consented still image delivered only to subscribed teacher');
 student.emit('student:snapshotFrame',{jpeg:fakeJpeg});
 await pause(100);
 assert.equal(seen,1,'a student cannot flood the backend with 2 frames at once');
 const stopped=waitFor(teacher,'teacher:snapshotStatus',x=>x.sessionId===sessionId&&x.status==='student-stopped');
 student.emit('student:snapshotConsent',{enabled:false});
 await stopped;
 const unsub=waitFor(student,'teacher:snapshotRequested',x=>x.sessionId===sessionId&&x.requested===false);
 teacher.emit('teacher:snapshotUnsubscribe',{sessionId});
 await unsub;
 teacher.off('teacher:snapshotFrame',onImage);
 // An authorized teacher can request a whole-class wall, but a screen frame
 // must never leave a student before a SECOND, visible screen-wall opt-in.
 const wallStatus=waitFor(teacher,'teacher:screenWallStatus',p=>p.examId===examId&&p.status==='watching');
 const wallPrompt=waitFor(student,'teacher:screenWallRequested',p=>p.requested===true);
 teacher.emit('teacher:screenWallStart',{examId});
 await Promise.all([wallStatus,wallPrompt]);
 let leaked=0;
 const onWall=()=>{leaked++};
 teacher.on('teacher:screenWallFrame',onWall);
 student.emit('student:screenWallFrame',{jpeg:fakeJpeg});
 await pause(130);
 assert.equal(leaked,0,'A screen wall MUST NOT capture before student opt-in');
 const sharing=waitFor(teacher,'teacher:screenWallStudentStatus',p=>p.sessionId===sessionId&&p.status==='sharing');
 student.emit('student:screenWallConsent',{enabled:true});
 await sharing;
 const wallImage=waitFor(teacher,'teacher:screenWallFrame',p=>p.sessionId===sessionId);
 student.emit('student:screenWallFrame',{jpeg:fakeJpeg});
 assert.equal((await wallImage).jpeg,fakeJpeg,'consented student screen reaches the authorized wall viewer');
 const wallStopped=waitFor(teacher,'teacher:screenWallStudentStatus',p=>p.sessionId===sessionId&&p.status==='student-stopped');
 student.emit('student:screenWallConsent',{enabled:false});
 await wallStopped;
 const wallOff=waitFor(student,'teacher:screenWallRequested',p=>p.requested===false);
 teacher.emit('teacher:screenWallStop',{examId});
 await wallOff;
 teacher.off('teacher:screenWallFrame',onWall);
 const q=await pool.query('SELECT cheating_score FROM exam_sessions WHERE id=$1',[sessionId]);
 assert.equal(q.rows[0].cheating_score,4,'A teacher note never adds automatic cheating points');
});
