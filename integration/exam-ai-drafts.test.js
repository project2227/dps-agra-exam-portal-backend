'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const http=require('node:http'),crypto=require('node:crypto'),bcrypt=require('bcryptjs');
const {Server}=require('socket.io'),{io:connect}=require('socket.io-client');
const db=require('../src/config/db'),{env}=require('../src/config/env');const {createSession,COOKIE}=require('../src/services/accountSessions');
const {attachSockets}=require('../src/sockets/exam.socket');
const wait=(s,event)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Missing '+event)),8000);s.once(event,p=>{clearTimeout(timer);resolve(p)})});
test('teacher AI drafts, postponement and advisory grading preserve authenticated exam and monitor flows',{timeout:90000},async t=>{
 assert.equal(env.NODE_ENV,'test','Use only the disposable integration database');
 const key='synthetic-gateway-key-for-integration-only',calls=[];let bad=false,offline=false,importedCount=0;
 const generated={title:'Python assessment',questions:[{type:'mcq',prompt:'Which value is True?',marks:1,options:['True','False'],correctAnswer:0,modelAnswer:'',rubric:'',language:null,starterCode:'',sourcePages:[1]},
  {type:'code',prompt:'Write a function that returns the sum of two numbers.',marks:5,options:[],correctAnswer:null,modelAnswer:'',rubric:'Award 5 marks for a correct sum function.',language:'python',starterCode:'',sourcePages:[1]}],warnings:[],needsTeacherReview:true,status:'draft'};
 const gateway=http.createServer(async(req,res)=>{
  assert.equal(req.headers.authorization,'Bearer '+key);let body='';for await(const b of req)body+=b;
  const payload=body?JSON.parse(body):null;calls.push({path:req.url,payload});res.setHeader('content-type','application/json');
  if(offline){res.writeHead(503);return res.end('{}');}
  if(req.url==='/health')return res.end(JSON.stringify({gatewayReady:true,modelInstalled:true,model:'synthetic-test-model',busy:false}));
  if(req.url==='/v1/exams/draft'){const r=structuredClone(generated);if(importedCount)r.questions=Array.from({length:importedCount},(_,i)=>structuredClone(generated.questions[i%2]));if(bad)r.questions[0].correctAnswer=99;return res.end(JSON.stringify(r));}
  res.end(JSON.stringify({verdict:'correct',suggestedMarks:5,explanation:'Meets the approved rubric.',rubricChecks:['Returns a sum.'],needsTeacherReview:true,finalGrade:false}));
 });await new Promise(r=>gateway.listen(0,'127.0.0.1',r));
 env.DPS_AI_GATEWAY_URL='http://127.0.0.1:'+gateway.address().port;env.DPS_AI_GATEWAY_KEY=key;env.EXAM_PASSCODE_KEY='ab'.repeat(32);
 const {app}=require('../src/app');const server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:192*1024});attachSockets(io);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,clients=[];
 t.after(async()=>{clients.forEach(s=>s.disconnect());await new Promise(r=>io.close(r));await new Promise(r=>server.close(r));await new Promise(r=>gateway.close(r));await db.pool.end();});
 const hostId=crypto.randomUUID(),otherId=crypto.randomUUID(),auths=new Map();
 for(const [id,name] of [[hostId,'host'],[otherId,'other']])await db.query(`INSERT INTO teachers(id,name,email,password_hash,assigned_classes) VALUES($1,$2,$3,$4,'["IX"]')`,[id,'Synthetic '+name,id+'@example.invalid',await bcrypt.hash('Synthetic-Password-123!',4)]);
 async function auth(id){let token;const s=await createSession({headers:{}},{cookie:(n,v)=>{token=v},set:()=>{}},{teacherId:id});auths.set(token,s.csrfToken);return token}
 const host=await auth(hostId),other=await auth(otherId);
 const request=async(path,token,method='GET',body)=>{
  const form=body instanceof FormData;
  const r=await fetch(base+path,{method,headers:{...(token?(auths.has(token)?{Cookie:COOKIE+'='+token,'X-CSRF-Token':auths.get(token)}:{Authorization:'Bearer '+token}):{}),...(body&&!form?{'content-type':'application/json'}:{})},...(body?{body:form?body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};
 };
 const form=()=>{const f=new FormData();f.append('file',new Blob([Buffer.from('Q1. True or False? Answer: True.')]),'paper.txt');return f;};
 const sourceText='[Page 1]\nPython functions and Boolean values.';
 const definition={exam:{title:'',subject:'Computers',className:'IX',section:'A',examType:'mixed',startTime:new Date(Date.now()+10*60000).toISOString(),endTime:new Date(Date.now()+55*60000).toISOString(),durationMinutes:45,settings:{}},
  questions:[{type:'mcq',title:'',description:'',marks:1,options:['','','',''],correctAnswer:null}]};
 let draft,questions,student,joined;
 await t.test('AI and draft endpoints require teacher cookies and CSRF',async()=>{
  for(const path of ['/api/teacher/exam-ai/status','/api/teacher/exams/'+crypto.randomUUID()+'/builder'])assert.equal((await request(path)).status,401);
  assert.equal((await request('/api/teacher/exam-drafts',null,'POST',definition)).status,401);
  const r=await fetch(base+'/api/teacher/exam-drafts',{method:'POST',headers:{Cookie:COOKIE+'='+host,'content-type':'application/json'},body:JSON.stringify(definition)});assert.equal(r.status,403);
 });
 await t.test('source extraction and validated previews do not create or publish exams',async()=>{
  assert.equal((await request('/api/teacher/exam-ai/status',host)).data.ready,true);
  const source=await request('/api/teacher/exam-ai/source',host,'POST',form());assert.equal(source.status,200);assert.match(source.data.chunks[0].text,/Answer: True/);
  assert.equal((await request('/api/teacher/exam-ai/source',other,'POST',{handoutId:crypto.randomUUID()})).status,404);
  const r=await request('/api/teacher/exam-ai/draft',host,'POST',{mode:'generate',className:'IX',subject:'Computers',topic:'Python',questionCount:2,questionTypes:['mcq','code'],language:'python',sourceText});
  assert.equal(r.status,200);assert.equal(r.data.status,'draft');assert.equal(r.data.questions[0].correctAnswer,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM exams WHERE teacher_id=$1',[hostId])).rows[0].n,0);
  bad=true;assert.equal((await request('/api/teacher/exam-ai/draft',host,'POST',{mode:'import',className:'IX',subject:'Computers',questionTypes:['mcq','code'],language:'python',sourceText})).status,502);bad=false;
  offline=true;assert.equal((await request('/api/teacher/exam-ai/status',host)).data.ready,false);offline=false;
 });
 await t.test('five-question limit rejects larger requests before inference and caps older gateway imports',async()=>{
  const input={mode:'generate',className:'IX',subject:'Computers',topic:'Python',questionCount:6,questionTypes:['mcq','code'],language:'python',sourceText};const before=calls.length;
  assert.equal((await request('/api/teacher/exam-ai/draft',host,'POST',input)).status,400);assert.equal(calls.length,before)
  importedCount=8;const imported=await request('/api/teacher/exam-ai/draft',host,'POST',{...input,mode:'import',questionCount:5});assert.equal(imported.status,200);assert.equal(imported.data.questions.length,5);assert.ok(imported.data.warnings.some(w=>w.includes('first 5')))
  assert.equal(calls.at(-1).payload.questionCount,undefined)
  const smaller=await request('/api/teacher/exam-ai/draft',host,'POST',{...input,mode:'import',questionCount:2});assert.equal(smaller.status,200);assert.equal(smaller.data.questions.length,2);importedCount=0;
 });
 await t.test('unfinished drafts save, reopen and reject stale or non-owner edits',async()=>{
  const saved=await request('/api/teacher/exam-drafts',host,'POST',definition);assert.equal(saved.status,201);draft=saved.data.exam;
  const open=await request('/api/teacher/exams/'+draft.id+'/builder',host);assert.equal(open.status,200);assert.equal(open.data.questions[0].description,'');assert.deepEqual(open.data.questions[0].options,['','','','']);
  assert.equal((await request('/api/teacher/exams/'+draft.id+'/builder',other)).status,404);
  assert.equal((await request('/api/teacher/exam-drafts/'+draft.id,host,'PUT',{...definition,expectedUpdatedAt:'2000-01-01T00:00:00.000Z'})).status,409);
  assert.equal((await request('/api/teacher/exam-drafts/'+draft.id,other,'PUT',{...definition,expectedUpdatedAt:draft.updated_at})).status,404);
  assert.equal((await request('/api/teacher/exams/'+draft.id+'/generate-passcode',host,'POST',{passcode:'DRAFT-TEST-1234'})).status,200);
  assert.equal((await request('/api/teacher/exams/'+draft.id+'/publish',host,'POST',{})).status,400);
 });
 await t.test('practicals publish without model answers or test outputs; approved rubrics stay private',async()=>{
  draft=(await request('/api/teacher/exams/'+draft.id+'/builder',host)).data.exam;
  definition.exam.title='Python assessment';definition.questions=[{type:'mcq',title:'Pick True',description:'Which value is True?',marks:1,options:['True','False'],correctAnswer:'True'},
   {type:'code',title:'Sum function',description:generated.questions[1].prompt,marks:5,language:'python',markingNotes:{modelAnswer:'',rubric:generated.questions[1].rubric,aiMarking:true,rubricApproved:true}}];
  const r=await request('/api/teacher/exam-drafts/'+draft.id,host,'PUT',{...definition,expectedUpdatedAt:draft.updated_at});assert.equal(r.status,200);
  const published=await request('/api/teacher/exams/'+draft.id+'/publish',host,'POST',{});assert.equal(published.status,200);draft=published.data.exam;
  questions=(await request('/api/teacher/exams/'+draft.id+'/builder',host)).data.questions;assert.equal(questions[1].correct_answer.rubricApproved,true);assert.equal(questions[1].hidden_tests.length,0);
 });
 await t.test('postponement updates the schedule and preserves question IDs and password',async()=>{
  const hash=(await db.query('SELECT passcode_hash FROM exams WHERE id=$1',[draft.id])).rows[0].passcode_hash;
  const moved=await request('/api/teacher/exams/'+draft.id+'/postpone',host,'POST',{startTime:new Date(Date.now()+2*86400000).toISOString(),endTime:new Date(Date.now()+2*86400000+45*60000).toISOString(),expectedUpdatedAt:draft.updated_at});assert.equal(moved.status,200);draft=moved.data.exam;
  assert.equal(draft.status,'scheduled');assert.equal((await request('/api/exams/active')).data.exams.some(e=>e.id===draft.id),false);
  assert.deepEqual((await request('/api/teacher/exams/'+draft.id+'/builder',host)).data.questions.map(q=>q.id),questions.map(q=>q.id));
  assert.equal((await db.query('SELECT passcode_hash FROM exams WHERE id=$1',[draft.id])).rows[0].passcode_hash,hash);
  await db.query("UPDATE exams SET start_time=now()-interval '1 minute',end_time=now()+interval '45 minutes' WHERE id=$1",[draft.id]);
 });
 await t.test('student login, joining, autosave, proctor flags and live monitor still work',async()=>{
  const s=await request('/api/accounts/teacher/students',host,'POST',{admissionNumber:'AI-'+hostId.slice(0,12),name:'Synthetic Student',rollNumber:'AI-1',className:'IX',section:'A',schoolEmail:''});assert.equal(s.status,201);
  const login=await fetch(base+'/api/accounts/student/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:s.data.student.username,password:s.data.temporaryPassword})});assert.equal(login.status,200);const data=await login.json();student=login.headers.get('set-cookie').split(';')[0].split('=')[1];auths.set(student,data.csrfToken);
  assert.equal((await request('/api/accounts/student/set-password',student,'POST',{newPassword:'Synthetic-Student-New-Password-123!'})).status,200);
  assert.equal((await request('/api/teacher/exams/'+draft.id+'/builder',student)).status,401);assert.equal((await request('/api/teacher/exam-ai/status',student)).status,401);
  const j=await request('/api/exams/'+draft.id+'/join',student,'POST',{passcode:'DRAFT-TEST-1234'});assert.equal(j.status,201);joined=j.data;
  const pupilQuestions=await request('/api/student/exams/'+draft.id+'/questions',joined.token);assert.equal(pupilQuestions.status,200);
  for(const q of pupilQuestions.data.questions){assert.equal('correct_answer' in q,false);assert.equal('markingNotes' in q,false);assert.equal('hidden_tests' in q,false);}
  const monitor=connect(base,{transports:['websocket'],extraHeaders:{Cookie:COOKIE+'='+host}});clients.push(monitor);await wait(monitor,'connect');const ready=wait(monitor,'teacher:monitorJoined');monitor.emit('teacher:joinMonitorRoom',{examId:draft.id});await ready;
  assert.equal((await request('/api/student/exams/'+draft.id+'/answers/save',joined.token,'POST',{questionId:questions[0].id,answerText:'True'})).status,200);
  assert.equal((await request('/api/student/exams/'+draft.id+'/answers/save',joined.token,'POST',{questionId:questions[1].id,code:'def add(a,b): return a+b',language:'python'})).status,200);
  const flag=wait(monitor,'exam:proctorFlag');assert.equal((await request('/api/proctor/event',joined.token,'POST',{eventType:'TAB_SWITCH'})).status,201);assert.equal((await flag).sessionId,joined.session.id);
  assert.equal((await request('/api/teacher/exams/'+draft.id+'/monitor',host)).data.students[0].answered,2);
  const answer=(await db.query('SELECT id FROM answers WHERE session_id=$1 AND question_id=$2',[joined.session.id,questions[1].id])).rows[0];
  assert.equal((await request('/api/teacher/answers/'+answer.id+'/ai-suggestion',host,'POST',{})).status,409);
  assert.equal((await request('/api/teacher/exams/'+draft.id+'/postpone',host,'POST',{startTime:new Date(Date.now()+3*86400000).toISOString(),endTime:new Date(Date.now()+3*86400000+45*60000).toISOString(),expectedUpdatedAt:draft.updated_at})).status,409);
  assert.equal((await request('/api/student/exams/'+draft.id+'/submit',joined.token,'POST',{})).status,200);
 });
 await t.test('AI suggestions never save grades; only the owner can explicitly award marks',async()=>{
  const answer=(await db.query('SELECT id,marks_awarded FROM answers WHERE session_id=$1 AND question_id=$2',[joined.session.id,questions[1].id])).rows[0];assert.equal(answer.marks_awarded,null);
  assert.equal((await request('/api/teacher/answers/'+answer.id+'/ai-suggestion',other,'POST',{})).status,404);
  const r=await request('/api/teacher/answers/'+answer.id+'/ai-suggestion',host,'POST',{});assert.equal(r.status,200);assert.equal(r.data.finalGrade,false);assert.equal(r.data.suggestedMarks,5);
  assert.equal((await db.query('SELECT marks_awarded FROM answers WHERE id=$1',[answer.id])).rows[0].marks_awarded,null);
  assert.equal((await request('/api/teacher/answers/'+answer.id+'/marks',other,'PUT',{marksAwarded:5})).status,400);
  assert.equal((await request('/api/teacher/answers/'+answer.id+'/marks',host,'PUT',{marksAwarded:5,teacherRemarks:'Teacher reviewed.'})).status,200);
  const payload=calls.find(c=>c.path==='/v1/grades/suggest').payload;assert.equal(JSON.stringify(payload).includes('Synthetic Student'),false);assert.equal(payload.rubricApproved,true);
  assert.equal((await request('/api/teacher/exams/'+draft.id+'/submissions',host)).data.submissions[0].status,'submitted');
 });
});
