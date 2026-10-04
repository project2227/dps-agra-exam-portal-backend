'use strict';
// Production-safe synthetic fixtures, scoped by random UUIDs and removed in finally.
// Verifies the public HTTPS edge, actual cookies, autosave and teacher Socket.IO.
const crypto=require('crypto'),bcrypt=require('bcryptjs'),assert=require('node:assert/strict');
const db=require('../src/config/db'),{env}=require('../src/config/env'),{COOKIE}=require('../src/services/accountSessions');
async function cleanupReleaseFixtures(ids){
 await db.transaction(async c=>{
  const teacher=(await c.query("SELECT id FROM teachers WHERE id=$1 AND name='Deployment Smoke Teacher' AND email=$2 FOR UPDATE",[ids.teacher,ids.teacher+'@example.invalid'])).rows[0];
  if(!teacher)return;
  const exam=(await c.query("SELECT id FROM exams WHERE id=$1 AND teacher_id=$2 AND settings->>'releaseSmoke'='true' FOR UPDATE",[ids.exam,ids.teacher])).rows[0];
  if(exam){
   // Existing exam foreign keys deliberately retain records; delete only this fixture's children first.
   for(const table of ['anti_cheat_events','code_runs','answers','incident_recordings','exam_sessions','questions'])await c.query(`DELETE FROM ${table} WHERE exam_id=$1`,[ids.exam]);
   await c.query('DELETE FROM audit_logs WHERE exam_id=$1',[ids.exam]);
   await c.query('DELETE FROM exams WHERE id=$1 AND teacher_id=$2',[ids.exam,ids.teacher]);
  }
  await c.query('DELETE FROM audit_logs WHERE teacher_id=$1',[ids.teacher]);
  const student=ids.student&&(await c.query('SELECT id FROM students WHERE id=$1 AND created_by=$2 FOR UPDATE',[ids.student,ids.teacher])).rows[0];
  await c.query('DELETE FROM account_sessions WHERE teacher_id=$1',[ids.teacher]);
  if(student){
   for(const table of ['account_sessions','student_learning_progress','student_password_resets','student_deletion_requests'])await c.query(`DELETE FROM ${table} WHERE student_id=$1`,[ids.student]);
   await c.query('DELETE FROM students WHERE id=$1 AND created_by=$2',[ids.student,ids.teacher]);
  }
  await c.query("DELETE FROM teachers WHERE id=$1 AND name='Deployment Smoke Teacher' AND email=$2",[ids.teacher,ids.teacher+'@example.invalid']);
 });
}
async function releaseSmoke(){
 const endpoint=env.API_PUBLIC_URL;if(!endpoint||!endpoint.startsWith('https://'))throw Error('A public HTTPS API URL is required for the release smoke test.');
 const ids={teacher:crypto.randomUUID(),student:null,exam:crypto.randomUUID(),question:crypto.randomUUID()},clients=[];
 const teacherPassword=crypto.randomBytes(24).toString('base64url'),studentPassword=crypto.randomBytes(24).toString('base64url'),passcode='SMOKE'+crypto.randomBytes(8).toString('hex').toUpperCase();
 let completed=0;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function request(path,jar,method='GET',body,token){const r=await fetch(endpoint+path,{method,headers:{Origin:env.FRONTEND_URL.split(',')[0],...(jar?.cookie?{Cookie:jar.cookie,'X-CSRF-Token':jar.csrfToken}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});const result=await r.json();if(jar){const cookie=r.headers.get('set-cookie');if(cookie){assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=None/);jar.cookie=cookie.split(';')[0]}if(result.csrfToken)jar.csrfToken=result.csrfToken}return {status:r.status,data:result}}
 const once=(socket,event)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Smoke monitor did not receive '+event)),12000);socket.once(event,data=>{clearTimeout(timer);resolve(data)});socket.once('connect_error',()=>{clearTimeout(timer);reject(Error('Smoke socket authentication failed'))})});
 try {
  let healthy=false;for(let i=0;i<30;i++){try{const h=await request('/api/health');if(h.status===200&&h.data.release==='student-accounts-v1'){healthy=true;break}}catch{}await sleep(3000)}assert.ok(healthy,'New build must be reachable through public HTTPS');completed++;
  const email=ids.teacher+'@example.invalid';await db.query(`INSERT INTO teachers(id,name,email,password_hash,assigned_classes) VALUES($1,'Deployment Smoke Teacher',$2,$3,'["IX"]')`,[ids.teacher,email,await bcrypt.hash(teacherPassword,12)]);
  const teacher={};assert.equal((await request('/api/auth/teacher/login',teacher,'POST',{email,password:teacherPassword})).status,200);completed++;
  const roll='s-'+ids.teacher.slice(0,12),created=await request('/api/accounts/teacher/students',teacher,'POST',{admissionNumber:'SMOKE-'+ids.teacher.slice(0,12),name:'Deployment Smoke Student',rollNumber:roll,className:'IX',section:'A',schoolEmail:''});assert.equal(created.status,201);ids.student=created.data.student.id;
  const student={};assert.equal((await request('/api/accounts/student/login',student,'POST',{username:created.data.student.username,password:created.data.temporaryPassword})).status,200);assert.equal((await request('/api/accounts/student/set-password',student,'POST',{newPassword:studentPassword})).status,200);assert.equal((await request('/api/accounts/student/profile',student)).status,200);completed++;
  await db.query(`INSERT INTO exams(id,title,class_name,section,teacher_id,exam_type,start_time,end_time,duration_minutes,status,passcode_hash,settings) VALUES($1,'Deployment Smoke Assessment','IX','A',$2,'quiz',now()-interval '1 minute',now()+interval '10 minutes',10,'active',$3,'{"releaseSmoke":true}')`,[ids.exam,ids.teacher,await bcrypt.hash(passcode,12)]);
  await db.query(`INSERT INTO questions(id,exam_id,type,title,marks,correct_answer) VALUES($1,$2,'short','Synthetic answer',5,'null')`,[ids.question,ids.exam]);
  const joined=await request('/api/exams/'+ids.exam+'/join',student,'POST',{passcode});assert.equal(joined.status,201);const token=joined.data.token;completed++;
  assert.equal((await request('/api/student/exams/'+ids.exam+'/questions',null,'GET',null,token)).status,200);assert.equal((await request('/api/student/exams/'+ids.exam+'/answers/save',null,'POST',{questionId:ids.question,answerText:'Synthetic saved answer'},token)).status,200);completed++;
  const {io}=require('socket.io-client');const observer=io(endpoint,{transports:['websocket'],reconnection:false,extraHeaders:{Cookie:teacher.cookie,Origin:env.FRONTEND_URL.split(',')[0]}}),pupil=io(endpoint,{transports:['websocket'],reconnection:false,auth:{token},extraHeaders:{Origin:env.FRONTEND_URL.split(',')[0]}});clients.push(observer,pupil);await Promise.all([once(observer,'connect'),once(pupil,'connect')]);const monitor=once(observer,'teacher:monitorJoined');observer.emit('teacher:joinMonitorRoom',{examId:ids.exam});await monitor;const update=once(observer,'exam:studentStatusUpdate'),ready=once(pupil,'exam:joined');pupil.emit('student:joinExamRoom');await Promise.all([update,ready]);completed++;
  const flagged=once(observer,'exam:proctorFlag');const event=await request('/api/proctor/event',null,'POST',{eventType:'TAB_SWITCH',message:'Synthetic release verification'},token);assert.equal(event.status,201);const flag=await flagged;assert.equal(flag.sessionId,joined.data.session.id);assert.equal(flag.event.eventType,'TAB_SWITCH');const monitorRows=await request('/api/teacher/exams/'+ids.exam+'/monitor',teacher);assert.equal(monitorRows.status,200);assert.equal(monitorRows.data.students.find(s=>s.id===joined.data.session.id).answered,1);completed++;
  // Optional analysis must fail closed until enabled and separately consented.
  assert.equal((await request('/api/student/vision-consent',null,'POST',{consent:true},token)).status,403);completed++;
  assert.equal((await request('/api/proctor/event',null,'POST',{eventType:'VISION_GAZE_AWAY'},token)).status,403);completed++;
  await db.query(`UPDATE exams SET settings=settings||'{"visionTracking":true}'::jsonb WHERE id=$1 AND teacher_id=$2`,[ids.exam,ids.teacher]);
  assert.equal((await request('/api/student/vision-consent',null,'POST',{consent:true},token)).status,200);completed++;
  const score=(await db.query('SELECT cheating_score FROM exam_sessions WHERE id=$1',[joined.data.session.id])).rows[0].cheating_score;
  const visionFlag=once(observer,'exam:proctorFlag');assert.equal((await request('/api/proctor/event',null,'POST',{eventType:'VISION_HEAD_TURN',metadata:{reason:'Synthetic local estimate'}},token)).status,201);
  assert.equal((await visionFlag).event.eventType,'VISION_HEAD_TURN');assert.equal((await db.query('SELECT cheating_score FROM exam_sessions WHERE id=$1',[joined.data.session.id])).rows[0].cheating_score,score);completed++;
  assert.equal((await request('/api/student/vision-consent',null,'POST',{consent:false},token)).status,200);completed++;
  assert.equal((await request('/api/proctor/event',null,'POST',{eventType:'VISION_HEAD_TURN'},token)).status,403);completed++;
  assert.equal((await request('/api/student/exams/'+ids.exam+'/submit',null,'POST',{},token)).status,200);assert.equal((await db.query('SELECT answer_text,student_id FROM answers WHERE session_id=$1',[joined.data.session.id])).rows[0].student_id,ids.student);completed++;
  const submissions=await request('/api/teacher/exams/'+ids.exam+'/submissions',teacher);assert.equal(submissions.status,200);assert.ok(submissions.data.submissions.some(s=>s.id===joined.data.session.id));completed++;
  const guest=await request('/api/exams/'+ids.exam+'/join',null,'POST',{name:'Deployment Smoke Guest',rollNumber:roll+'g',className:'IX',section:'A',passcode});assert.equal(guest.status,201);assert.equal((await request('/api/student/exams/'+ids.exam+'/submit',null,'POST',{},guest.data.token)).status,200);assert.equal((await request('/api/accounts/logout',student,'POST',{})).status,200);assert.equal((await request('/api/accounts/student/profile',student)).status,401);completed++;
  return {passed:true,checks:completed};
 } catch(error){error.releaseChecks=completed;throw error;} finally {
  clients.forEach(s=>s.disconnect());
  await cleanupReleaseFixtures(ids);
 }
}
module.exports={releaseSmoke,cleanupReleaseFixtures};

