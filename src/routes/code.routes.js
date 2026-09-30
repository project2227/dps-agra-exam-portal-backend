'use strict';
const express=require('express');const rateLimit=require('express-rate-limit');const {z}=require('zod');
const db=require('../config/db');const {student,studentAllowed}=require('../middleware/auth');
const {asyncWrap,must}=require('../utils/http');const {LANGUAGES,runTests}=require('../services/codeRunner');
const router=express.Router();router.use(student);router.use(rateLimit({windowMs:60000,limit:6,standardHeaders:'draft-7',legacyHeaders:false,keyGenerator:req=>req.student.id}));
const schema=z.object({questionId:z.string().uuid(),code:z.string().min(1).max(20000),language:z.enum(Object.keys(LANGUAGES))});
async function getQuestion(req,v){
 studentAllowed(req.student);must(req.student.settings?.enableCodeRunner===true,403,'Code runner disabled for this exam.');
 const q=await db.query(`SELECT * FROM questions WHERE id=$1 AND exam_id=$2 AND type='code'`,[v.questionId,req.student.exam_id]);
 must(q.rowCount,404,'Coding question not found.');must(q.rows[0].language===v.language,400,'Language mismatch.');return q.rows[0];
}
router.post('/run',asyncWrap(async(req,res)=>{
 const v=schema.parse(req.body);const q=await getQuestion(req,v);
 const out=await runTests({code:v.code,language:v.language,tests:q.visible_tests});
 await db.query(`INSERT INTO code_runs(exam_id,session_id,question_id,language,code,status,test_results,stdout,stderr)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[req.student.exam_id,req.student.id,q.id,v.language,v.code,
 'sample',JSON.stringify(out.results),out.results.map(r=>r.stdout||'').join('\n').slice(0,3000),
 out.results.map(r=>r.stderr||'').join('\n').slice(0,3000)]);
 res.json({mode:'sample',...out});
}));
router.post('/submit',asyncWrap(async(req,res)=>{
 const v=schema.parse(req.body);const q=await getQuestion(req,v);
 const out=await runTests({code:v.code,language:v.language,tests:q.hidden_tests,hidden:true});
 // Code grading may award marks automatically only when hidden tests were configured.
 const marks=out.total?Math.round(Number(q.marks)*out.passed/out.total*100)/100:null;
 await db.transaction(async c=>{
  const sess=await c.query('SELECT status FROM exam_sessions WHERE id=$1 FOR UPDATE',[req.student.id]);
  must(['joined','active','disconnected','flagged'].includes(sess.rows[0]?.status),409,'Submission is locked.');
  studentAllowed(req.student);
  await c.query(`INSERT INTO answers(exam_id,session_id,question_id,code,language,marks_awarded)
   VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(session_id,question_id)
   DO UPDATE SET code=$4,language=$5,marks_awarded=$6,auto_saved_at=now()`,
  [req.student.exam_id,req.student.id,q.id,v.code,v.language,marks]);
  await c.query(`INSERT INTO code_runs(exam_id,session_id,question_id,language,code,status,test_results)
   VALUES($1,$2,$3,$4,$5,$6,$7)`,[req.student.exam_id,req.student.id,q.id,v.language,v.code,'hidden',JSON.stringify(out.results)]);
 });
 res.json({mode:'hidden',passed:out.passed,total:out.total,results:out.results,
  marksAwarded:marks,notice:'Hidden inputs and expected outputs are never returned.'});
}));
module.exports=router;
