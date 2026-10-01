'use strict';
const express=require('express');const {z}=require('zod');const db=require('../config/db');
const {teacher,admin}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const {canPurgeExam}=require('../services/examLifecycle');
const router=express.Router();router.use(teacher,admin);
const selection=z.object({examIds:z.array(z.string().uuid()).min(1).max(50)});
async function selected(c,ids,lock=false) {
 const q=await c.query('SELECT id,title,status,end_time FROM exams WHERE id=ANY($1::uuid[])'+(lock?' ORDER BY id FOR UPDATE':''),[ids]);
 must(q.rowCount===ids.length,409,'An exam changed or was already deleted. Refresh the list.');
 must(q.rows.every(e=>canPurgeExam(e)),409,'Only drafts, closed tests and tests whose time window has ended can be permanently deleted.');
 return q.rows;
}
async function counts(c,ids) {
 const result={exams:ids.length};
 for(const [name,table] of Object.entries({sessions:'exam_sessions',answers:'answers',flags:'anti_cheat_events',codeRuns:'code_runs',recordings:'incident_recordings'}))
  result[name]=(await c.query(`SELECT count(*)::int AS n FROM ${table} WHERE exam_id=ANY($1::uuid[])`,[ids])).rows[0].n;
 return result;
}
router.get('/tests',asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT e.id,e.title,e.class_name,e.section,e.status,e.start_time,e.end_time,e.archived_at,
 t.name AS teacher_name,(SELECT count(*)::int FROM exam_sessions s WHERE s.exam_id=e.id) AS sessions,
 (e.status IN('draft','closed') OR e.end_time<now()) AS deletable
 FROM exams e JOIN teachers t ON t.id=e.teacher_id ORDER BY e.created_at DESC LIMIT 500`);
 res.set('Cache-Control','private, no-store');res.json({tests:q.rows});
}));
router.post('/preview',asyncWrap(async(req,res)=>{
 const ids=[...new Set(selection.parse(req.body).examIds)];await selected(db,ids);
 res.json({counts:await counts(db,ids),confirmation:`DELETE ${ids.length} TESTS`});
}));
router.delete('/tests',asyncWrap(async(req,res)=>{
 const v=selection.extend({confirmation:z.string().max(100)}).parse(req.body);
 const ids=[...new Set(v.examIds)];must(v.confirmation===`DELETE ${ids.length} TESTS`,400,'Type the displayed confirmation exactly.');
 const result=await db.transaction(async c=>{
  await selected(c,ids,true);
  // Lock sessions as well: a save/submit in flight cannot recreate deleted work.
  await c.query('SELECT id FROM exam_sessions WHERE exam_id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[ids]);
  const total=await counts(c,ids);
  const files=await c.query('SELECT DISTINCT file_key FROM answers WHERE exam_id=ANY($1::uuid[]) AND file_key IS NOT NULL',[ids]);
  for(const table of ['incident_recordings','anti_cheat_events','code_runs','answers','audit_logs','exam_sessions','questions'])
   await c.query(`DELETE FROM ${table} WHERE exam_id=ANY($1::uuid[])`,[ids]);
  await c.query('DELETE FROM exams WHERE id=ANY($1::uuid[])',[ids]);
  // Database uploads are removed with the answers; unrelated handouts stay intact.
  const keys=files.rows.map(x=>x.file_key).filter(k=>k.startsWith('student-answers/'));
  if(keys.length)await c.query(`DELETE FROM stored_files WHERE storage_key=ANY($1::text[])
   AND NOT EXISTS(SELECT 1 FROM answers WHERE file_key=storage_key)
   AND NOT EXISTS(SELECT 1 FROM handouts WHERE file_key=storage_key)`,[keys]);
  await c.query(`INSERT INTO audit_logs(teacher_id,action,details) VALUES($1,'admin:old_test_data_deleted',$2)`,
   [req.teacher.id,JSON.stringify(total)]);
  return total;
 });
 res.json({deleted:true,counts:result,notice:'Permanently deleted. These tests are absent from current and recently removed lists.'});
}));
module.exports=router;
