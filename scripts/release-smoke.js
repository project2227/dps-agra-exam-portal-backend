'use strict';
// Production-safe synthetic fixtures, scoped by random UUIDs and removed in finally.
// Verifies the public HTTPS edge, actual cookies, autosave and teacher Socket.IO.
const crypto=require('crypto'),bcrypt=require('bcryptjs'),assert=require('node:assert/strict');
const db=require('../src/config/db'),{env}=require('../src/config/env'),{COOKIE}=require('../src/services/accountSessions');
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
  assert.equal((await request('/api/student/exams/'+ids.exam+'/submit',null,'POST',{},token)).status,200);assert.equal((await db.query('SELECT answer_text,student_id FROM answers WHERE session_id=$1',[joined.data.session.id])).rows[0].student_id,ids.student);completed++;
  const guest=await request('/api/exams/'+ids.exam+'/join',null,'POST',{name:'Deployment Smoke Guest',rollNumber:roll+'g',className:'IX',section:'A',passcode});assert.equal(guest.status,201);assert.equal((await request('/api/student/exams/'+ids.exam+'/submit',null,'POST',{},guest.data.token)).status,200);assert.equal((await request('/api/accounts/logout',student,'POST',{})).status,200);assert.equal((await request('/api/accounts/student/profile',student)).status,401);completed++;
  return {passed:true,checks:completed};
 } finally {
  clients.forEach(s=>s.disconnect());
  await db.transaction(async c=>{await c.query('DELETE FROM audit_logs WHERE teacher_id=$1 OR exam_id=$2',[ids.teacher,ids.exam]);await c.query('DELETE FROM exams WHERE id=$1 AND teacher_id=$2',[ids.exam,ids.teacher]);await c.query('DELETE FROM account_sessions WHERE teacher_id=$1 OR student_id=$2',[ids.teacher,ids.student]);if(ids.student){await c.query('DELETE FROM student_learning_progress WHERE student_id=$1',[ids.student]);await c.query('DELETE FROM students WHERE id=$1 AND created_by=$2',[ids.student,ids.teacher]);}await c.query('DELETE FROM teachers WHERE id=$1',[ids.teacher]);});
 }
}
module.exports={releaseSmoke};
