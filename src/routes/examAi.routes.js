'use strict';
const express=require('express'),multer=require('multer'),rateLimit=require('express-rate-limit');const {z}=require('zod');
const db=require('../config/db');const {teacher}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const {assertAssignedClass}=require('../services/permissions');const {audit}=require('../services/audit');
const {readStoredFile}=require('../services/storage');const {extractSource}=require('../services/examSource');
const {markingNotes}=require('../services/examDefinition');const ai=require('../services/examAi');
const router=express.Router();router.use(teacher);
const limit=rateLimit({windowMs:60000,limit:8,keyGenerator:req=>req.teacher.id,standardHeaders:'draft-7',legacyHeaders:false,
 message:{error:'Too many AI requests. Wait a minute and try again.'}});
// Generating a paper must not consume the separate allowance for marking it.
const draftLimit=rateLimit({windowMs:60000,limit:8,keyGenerator:req=>req.teacher.id,standardHeaders:'draft-7',legacyHeaders:false,
 message:{error:'The AI needs a short pause. Generation will continue automatically.'}});
const sourceLimit=rateLimit({windowMs:60000,limit:8,keyGenerator:req=>req.teacher.id,standardHeaders:'draft-7',legacyHeaders:false,
 message:{error:'Too many file requests. Wait a minute and try again.'}});
const statusLimit=rateLimit({windowMs:60000,limit:30,keyGenerator:req=>req.teacher.id,standardHeaders:'draft-7',legacyHeaders:false});
const uploader=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:1}});
router.get('/exam-ai/status',statusLimit,asyncWrap(async(req,res)=>res.json(await ai.status())));
router.post('/exam-ai/source',sourceLimit,uploader.single('file'),asyncWrap(async(req,res)=>{
 let file=req.file&&{buffer:req.file.buffer,name:req.file.originalname};
 if(!file){
  const {handoutId}=z.object({handoutId:z.string().uuid()}).strict().parse(req.body);
  const h=await db.query('SELECT file_key,class_name,section FROM handouts WHERE id=$1 AND uploaded_by=$2',[handoutId,req.teacher.id]);
  must(h.rowCount,404,'Handout not found.');await assertAssignedClass(req.teacher,h.rows[0].class_name,h.rows[0].section);
  file=await readStoredFile(h.rows[0].file_key);
 }
 res.json(await extractSource(file.buffer,file.name));
}));
router.post('/exam-ai/draft',draftLimit,asyncWrap(async(req,res)=>{
 const v=ai.draftRequest.parse(req.body);await assertAssignedClass(req.teacher,v.className);
 const result=await ai.draft(v);await audit({teacherId:req.teacher.id,action:'exam:ai-preview',details:{mode:v.mode,questionCount:result.questions.length}});
 res.json(result);
}));
router.post('/answers/:answerId/ai-suggestion',limit,asyncWrap(async(req,res)=>{
 z.object({}).strict().parse(req.body||{});
 const q=await db.query(`SELECT a.answer_text,a.code,a.submitted_at,q.type,q.title,q.description,q.marks,q.correct_answer,a.exam_id
  FROM answers a JOIN questions q ON q.id=a.question_id JOIN exams e ON e.id=a.exam_id
  WHERE a.id=$1 AND e.teacher_id=$2`,[req.params.answerId,req.teacher.id]);
 must(q.rowCount,404,'Answer not found.');const answer=q.rows[0],notes=markingNotes(answer);
 must(answer.submitted_at,409,'Wait until the student has submitted before requesting a marking suggestion.');
 must(['short','long','code'].includes(answer.type),400,'AI suggestions support written and practical answers. Mark file uploads manually.');
 must(notes.aiMarking&&notes.rubricApproved&&notes.rubric.trim(),409,'AI suggestions require an approved question rubric. Configure it before publishing the exam.');
 const text=String(answer.type==='code'?answer.code||'':answer.answer_text||'');must(text.trim(),400,'No answer was submitted. Mark it manually.');
 must(text.length<=10000,400,'This answer is too long for the local model. Mark it manually.');
 const prompt=String(answer.description||answer.title);
 must(prompt.length<=5000&&Number(answer.marks)<=100,400,'This question exceeds the local model limits. Mark it manually.');
 const result=await ai.suggest({type:answer.type,prompt,marks:Number(answer.marks),rubric:notes.rubric,modelAnswer:notes.modelAnswer},text);
 // Advisory response only. The normal, explicit teacher marks endpoint saves grades.
 await audit({teacherId:req.teacher.id,examId:answer.exam_id,action:'answer:ai-suggested',details:{answerId:req.params.answerId}});
 res.json(result);
}));
module.exports=router;
