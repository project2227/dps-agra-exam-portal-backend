'use strict';
// Synthetic records only. Run against a disposable test database, never production.
const {test}=require('node:test');const assert=require('node:assert/strict');
const crypto=require('node:crypto'),http=require('node:http'),bcrypt=require('bcryptjs');
const {Server}=require('socket.io');const {io:connect}=require('socket.io-client');
const {pool}=require('../src/config/db');const {createSession,COOKIE}=require('../src/services/accountSessions');
const {attachSockets}=require('../src/sockets/exam.socket');
const wait=(socket,event)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Missing '+event)),8000);socket.once(event,p=>{clearTimeout(timer);resolve(p)})});
test('waiting rooms, incident ownership, kick/readmit and permanent cleanup work through real authenticated HTTP and sockets',{timeout:60000},async t=>{
 assert.equal(process.env.NODE_ENV,'test','Integration tests require a disposable test database');
 const ids=Object.fromEntries(['host','admin','other','exam','protectedExam','question','handout'].map(k=>[k,crypto.randomUUID()]));
 const {app}=require('../src/app');const server=http.createServer(app);
 const io=new Server(server,{maxHttpBufferSize:192*1024});attachSockets(io);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port,clients=[];
 t.after(async()=>{clients.forEach(s=>s.disconnect());await new Promise(r=>io.close(r));await new Promise(r=>server.close(r));await pool.end()});
 for(const role of ['host','admin','other'])await pool.query(`INSERT INTO teachers(id,name,email,password_hash,role,assigned_classes)
 VALUES($1,$2,$3,'synthetic-test-hash',$4,'["IX"]')`,[ids[role],'Synthetic '+role,ids[role]+'@example.invalid',role==='admin'?'admin':'teacher']);
 const auths=new Map();
 async function teacherCookie(id){let token;const session=await createSession({headers:{}},{cookie:(n,v)=>{token=v},set:()=>{}},{teacherId:id});auths.set(token,session.csrfToken);return token}
 const host=await teacherCookie(ids.host),admin=await teacherCookie(ids.admin),other=await teacherCookie(ids.other);
 const password='DPS-TEST-8888',passcodeHash=await bcrypt.hash('DPSTEST8888',4);
 for(const exam of ['exam','protectedExam'])await pool.query(`INSERT INTO exams(id,title,class_name,section,teacher_id,exam_type,start_time,end_time,duration_minutes,status,passcode_hash)
 VALUES($1,$2,'IX','A',$3,'quiz',now()+interval '10 minutes',now()+interval '45 minutes',5,'scheduled',$4)`,[ids[exam],'Synthetic '+exam,ids.host,passcodeHash]);
 await pool.query(`INSERT INTO questions(id,exam_id,type,title,correct_answer,marks) VALUES($1,$2,'short','Private question','"Private answer"',5)`,[ids.question,ids.exam]);
 const request=async(path,token,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{...(token?(auths.has(token)?{Cookie:COOKIE+'='+token,'X-CSRF-Token':auths.get(token)}:{Authorization:'Bearer '+token}):{}),...(body&&!(body instanceof FormData)?{'content-type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});const data=r.headers.get('content-type')?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer());return {status:r.status,data}};
 const join=async(roll,recording=false)=>request('/api/exams/'+ids.exam+'/join',null,'POST',{name:'Synthetic Student '+roll,rollNumber:roll,className:'IX',section:'A',passcode:password,consent:{screenShare:true,recording,stills:true}});
 let first,second,recording;
 await t.test('students can check in before start while questions, answers and submissions stay locked',async()=>{
  const list=await request('/api/exams/active');assert.equal(list.status,200);assert.equal(list.data.exams.find(e=>e.id===ids.exam).status,'scheduled');
  first=await join('early-1',true);second=await join('early-2');assert.equal(first.status,201);assert.equal(second.status,201);assert.equal(first.data.session.status,'joined');
  const entry=await request('/api/student/exams/'+ids.exam+'/entry',first.data.token);assert.equal(entry.status,200);assert.equal(entry.data.waiting,true);assert.equal('questions' in entry.data,false);assert.equal('passcode_hash' in entry.data.exam,false);
  for(const suffix of ['questions','answers'])assert.equal((await request('/api/student/exams/'+ids.exam+'/'+suffix,first.data.token)).status,403);
  assert.equal((await request('/api/student/exams/'+ids.exam+'/submit',first.data.token,'POST',{})).status,403);
  const observer=connect(base,{transports:['websocket'],extraHeaders:{Cookie:COOKIE+'='+host}});const pupil=connect(base,{transports:['websocket'],auth:{token:first.data.token}});clients.push(observer,pupil);
  await Promise.all([wait(observer,'connect'),wait(pupil,'connect')]);const joined=wait(observer,'teacher:monitorJoined');observer.emit('teacher:joinMonitorRoom',{examId:ids.exam});await joined;
  const update=wait(observer,'exam:studentStatusUpdate');const ready=wait(pupil,'exam:joined');pupil.emit('student:joinExamRoom');assert.equal((await update).status,'joined');await ready;
 });
 await t.test('the server counts exam duration from scheduled start for early arrivals',async()=>{
  await pool.query("UPDATE exams SET start_time=now()-interval '1 minute' WHERE id=$1",[ids.exam]);
  await pool.query("UPDATE exam_sessions SET joined_at=now()-interval '20 minutes' WHERE id=$1",[first.data.session.id]);
  const questions=await request('/api/student/exams/'+ids.exam+'/questions',first.data.token);assert.equal(questions.status,200);assert.equal(questions.data.questions.length,1);assert.equal('correctAnswer' in questions.data.questions[0],false);assert.equal('correct_answer' in questions.data.questions[0],false);
  assert.ok(Date.parse(questions.data.startedAt)>Date.now()-120000);
  assert.equal((await request('/api/student/exams/'+ids.exam+'/answers/save',first.data.token,'POST',{questionId:ids.question,answerText:'Synthetic saved answer'})).status,200);
 });
 await t.test('screen clips require independent consent, ordered idempotent chunks and exam ownership',async()=>{
  const body={clientId:crypto.randomUUID(),triggerType:'TAB_SWITCH',mimeType:'video/webm'};
  assert.equal((await request('/api/student/incidents',second.data.token,'POST',body)).status,403);
  recording=await request('/api/student/incidents',first.data.token,'POST',body);assert.equal(recording.status,201);
  const repeat=await request('/api/student/incidents',first.data.token,'POST',body);assert.equal(repeat.data.recordingId,recording.data.recordingId);
  const id=recording.data.recordingId,bytes=Buffer.from([0x1a,0x45,0xdf,0xa3,1,2,3,4]);
  const form=()=>{const f=new FormData();f.append('chunk',new Blob([bytes]),'screen.webm');return f};
  const path='/api/student/incidents/'+id+'/chunks/0';assert.equal((await request(path,second.data.token,'POST',form())).status,403);
  assert.equal((await request(path,first.data.token,'POST',form())).status,200);assert.equal((await request(path,first.data.token,'POST',form())).status,200);
  assert.equal((await request('/api/student/incidents/'+id+'/chunks/2',first.data.token,'POST',form())).status,409);
  assert.equal((await request('/api/teacher/incidents/'+id+'/video',host)).status,409);
  assert.equal((await request('/api/student/incidents/'+id+'/finish',first.data.token,'POST',{reason:'returned-to-fullscreen'})).status,200);
  const video=await request('/api/teacher/incidents/'+id+'/video',host);assert.equal(video.status,200);assert.deepEqual(video.data,bytes);
  assert.equal((await request('/api/teacher/incidents/'+id+'/video',other)).status,404);assert.equal((await request('/api/teacher/incidents/'+id+'/video',first.data.token)).status,401);
  await pool.query("UPDATE incident_recordings SET expires_at=now()-interval '1 second' WHERE id=$1",[id]);assert.equal((await request('/api/teacher/incidents/'+id+'/video',host)).status,404);
  // Keep an unexpired clip for the linked-data purge check.
  await pool.query("UPDATE incident_recordings SET expires_at=now()+interval '7 days' WHERE id=$1",[id]);
 });
 await t.test('only the host can kick; revoked tokens stay invalid after explicit readmission',async()=>{
  const path='/api/teacher/sessions/'+first.data.session.id;
  assert.equal((await request(path+'/kick',other,'POST',{reason:'Synthetic removal'})).status,409);
  const locked=wait(clients[1],'teacher:lockExam');assert.equal((await request(path+'/kick',host,'POST',{reason:'Synthetic removal'})).status,200);assert.equal((await locked).kicked,true);
  assert.equal((await request('/api/student/session',first.data.token)).status,401);assert.equal((await join('early-1',true)).status,403);
  assert.equal((await request(path+'/readmit',other,'POST',{})).status,404);assert.equal((await request(path+'/readmit',host,'POST',{})).status,200);
  const readmitted=await join('early-1',true);assert.equal(readmitted.status,201);assert.notEqual(readmitted.data.session.id,first.data.session.id);assert.equal((await request('/api/student/session',first.data.token)).status,401);
 });
 await t.test('final submission preserves the last draft atomically after the normal autosave deadline',async()=>{
  await pool.query("UPDATE exams SET start_time=now()-interval '6 minutes',duration_minutes=5 WHERE id=$1",[ids.exam]);
  await pool.query("UPDATE exam_sessions SET joined_at=now()-interval '6 minutes',started_at=now()-interval '5 minutes 10 seconds' WHERE id=$1",[second.data.session.id]);
  assert.equal((await request('/api/student/exams/'+ids.exam+'/answers/save',second.data.token,'POST',{questionId:ids.question,answerText:'Final deadline draft'})).status,403);
  const submit=await request('/api/student/exams/'+ids.exam+'/submit',second.data.token,'POST',{finalAnswers:[{questionId:ids.question,answerText:'Final deadline draft'}]});
  assert.equal(submit.status,200);assert.equal((await pool.query('SELECT answer_text FROM answers WHERE session_id=$1',[second.data.session.id])).rows[0].answer_text,'Final deadline draft');
  assert.equal((await request('/api/student/exams/'+ids.exam+'/submit',second.data.token,'POST',{})).status,401);
 });
 await t.test('admin cleanup removes linked data from all lists and protects running exams and unrelated teaching data',async()=>{
  await pool.query("UPDATE exams SET status='closed',archived_at=now() WHERE id=$1",[ids.exam]);
  await pool.query(`INSERT INTO code_runs(exam_id,session_id,question_id,language,code,status) VALUES($1,$2,$3,'python','print(1)','synthetic')`,[ids.exam,first.data.session.id,ids.question]);
  await pool.query(`INSERT INTO anti_cheat_events(exam_id,session_id,event_type,severity) VALUES($1,$2,'TAB_SWITCH','medium')`,[ids.exam,first.data.session.id]);
  const fileKey='student-answers/'+ids.exam+'/synthetic';await pool.query(`INSERT INTO stored_files(storage_key,file_bytes,mime_type,original_name,size_bytes) VALUES($1,$2,'text/plain','synthetic.txt',4)`,[fileKey,Buffer.from('test')]);
  await pool.query('UPDATE answers SET file_key=$1 WHERE exam_id=$2',[fileKey,ids.exam]);
  await pool.query(`INSERT INTO handouts(id,title,file_key,file_type,class_name,uploaded_by) VALUES($1,'Unrelated handout','handouts/synthetic','text/plain','IX',$2)`,[ids.handout,ids.host]);
  assert.equal((await request('/api/admin/data/tests')).status,401);assert.equal((await request('/api/admin/data/tests',host)).status,403);assert.equal((await request('/api/admin/data/tests',second.data.token)).status,401);
  const protectedBody={examIds:[ids.protectedExam],confirmation:'DELETE 1 TESTS'};assert.equal((await request('/api/admin/data/preview',admin,'POST',protectedBody)).status,409);assert.equal((await request('/api/admin/data/tests',admin,'DELETE',protectedBody)).status,409);
  const selection={examIds:[ids.exam]};const preview=await request('/api/admin/data/preview',admin,'POST',selection);assert.equal(preview.status,200);assert.equal(preview.data.counts.answers,2);assert.equal(preview.data.counts.recordings,1);
  assert.equal((await request('/api/admin/data/tests',admin,'DELETE',{...selection,confirmation:'wrong'})).status,400);
  const removed=await request('/api/admin/data/tests',admin,'DELETE',{...selection,confirmation:preview.data.confirmation});assert.equal(removed.status,200);
  for(const table of ['exams','questions','exam_sessions','answers','code_runs','anti_cheat_events','incident_recordings','audit_logs']){const key=table==='exams'?'id':'exam_id';assert.equal((await pool.query('SELECT count(*)::int AS n FROM '+table+' WHERE '+key+'=$1',[ids.exam])).rows[0].n,0,table+' still contained deleted test data')}
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM incident_recording_chunks')).rows[0].n,0);assert.equal((await pool.query('SELECT 1 FROM stored_files WHERE storage_key=$1',[fileKey])).rowCount,0);
  assert.equal((await pool.query('SELECT 1 FROM handouts WHERE id=$1',[ids.handout])).rowCount,1);assert.equal((await pool.query('SELECT 1 FROM teachers WHERE id=$1',[ids.host])).rowCount,1);assert.equal((await pool.query('SELECT 1 FROM exams WHERE id=$1',[ids.protectedExam])).rowCount,1);
  assert.equal((await request('/api/admin/data/tests',admin)).data.tests.some(e=>e.id===ids.exam),false);
  const list=await request('/api/teacher/exams?includeArchived=true',host);assert.equal(list.status,200);assert.equal(list.data.exams.some(e=>e.id===ids.exam),false);
 });
});
