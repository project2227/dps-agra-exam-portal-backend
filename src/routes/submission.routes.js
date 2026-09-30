'use strict';
const express=require('express');const {z}=require('zod');const db=require('../config/db');
const {teacher,ownExam}=require('../middleware/auth');const {asyncWrap,must,safeCsv}=require('../utils/http');
const {signedRead}=require('../services/storage');const {audit}=require('../services/audit');
const router=express.Router();router.use(teacher);
router.get('/exams/:examId/submissions',asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 const q=await db.query(`SELECT s.id,s.student_name,s.roll_number,s.class_name,s.section,s.status,
 s.joined_at,s.submitted_at,s.flags_count,s.cheating_score,
 count(a.id)::int AS answered_count,coalesce(sum(a.marks_awarded),0) AS awarded_marks
 FROM exam_sessions s LEFT JOIN answers a ON a.session_id=s.id WHERE s.exam_id=$1
 GROUP BY s.id ORDER BY s.roll_number LIMIT 2000`,[exam.id]);res.json({submissions:q.rows});
}));
router.get('/submissions/:sessionId',asyncWrap(async(req,res)=>{
 const sq=await db.query(`SELECT s.id,s.exam_id,s.student_name,s.roll_number,s.class_name,s.section,s.status,
 s.joined_at,s.submitted_at,s.flags_count,s.cheating_score FROM exam_sessions s
 JOIN exams e ON e.id=s.exam_id WHERE s.id=$1 AND e.teacher_id=$2`,[req.params.sessionId,req.teacher.id]);
 must(sq.rowCount,404,'Submission not found.');
 const answers=await db.query(`SELECT a.id,a.question_id,q.title,q.type,q.marks AS max_marks,a.answer_text,a.code,a.language,
 a.file_key,a.auto_saved_at,a.submitted_at,a.marks_awarded,a.teacher_remarks FROM answers a
 JOIN questions q ON q.id=a.question_id WHERE a.session_id=$1 ORDER BY q.sort_order`,[req.params.sessionId]);
 const list=await Promise.all(answers.rows.map(async ({file_key,...a})=>({...a,fileUrl:file_key?await signedRead(file_key):null})));
 res.json({session:sq.rows[0],answers:list});
}));
router.put('/answers/:answerId/marks',asyncWrap(async(req,res)=>{
 const {marksAwarded,teacherRemarks}=z.object({marksAwarded:z.number().min(0),teacherRemarks:z.string().max(4000).default('')}).parse(req.body);
 const q=await db.query(`UPDATE answers a SET marks_awarded=$1,teacher_remarks=$2 FROM questions q,exams e
 WHERE a.id=$3 AND q.id=a.question_id AND e.id=a.exam_id AND e.teacher_id=$4 AND $1<=q.marks
 RETURNING a.id,a.marks_awarded,a.teacher_remarks,a.exam_id`,[marksAwarded,teacherRemarks,req.params.answerId,req.teacher.id]);
 must(q.rowCount,400,'Answer not found or marks exceed maximum.');
 await audit({teacherId:req.teacher.id,examId:q.rows[0].exam_id,action:'answer:graded',details:{answerId:req.params.answerId}});
 res.json({answer:q.rows[0]});
}));
router.get('/exams/:examId/export.csv',asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 const q=await db.query(`SELECT s.roll_number,s.student_name,s.class_name,s.section,s.status,s.joined_at,s.submitted_at,
 s.flags_count,coalesce(sum(a.marks_awarded),0) AS total_marks
 FROM exam_sessions s LEFT JOIN answers a ON a.session_id=s.id WHERE s.exam_id=$1
 GROUP BY s.id ORDER BY s.roll_number LIMIT 5000`,[exam.id]);
 const fields=['Roll number','Name','Class','Section','Status','Joined','Submitted','Flags','Marks'];
 const csv=[fields.map(safeCsv).join(','),...q.rows.map(r=>[
 r.roll_number,r.student_name,r.class_name,r.section,r.status,r.joined_at?.toISOString(),r.submitted_at?.toISOString(),r.flags_count,r.total_marks].map(safeCsv).join(','))].join('\r\n');
 res.set('Content-Type','text/csv; charset=utf-8');res.set('Content-Disposition',`attachment; filename="exam-${exam.id}.csv"`);
 res.send('\ufeff'+csv);
}));
module.exports=router;
