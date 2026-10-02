'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pool}=require('../src/config/db'),{cleanupReleaseFixtures}=require('../scripts/release-smoke');
test('release checks remove only owned synthetic fixtures in foreign-key order',async t=>{
 assert.equal(process.env.NODE_ENV,'test');t.after(()=>pool.end());
 const ids={teacher:crypto.randomUUID(),student:crypto.randomUUID(),exam:crypto.randomUUID()},other={teacher:crypto.randomUUID(),exam:crypto.randomUUID()},question=crypto.randomUUID(),session=crypto.randomUUID();
 for(const [fixture,name] of [[ids,'Deployment Smoke Teacher'],[other,'School Teacher']]){
  await pool.query('INSERT INTO teachers(id,name,email,password_hash) VALUES($1,$2,$3,$4)',[fixture.teacher,name,fixture.teacher+'@example.invalid','unused-test-hash']);
  await pool.query(`INSERT INTO exams(id,title,class_name,teacher_id,exam_type,start_time,end_time,duration_minutes,settings) VALUES($1,'Test','IX',$2,'quiz',now(),now()+interval '1 hour',60,$3)`,[fixture.exam,fixture.teacher,JSON.stringify(fixture===ids?{releaseSmoke:true}:{})]);
 }
 await pool.query(`INSERT INTO students(id,admission_number,name,roll_number,class_name,section,password_hash,created_by) VALUES($1,$2,'Test Student','1','IX','A','unused-test-hash',$3)`,[ids.student,ids.student,ids.teacher]);
 await pool.query(`INSERT INTO questions(id,exam_id,type,title,marks) VALUES($1,$2,'short','Test',1)`,[question,ids.exam]);
 await pool.query(`INSERT INTO exam_sessions(id,exam_id,student_id,student_name,roll_number,class_name,section,token_hash) VALUES($1,$2,$3,'Test Student','1','IX','A',$4)`,[session,ids.exam,ids.student,crypto.randomBytes(32).toString('hex')]);
 await pool.query('INSERT INTO answers(exam_id,session_id,question_id,answer_text) VALUES($1,$2,$3,$4)',[ids.exam,session,question,'Answer']);
 await pool.query(`INSERT INTO code_runs(exam_id,session_id,question_id,language,code,status) VALUES($1,$2,$3,'python','pass','success')`,[ids.exam,session,question]);
 await pool.query(`INSERT INTO anti_cheat_events(exam_id,session_id,event_type,severity) VALUES($1,$2,'TEST','low')`,[ids.exam,session]);
 await pool.query(`INSERT INTO audit_logs(teacher_id,exam_id,action) VALUES($1,$2,'TEST')`,[ids.teacher,ids.exam]);
 await pool.query(`INSERT INTO account_sessions(token_hash,csrf_hash,student_id,device_label,expires_at) VALUES($1,'test',$2,'Test device',now()+interval '1 hour')`,[session,ids.student]);
 await cleanupReleaseFixtures({teacher:other.teacher,exam:other.exam,student:null});
 assert.equal((await pool.query('SELECT id FROM exams WHERE id=$1',[other.exam])).rowCount,1);
 await cleanupReleaseFixtures(ids);
 for(const [table,id] of [['teachers',ids.teacher],['students',ids.student],['exams',ids.exam],['exam_sessions',session]])assert.equal((await pool.query(`SELECT id FROM ${table} WHERE id=$1`,[id])).rowCount,0);
 assert.equal((await pool.query('SELECT id FROM exams WHERE id=$1',[other.exam])).rowCount,1);
 assert.equal((await pool.query('SELECT id FROM teachers WHERE id=$1',[other.teacher])).rowCount,1);
 await cleanupReleaseFixtures(ids); // Also safe when cleanup is retried.
});
