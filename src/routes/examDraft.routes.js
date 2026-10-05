'use strict';
const express=require('express');const {z}=require('zod');const db=require('../config/db');
const {teacher,ownExam}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const {assertAssignedClass}=require('../services/permissions');const {audit}=require('../services/audit');
const {draftShape,answerKey,editableExam,validateForPublish}=require('../services/examDefinition');
const router=express.Router();router.use(teacher);
const scrub=x=>{const {passcode_hash,passcode_ciphertext,...rest}=x;return rest;};
router.get('/exams/:examId/builder',asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 const questions=await db.query('SELECT * FROM questions WHERE exam_id=$1 ORDER BY sort_order,id',[exam.id]);
 res.json({exam:scrub(exam),questions:questions.rows});
}));
async function save(req,res){
 const v=draftShape.parse(req.body);await assertAssignedClass(req.teacher,v.exam.className,v.exam.section);
 const result=await db.transaction(async c=>{
  let current;
  if(req.params.examId){
   must(v.expectedUpdatedAt,400,'Reload the exam before saving its changes.');
   current=await editableExam(c,req.params.examId,req.teacher.id,{expectedUpdatedAt:v.expectedUpdatedAt});
   if(current.status==='scheduled'){
    must(v.exam.startTime.getTime()>Date.now(),400,'A scheduled exam must keep a future start time.');
    validateForPublish({title:v.exam.title,start_time:v.exam.startTime,end_time:v.exam.endTime,duration_minutes:v.exam.durationMinutes},
     v.questions.map(q=>({...q,correct_answer:answerKey(q)})));
   }
  }
  const e=v.exam,params=[e.title||'Untitled exam',e.subject,e.className,e.section,req.teacher.id,e.examType,e.startTime,e.endTime,e.durationMinutes,JSON.stringify(e.settings)];
  const updated=current?await c.query(`UPDATE exams SET title=$1,subject=$2,class_name=$3,section=$4,teacher_id=$5,exam_type=$6,
   start_time=$7,end_time=$8,duration_minutes=$9,settings=$10,updated_at=clock_timestamp() WHERE id=$11 RETURNING *`,[...params,current.id]):
   await c.query(`INSERT INTO exams(title,subject,class_name,section,teacher_id,exam_type,start_time,end_time,duration_minutes,settings)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,params);
  const exam=updated.rows[0];
  // No admitted students or answers can exist; the exam lock is shared with check-in.
  await c.query('DELETE FROM questions WHERE exam_id=$1',[exam.id]);const questions=[];
  for(const [i,q] of v.questions.entries()){
   const key=answerKey(q);
   const created=await c.query(`INSERT INTO questions(exam_id,type,title,description,options,correct_answer,marks,language,starter_code,visible_tests,hidden_tests,sort_order)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[exam.id,q.type,q.title,q.description,JSON.stringify(q.options),key==null?null:JSON.stringify(key),
    q.marks,q.language||null,q.starterCode,JSON.stringify(q.visibleTestCases),JSON.stringify(q.hiddenTestCases),i]);
   questions.push(created.rows[0]);
  }
  return {exam,questions,postponed:!!current&&new Date(exam.start_time)>new Date(current.start_time)};
 });
 await audit({teacherId:req.teacher.id,examId:result.exam.id,action:result.postponed?'exam:postponed':req.params.examId?'exam:edited':'exam:draft-created'});
 res.status(req.params.examId?200:201).json({...result,exam:scrub(result.exam)});
}
router.post('/exam-drafts',asyncWrap(save));router.put('/exam-drafts/:examId',asyncWrap(save));
router.post('/exams/:examId/postpone',asyncWrap(async(req,res)=>{
 const v=z.object({startTime:z.coerce.date(),endTime:z.coerce.date(),expectedUpdatedAt:z.string().datetime()}).strict().parse(req.body);
 must(v.startTime>Date.now()&&v.endTime>v.startTime,400,'Choose a future start and a later end time.');
 const exam=await db.transaction(async c=>{
  const e=await editableExam(c,req.params.examId,req.teacher.id,{expectedUpdatedAt:v.expectedUpdatedAt});
  must(v.startTime>new Date(e.start_time),400,'Postpone moves the exam to a later start time. Use Edit exam for other changes.');
  must((v.endTime-v.startTime)/60000>=e.duration_minutes,400,'The new window must allow the full exam duration.');
  return (await c.query('UPDATE exams SET start_time=$1,end_time=$2,updated_at=clock_timestamp() WHERE id=$3 RETURNING *',[v.startTime,v.endTime,e.id])).rows[0];
 });
 await audit({teacherId:req.teacher.id,examId:exam.id,action:'exam:postponed'});
 res.json({exam:scrub(exam)});
}));
module.exports=router;
