'use strict';
const express=require('express');const rateLimit=require('express-rate-limit');const {z}=require('zod');const db=require('../config/db');
const {teacher,student,ownExam}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const {event,EVENT_SEVERITY}=require('../services/proctor');const {audit}=require('../services/audit');
const {publish,privateStudent}=require('../services/events');
const router=express.Router();
router.post('/proctor/event',student,rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-7',legacyHeaders:false,
 keyGenerator:req=>req.student.id}),asyncWrap(async(req,res)=>{
 const v=z.object({eventType:z.enum(Object.keys(EVENT_SEVERITY)),message:z.string().max(260).default(''),
  metadata:z.record(z.union([z.string(),z.boolean(),z.number()])).optional()}).parse(req.body);
 const saved=await event({examId:req.student.exam_id,sessionId:req.student.id,...v});
 res.status(201).json({eventId:saved.id,reviewRequired:true,
  notice:'This event is a review flag, not automatic proof of misconduct.'});
}));
router.get('/teacher/exams/:examId/proctor-events',teacher,asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 const limit=Math.max(1,Math.min(250,Number(req.query.limit)||100));
 const q=await db.query(`SELECT p.id,p.session_id,p.event_type,p.severity,p.message,p.metadata,p.created_at,
 s.student_name,s.roll_number FROM anti_cheat_events p JOIN exam_sessions s ON s.id=p.session_id
 WHERE p.exam_id=$1 ORDER BY p.created_at DESC LIMIT $2`,[exam.id,limit]);res.json({events:q.rows});
}));
router.get('/teacher/sessions/:sessionId/proctor-events',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT p.* FROM anti_cheat_events p JOIN exams e ON e.id=p.exam_id
 WHERE p.session_id=$1 AND e.teacher_id=$2 ORDER BY p.created_at DESC LIMIT 500`,[req.params.sessionId,req.teacher.id]);
 res.json({events:q.rows});
}));
router.get('/teacher/exams/:examId/monitor',teacher,asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 const q=await db.query(`SELECT id,student_name,roll_number,class_name,section,status,joined_at,submitted_at,
 flags_count,cheating_score,consent_webcam,consent_screen,consent_stills,consent_recording,kicked_at,kick_reason,browser,os,screen_size,timezone,active_socket_id IS NOT NULL AS connected,
 (SELECT COUNT(*)::integer FROM questions q WHERE q.exam_id=exam_sessions.exam_id) AS total_questions,
 (SELECT COUNT(*)::integer FROM answers a WHERE a.session_id=exam_sessions.id AND
   (NULLIF(BTRIM(COALESCE(a.answer_text,'')),'') IS NOT NULL OR
    NULLIF(BTRIM(COALESCE(a.code,'')),'') IS NOT NULL OR a.file_key IS NOT NULL)) AS answered
 FROM exam_sessions WHERE exam_id=$1 ORDER BY roll_number`,[exam.id]);
 res.json({exam:{id:exam.id,title:exam.title,status:exam.status,class_name:exam.class_name,section:exam.section,exam_type:exam.exam_type,start_time:exam.start_time,end_time:exam.end_time,duration_minutes:exam.duration_minutes},students:q.rows});
}));
router.post('/teacher/sessions/:sessionId/reset',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query(`UPDATE exam_sessions s SET status='revoked',token_hash=encode(gen_random_bytes(32),'hex'),
 active_socket_id=NULL,updated_at=now() FROM exams e
 WHERE s.id=$1 AND s.exam_id=e.id AND e.teacher_id=$2 AND s.status<>'submitted'
 RETURNING s.id,s.exam_id`,[req.params.sessionId,req.teacher.id]);
 must(q.rowCount,404,'Resettable session not found.');
 const s=q.rows[0];await audit({teacherId:req.teacher.id,examId:s.exam_id,action:'session:reset',details:{sessionId:s.id}});
 publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,status:'revoked'});
 privateStudent(s.id,'teacher:lockExam',{reason:'Teacher reset this session. Join again using your exam passcode.'});
 res.json({reset:true});
}));
router.post('/teacher/sessions/:sessionId/kick',teacher,asyncWrap(async(req,res)=>{
 const reason=z.object({reason:z.string().trim().min(3).max(260)}).parse(req.body).reason;
 const s=await db.transaction(async c=>{
  const q=await c.query(`UPDATE exam_sessions s SET status='revoked',kicked_at=now(),kick_reason=$1,
   token_hash=encode(gen_random_bytes(32),'hex'),active_socket_id=NULL,updated_at=now() FROM exams e
   WHERE s.id=$2 AND s.exam_id=e.id AND e.teacher_id=$3 AND s.status IN('joined','active','disconnected','flagged')
   RETURNING s.id,s.exam_id`,[reason,req.params.sessionId,req.teacher.id]);
  must(q.rowCount,409,'Active participant not found or already finished.');
  await c.query(`UPDATE incident_recordings SET ended_at=now(),finish_reason='teacher-removed-session' WHERE session_id=$1 AND ended_at IS NULL`,[q.rows[0].id]);
  return q.rows[0];
 });
 await audit({teacherId:req.teacher.id,examId:s.exam_id,action:'session:kicked',details:{sessionId:s.id,reason}});
 privateStudent(s.id,'teacher:lockExam',{reason,kicked:true});
 publish(s.exam_id,'exam:studentStatusUpdate',{sessionId:s.id,status:'revoked',kicked:true,kickReason:reason,connected:false});
 res.json({kicked:true});
}));
router.post('/teacher/sessions/:sessionId/readmit',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query(`UPDATE exam_sessions s SET kicked_at=NULL,kick_reason=NULL,updated_at=now() FROM exams e
  WHERE s.id=$1 AND s.exam_id=e.id AND e.teacher_id=$2 AND s.kicked_at IS NOT NULL RETURNING s.id,s.exam_id`,[req.params.sessionId,req.teacher.id]);
 must(q.rowCount,404,'Removed participant not found.');
 await audit({teacherId:req.teacher.id,examId:q.rows[0].exam_id,action:'session:readmitted',details:{sessionId:q.rows[0].id}});
 publish(q.rows[0].exam_id,'exam:studentStatusUpdate',{sessionId:q.rows[0].id,kicked:false,status:'revoked'});
 res.json({readmitted:true,notice:'The student can join again with the passcode. The old token remains revoked.'});
}));

module.exports=router;
