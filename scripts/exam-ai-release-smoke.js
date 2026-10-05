'use strict';
// Only randomly identified, synthetic teaching data. Never touches existing exams.
const crypto=require('node:crypto'),bcrypt=require('bcryptjs'),assert=require('node:assert/strict');
const db=require('../src/config/db'),{env}=require('../src/config/env');const {cleanupReleaseFixtures}=require('./release-smoke');
async function examAiReleaseSmoke(){
 const endpoint=env.API_PUBLIC_URL;assert.ok(endpoint?.startsWith('https://'));
 const ids={teacher:crypto.randomUUID(),exam:null},password=crypto.randomBytes(24).toString('base64url');let cookie='',csrf='',checks=0,gatewayReady=false;
 async function request(path,method='GET',body){
  const r=await fetch(endpoint+path,{method,headers:{Origin:env.FRONTEND_URL.split(',')[0],...(cookie?{Cookie:cookie,'X-CSRF-Token':csrf}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(path.includes('exam-ai/draft')?150000:30000)});
  const data=await r.json();if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];if(data.csrfToken)csrf=data.csrfToken;return {status:r.status,data};
 }
 try{
  await db.query(`INSERT INTO teachers(id,name,email,password_hash,assigned_classes) VALUES($1,'Deployment Smoke Teacher',$2,$3,'["IX"]')`,[ids.teacher,ids.teacher+'@example.invalid',await bcrypt.hash(password,12)]);
  assert.equal((await request('/api/auth/teacher/login','POST',{email:ids.teacher+'@example.invalid',password})).status,200);checks++;
  const base={exam:{title:'Deployment Smoke AI Draft',className:'IX',section:'A',examType:'mixed',subject:'Computers',startTime:new Date(Date.now()+86400000).toISOString(),endTime:new Date(Date.now()+86400000+45*60000).toISOString(),durationMinutes:45,settings:{}},
   questions:[{type:'code',title:'',description:'',marks:5,language:'python'}]};
  const created=await request('/api/teacher/exam-drafts','POST',base);assert.equal(created.status,201);ids.exam=created.data.exam.id;
  await db.query(`UPDATE exams SET settings=settings||'{"releaseSmoke":true}'::jsonb WHERE id=$1 AND teacher_id=$2`,[ids.exam,ids.teacher]);checks++;
  const loaded=await request('/api/teacher/exams/'+ids.exam+'/builder');assert.equal(loaded.status,200);assert.equal(loaded.data.questions[0].description,'');checks++;
  base.questions=[{type:'code',title:'Sum function',description:'Write a sum function.',marks:5,language:'python',markingNotes:{modelAnswer:'',rubric:'Correct addition function: 5 marks.',aiMarking:true,rubricApproved:true}}];
  const saved=await request('/api/teacher/exam-drafts/'+ids.exam,'PUT',{...base,expectedUpdatedAt:loaded.data.exam.updated_at});assert.equal(saved.status,200);assert.equal(saved.data.questions[0].hidden_tests.length,0);checks++;
  // The editor uses strict settings; re-tag our private fixture for cleanup.
  await db.query(`UPDATE exams SET settings=settings||'{"releaseSmoke":true}'::jsonb WHERE id=$1 AND teacher_id=$2`,[ids.exam,ids.teacher]);
  assert.equal((await request('/api/teacher/exams/'+ids.exam+'/generate-passcode','POST',{passcode:'SMOKE'+crypto.randomBytes(8).toString('hex')})).status,200);
  const published=await request('/api/teacher/exams/'+ids.exam+'/publish','POST',{});assert.equal(published.status,200);assert.equal(published.data.exam.status,'scheduled');checks++;
  const postponed=await request('/api/teacher/exams/'+ids.exam+'/postpone','POST',{startTime:new Date(Date.now()+2*86400000).toISOString(),endTime:new Date(Date.now()+2*86400000+45*60000).toISOString(),expectedUpdatedAt:published.data.exam.updated_at});assert.equal(postponed.status,200);checks++;
  const questions=await request('/api/teacher/exams/'+ids.exam+'/builder');assert.equal(questions.data.questions[0].id,saved.data.questions[0].id);assert.equal(questions.data.questions[0].correct_answer.rubricApproved,true);checks++;
  const source=new FormData();source.append('file',new Blob(['Synthetic question: add two numbers. Answer: their sum.'],{type:'text/plain'}),'synthetic.txt');
  const sr=await fetch(endpoint+'/api/teacher/exam-ai/source',{method:'POST',headers:{Cookie:cookie,'X-CSRF-Token':csrf,Origin:env.FRONTEND_URL.split(',')[0]},body:source,signal:AbortSignal.timeout(30000)});assert.equal(sr.status,200);const parsed=await sr.json();assert.match(parsed.chunks[0].text,/Synthetic question/);checks++;
  const connection=await request('/api/teacher/exam-ai/status');assert.equal(connection.status,200);gatewayReady=connection.data.ready===true;checks++;
  const oversized=await request('/api/teacher/exam-ai/draft','POST',{mode:'generate',className:'IX',subject:'Computers',topic:'Python lists',questionCount:6,questionTypes:['mcq']});
  assert.equal(oversized.status,400);checks++;
  if(gatewayReady){
   const preview=await request('/api/teacher/exam-ai/draft','POST',{mode:'generate',className:'IX',subject:'Computers',topic:'Create exactly two MCQs about Python lists and tuples.',questionCount:2,questionTypes:['mcq'],sourceText:'[Page 1]\nPython lists are mutable. Tuples are immutable.'});
   assert.equal(preview.status,200);assert.equal(preview.data.questions.length,2);assert.equal(preview.data.needsTeacherReview,true);checks++;
   const practical=await request('/api/teacher/exam-ai/draft','POST',{mode:'generate',className:'IX',subject:'Computers',topic:'One short Python practical: write a function that returns the length of a list.',questionCount:1,questionTypes:['code'],language:'python',sourceText:'[Page 1]\nThe Python len function returns the number of items in a list.'});
   assert.equal(practical.status,200);assert.equal(practical.data.questions.length,1);assert.equal(practical.data.questions[0].type,'code');assert.equal(practical.data.questions[0].language,'python');checks++;
  }
  return {passed:true,checks,gatewayReady,gatewayConfigured:connection.data.configured===true,model:connection.data.model||'',gatewayMessage:connection.data.message||''};
 }catch(e){e.releaseChecks=checks;throw e;}finally{
  if(ids.exam)await db.query(`UPDATE exams SET settings=settings||'{"releaseSmoke":true}'::jsonb WHERE id=$1 AND teacher_id=$2 AND title='Deployment Smoke AI Draft'`,[ids.exam,ids.teacher]);
  await cleanupReleaseFixtures(ids);
 }
}
module.exports={examAiReleaseSmoke};
