'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const db=require('../src/config/db');const {deploymentWindow}=require('../src/services/deploymentWindow');
test('deployment gate blocks live exams, exams within 3 hours and unlinked calendar entries',async t=>{
 assert.equal(process.env.NODE_ENV,'test');t.after(()=>db.pool.end());
 const teacher=crypto.randomUUID();await db.query(`INSERT INTO teachers(id,name,email,password_hash) VALUES($1,'Synthetic deployment host',$2,'synthetic')`,[teacher,teacher+'@example.invalid']);
 assert.equal((await deploymentWindow()).deploymentAllowed,true);
 const exam=(await db.query(`INSERT INTO exams(title,class_name,section,teacher_id,exam_type,start_time,end_time,duration_minutes,status)
  VALUES('Window test','IX','A',$1,'quiz',now()+interval '4 hours',now()+interval '5 hours',60,'scheduled') RETURNING id`,[teacher])).rows[0];
 assert.equal((await deploymentWindow()).deploymentAllowed,true);
 await db.query("UPDATE exams SET start_time=now()+interval '2 hours' WHERE id=$1",[exam.id]);let r=await deploymentWindow();assert.equal(r.deploymentAllowed,false);assert.equal(r.activeOrSoon,1);assert.ok(Date.parse(r.recheckAfter)>Date.now());
 await db.query("UPDATE exams SET start_time=now()-interval '1 minute',status='active' WHERE id=$1",[exam.id]);assert.equal((await deploymentWindow()).deploymentAllowed,false);
 await db.query("UPDATE exams SET status='closed' WHERE id=$1",[exam.id]);assert.equal((await deploymentWindow()).deploymentAllowed,true);
 await db.query(`INSERT INTO exam_dates(title,class_name,section,date,created_by) VALUES('Unlinked calendar exam','IX','A',now()+interval '1 hour',$1)`,[teacher]);r=await deploymentWindow();assert.equal(r.deploymentAllowed,false);assert.equal(r.calendarExams,1);
 await db.query("UPDATE exam_dates SET date=now()-interval '7 hours'");assert.equal((await deploymentWindow()).deploymentAllowed,true);
 // Deployment-only synthetic fixtures do not hold the release gate closed.
 await db.query(`UPDATE exams SET status='active',settings='{"releaseSmoke":true}' WHERE id=$1`,[exam.id]);assert.equal((await deploymentWindow()).deploymentAllowed,true);
});
