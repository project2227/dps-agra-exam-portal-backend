'use strict';
const express=require('express');const bcrypt=require('bcryptjs');const crypto=require('crypto');const {z}=require('zod');
const rateLimit=require('express-rate-limit');const db=require('../config/db');
const {studentToken,hash,student,studentAllowed,examOpen}=require('../middleware/auth');
const {asyncWrap,must,HttpError}=require('../utils/http');const {env}=require('../config/env');
const {publish}=require('../services/events');const {event}=require('../services/proctor');
const router=express.Router();
// Many pupils can share a school NAT. Combine a generous network cap with per-exam-roll throttling.
const joinNetworkLimit=rateLimit({windowMs:15*60*1000,limit:300,standardHeaders:'draft-7',legacyHeaders:false});
const joinIdentifierLimit=rateLimit({windowMs:15*60*1000,limit:8,standardHeaders:'draft-7',legacyHeaders:false,
 keyGenerator:req=>crypto.createHash('sha256').update(String(req.params.examId)+'|'+String(req.body?.rollNumber||'').trim().toLowerCase()+'|'+req.ip).digest('hex')});
const cleanQ=q=>({id:q.id,type:q.type,title:q.title,description:q.description,options:q.options,
 marks:q.marks,language:q.language,starterCode:q.starter_code,visibleTestCases:q.visible_tests,order:q.sort_order});
router.get('/exams/active',asyncWrap(async(req,res)=>{
 const filters=z.object({className:z.string().max(40).optional(),section:z.string().max(12).optional()}).parse(req.query);
 const q=await db.query(`SELECT id,title,subject,class_name,section,exam_type,start_time,end_time,duration_minutes,
 'active'::text AS status,
 settings->>'requireWebcam' AS webcam_required,settings->>'requireScreenShare' AS screen_required
 FROM exams WHERE status IN('active','scheduled') AND now() BETWEEN start_time AND end_time
 AND ($1::text IS NULL OR lower(class_name)=lower($1))
 AND ($2::text IS NULL OR lower(section)='all' OR lower(section)=lower($2)) ORDER BY end_time LIMIT 100`,
 [filters.className||null,filters.section||null]);res.json({exams:q.rows});
}));
const joinShape=z.object({name:z.string().trim().min(2).max(120),rollNumber:z.string().trim().min(1).max(32),
 className:z.string().trim().min(1).max(40),section:z.string().trim().min(1).max(12),
 passcode:z.string().min(1).max(64),browserMetadata:z.object({userAgent:z.string().max(220).optional(),
 browser:z.string().max(90).optional(),os:z.string().max(90).optional(),screenSize:z.string().max(30).optional(),
 timezone:z.string().max(80).optional(),fingerprint:z.string().max(256).optional()}).default({}),
 consent:z.object({webcam:z.boolean().default(false),screenShare:z.boolean().default(false)}).default({})});
router.post('/exams/:examId/join',joinNetworkLimit,joinIdentifierLimit,asyncWrap(async(req,res)=>{
 const v=joinShape.parse(req.body);const eq=await db.query('SELECT * FROM exams WHERE id=$1',[req.params.examId]);
 const e=eq.rows[0];must(e&&examOpen(e),403,'This exam is not currently available.');
 must(v.className.toLowerCase()===e.class_name.toLowerCase() &&
  (e.section.toLowerCase()==='all'||v.section.toLowerCase()===e.section.toLowerCase()),403,'Exam is not available to this class and section.');
 if(e.settings?.allowLateJoin===false)must(Date.now()<=new Date(e.start_time).getTime()+10*60000,403,'Late joining is closed.');
 must(e.passcode_hash&&await bcrypt.compare(v.passcode,e.passcode_hash),403,'Invalid exam passcode.');
 must(!e.settings?.requireWebcam||v.consent.webcam,403,'Webcam consent is required to join this exam.');
 must(!e.settings?.requireScreenShare||v.consent.screenShare,403,'Screen-sharing consent is required to join this exam.');
 const fingerprintHash=v.browserMetadata.fingerprint?crypto.createHmac('sha256',env.FINGERPRINT_PEPPER)
  .update(v.browserMetadata.fingerprint).digest('hex'):null;
 const result=await db.transaction(async c=>{
  const dup=await c.query(`SELECT id,status,fingerprint_hash FROM exam_sessions
   WHERE exam_id=$1 AND lower(roll_number)=lower($2) AND lower(class_name)=lower($3)
   AND lower(section)=lower($4) AND status IN ('joined','active','disconnected','flagged') FOR UPDATE`,
   [e.id,v.rollNumber,v.className,v.section]);
  if(dup.rowCount)return {duplicate:dup.rows[0]};
  // Pre-generate an ID to bind the signed session token to the stored session.
  const id=crypto.randomUUID();const remaining=Math.floor((new Date(e.end_time).getTime()-Date.now())/1000)+60;
  must(remaining>120,403,'The exam has ended.');
  const token=studentToken({id,exam_id:e.id},remaining);
  const s=await c.query(`INSERT INTO exam_sessions(id,exam_id,student_name,roll_number,class_name,section,token_hash,
   fingerprint_hash,user_agent,browser,os,screen_size,timezone,ip_address,consent_webcam,consent_screen,status)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active') RETURNING id,joined_at,status`,
   [id,e.id,v.name,v.rollNumber,v.className,v.section,hash(token),fingerprintHash,
   v.browserMetadata.userAgent||null,v.browserMetadata.browser||null,v.browserMetadata.os||null,
   v.browserMetadata.screenSize||null,v.browserMetadata.timezone||null,
   env.STORE_IP==='true'?req.ip:null,v.consent.webcam,v.consent.screenShare]);
  return {session:s.rows[0],token};
 });
 if(result.duplicate){
  // No auto-fail and no arbitrary student lock. Teacher must explicitly revoke the old session to reissue access.
  await event({examId:e.id,sessionId:result.duplicate.id,eventType:'MULTIPLE_SESSION_ATTEMPT'});
  if(fingerprintHash&&result.duplicate.fingerprint_hash && fingerprintHash!==result.duplicate.fingerprint_hash)
   await event({examId:e.id,sessionId:result.duplicate.id,eventType:'BROWSER_CHANGED'});
  throw new HttpError(409,'An active session already exists for this roll number. Reconnect using its token or ask the teacher to reset it.');
 }
 publish(e.id,'exam:studentJoined',{sessionId:result.session.id,studentName:v.name,rollNumber:v.rollNumber,joinedAt:result.session.joined_at});
 res.status(201).json({token:result.token,session:result.session,exam:{id:e.id,title:e.title,endTime:e.end_time,
  durationMinutes:e.duration_minutes,settings:e.settings},monitoring:{webcam:v.consent.webcam,screen:v.consent.screenShare}});
}));
router.get('/student/session',student,(req,res)=>{
 const {token_hash,fingerprint_hash,ip_address,active_socket_id,...s}=req.student;res.json({session:s});
});
router.get('/student/exams/:examId/questions',student,asyncWrap(async(req,res)=>{
 must(req.student.exam_id===req.params.examId,403,'Invalid exam session.');studentAllowed(req.student);
 const q=await db.query('SELECT * FROM questions WHERE exam_id=$1 ORDER BY sort_order,id',[req.student.exam_id]);
 res.json({questions:q.rows.map(cleanQ),serverTime:new Date().toISOString(),endTime:req.student.end_time});
}));
// Let a student restore only their own autosaved answers after a browser refresh.
// Session JWT middleware binds the request to an exact exam and session.
router.get('/student/exams/:examId/answers',student,asyncWrap(async(req,res)=>{
 must(req.student.exam_id===req.params.examId,403,'Invalid exam session.');
 studentAllowed(req.student);
 const q=await db.query('SELECT question_id,answer_text,code,language,auto_saved_at FROM answers WHERE session_id=$1 AND exam_id=$2',
   [req.student.id,req.student.exam_id]);
 res.json({answers:q.rows});
}));
const answerShape=z.object({questionId:z.string().uuid(),answerText:z.string().max(50000).nullable().optional(),
 code:z.string().max(20000).nullable().optional(),language:z.string().max(30).nullable().optional()});
router.post('/student/exams/:examId/answers/save',student,asyncWrap(async(req,res)=>{
 must(req.student.exam_id===req.params.examId,403,'Invalid exam session.');studentAllowed(req.student);
 const v=answerShape.parse(req.body);
 const q=await db.query('SELECT id,type,language FROM questions WHERE id=$1 AND exam_id=$2',[v.questionId,req.student.exam_id]);
 must(q.rowCount,404,'Question not part of this exam.');
 if(q.rows[0].type==='code')must(v.language===q.rows[0].language,400,'Language does not match this question.');
 const answer=await db.transaction(async c=>{
  const lock=await c.query('SELECT status FROM exam_sessions WHERE id=$1 FOR UPDATE',[req.student.id]);
  must(['joined','active','disconnected','flagged'].includes(lock.rows[0]?.status),409,'Submission is locked.');
  return c.query(`INSERT INTO answers(exam_id,session_id,question_id,answer_text,code,language)
 VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(session_id,question_id)
 DO UPDATE SET answer_text=$4,code=$5,language=$6,auto_saved_at=now()
 RETURNING id,auto_saved_at`,
 [req.student.exam_id,req.student.id,v.questionId,v.answerText??null,v.code??null,v.language??null]);
 });
 publish(req.student.exam_id,'exam:answerLiveUpdate',{sessionId:req.student.id,questionId:v.questionId,
  at:answer.rows[0].auto_saved_at,hasAnswer:Boolean(v.answerText||v.code)});
 if(v.code)publish(req.student.exam_id,'exam:codeLiveUpdate',{sessionId:req.student.id,questionId:v.questionId,at:new Date().toISOString()});
 res.json({saved:true,autoSavedAt:answer.rows[0].auto_saved_at});
}));
router.post('/student/exams/:examId/submit',student,asyncWrap(async(req,res)=>{
 must(req.student.exam_id===req.params.examId,403,'Invalid exam session.');
 must(Date.now()<=new Date(req.student.end_time).getTime()+60000,403,'Submission deadline has passed. Contact your teacher.');
 const result=await db.transaction(async c=>{
  const lock=await c.query('SELECT status,joined_at,exam_id FROM exam_sessions WHERE id=$1 FOR UPDATE',[req.student.id]);
  must(['joined','active','disconnected','flagged'].includes(lock.rows[0]?.status),409,'Session already submitted or revoked.');
  // Duration enforcement uses exam duration, not client elapsed time.
  const dur=await c.query('SELECT duration_minutes FROM exams WHERE id=$1',[req.student.exam_id]);
  const due=Math.min(new Date(req.student.end_time).getTime(),new Date(lock.rows[0].joined_at).getTime()+dur.rows[0].duration_minutes*60000)+60000;
  must(Date.now()<=due,403,'Your exam duration has ended.');
  await c.query(`UPDATE answers a SET marks_awarded=CASE
   WHEN q.type='mcq' AND q.correct_answer IS NOT NULL AND to_jsonb(trim(a.answer_text))=q.correct_answer THEN q.marks
   WHEN q.type='mcq' THEN 0 ELSE a.marks_awarded END,
   submitted_at=now() FROM questions q WHERE a.question_id=q.id AND a.session_id=$1`,[req.student.id]);
  await c.query(`UPDATE exam_sessions SET status='submitted',submitted_at=now(),active_socket_id=NULL,updated_at=now() WHERE id=$1`,[req.student.id]);
  return {submitted:true,sessionId:req.student.id};
 });
 publish(req.student.exam_id,'exam:studentStatusUpdate',{sessionId:req.student.id,status:'submitted'});
 res.json(result);
}));
module.exports=router;
