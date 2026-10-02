'use strict';
const express=require('express');const bcrypt=require('bcryptjs');const crypto=require('crypto');const {z}=require('zod');
const rateLimit=require('express-rate-limit');const db=require('../config/db');
const {studentToken,hash,student,studentAllowed}=require('../middleware/auth');
const {asyncWrap,must,HttpError}=require('../utils/http');const {env}=require('../config/env');
const {normalizeExamPasscode}=require('../utils/examPasscode');
const {publish}=require('../services/events');const {event}=require('../services/proctor');
const {canJoinExam,sessionStart}=require('../services/examLifecycle');
const router=express.Router();
const {accountOptional,checkCsrf}=require('../services/accountSessions');
// Many pupils can share a school NAT. Combine a generous network cap with per-exam-roll throttling.
const joinNetworkLimit=rateLimit({windowMs:15*60*1000,limit:300,standardHeaders:'draft-7',legacyHeaders:false});
const joinIdentifierLimit=rateLimit({windowMs:15*60*1000,limit:8,standardHeaders:'draft-7',legacyHeaders:false,
 keyGenerator:req=>crypto.createHash('sha256').update(String(req.params.examId)+'|'+String(req.body?.rollNumber||'').trim().toLowerCase()+'|'+req.ip).digest('hex')});
const cleanQ=q=>({id:q.id,type:q.type,title:q.title,description:q.description,options:q.options,
 marks:q.marks,language:q.language,starterCode:q.starter_code,visibleTestCases:q.visible_tests,order:q.sort_order});
router.get('/exams/active',accountOptional,asyncWrap(async(req,res)=>{
 const filters=z.object({className:z.string().max(40).optional(),section:z.string().max(12).optional()}).parse(req.query);
 if(req.accountSession?.student_id){const s=await db.query('SELECT class_name,section FROM students WHERE id=$1',[req.accountSession.student_id]);filters.className=s.rows[0].class_name;filters.section=s.rows[0].section;res.set('Cache-Control','no-store');}
 const q=await db.query(`SELECT id,title,subject,class_name,section,exam_type,start_time,end_time,duration_minutes,
 CASE WHEN now()<start_time THEN 'scheduled' ELSE 'active' END AS status,
 settings->>'requireWebcam' AS webcam_required,settings->>'requireScreenShare' AS screen_required
 FROM exams WHERE archived_at IS NULL AND status IN('active','scheduled') AND now() BETWEEN start_time-interval '30 minutes' AND end_time AND (settings->>'releaseSmoke') IS DISTINCT FROM 'true'
 AND ($1::text IS NULL OR lower(class_name)=lower($1))
 AND ($2::text IS NULL OR lower(section)='all' OR lower(section)=lower($2)) ORDER BY end_time LIMIT 100`,
 [filters.className||null,filters.section||null]);res.json({exams:q.rows});
}));
const joinShape=z.object({name:z.string().trim().min(2).max(120),rollNumber:z.string().trim().min(1).max(32),
 className:z.string().trim().min(1).max(40),section:z.string().trim().min(1).max(12),
 passcode:z.string().min(1).max(64),browserMetadata:z.object({userAgent:z.string().max(220).optional(),
 browser:z.string().max(90).optional(),os:z.string().max(90).optional(),screenSize:z.string().max(30).optional(),
 timezone:z.string().max(80).optional(),fingerprint:z.string().max(256).optional()}).default({}),
 consent:z.object({webcam:z.boolean().default(false),screenShare:z.boolean().default(false),stills:z.boolean().default(false),recording:z.boolean().default(false)}).default({})});
router.post('/exams/:examId/join',joinNetworkLimit,joinIdentifierLimit,accountOptional,asyncWrap(async(req,res)=>{
 let studentAccount=null;
 if(req.accountSession?.student_id){checkCsrf(req,req.accountSession);const s=await db.query('SELECT * FROM students WHERE id=$1 AND active=true',[req.accountSession.student_id]);studentAccount=s.rows[0];must(studentAccount&&!studentAccount.must_change_password,403,'Set your new password before joining an exam.');}
 const v=joinShape.parse(studentAccount?{...req.body,name:studentAccount.name,rollNumber:studentAccount.roll_number,className:studentAccount.class_name,section:studentAccount.section}:req.body);const eq=await db.query('SELECT * FROM exams WHERE id=$1',[req.params.examId]);
 const e=eq.rows[0];must(e&&canJoinExam(e),403,'This exam is not available. Check-in opens 30 minutes before the scheduled start.');
 must(studentAccount||e.settings?.allowGuestJoin!==false,403,'Sign in with your student account to join this exam.');
 must(v.className.toLowerCase()===e.class_name.toLowerCase() &&
  (e.section.toLowerCase()==='all'||v.section.toLowerCase()===e.section.toLowerCase()),403,'Exam is not available to this class and section.');
 if(e.settings?.allowLateJoin===false)must(Date.now()<=new Date(e.start_time).getTime()+10*60000,403,'Late joining is closed.');
 // Never rely on CSS text-transform: copied codes may differ in case or hyphens.
 const canonicalCode=normalizeExamPasscode(v.passcode);
 must(e.passcode_hash&&/^[A-Z0-9!@#_]{8,64}$/.test(canonicalCode)&&
  await bcrypt.compare(canonicalCode,e.passcode_hash),403,
  'Invalid password for the selected exam. Confirm the exam title and use its latest passcode.');
 must(!e.settings?.requireWebcam||v.consent.webcam,403,'Webcam consent is required to join this exam.');
 must(!e.settings?.requireScreenShare||v.consent.screenShare,403,'Screen-sharing consent is required to join this exam.');
 const fingerprintHash=v.browserMetadata.fingerprint?crypto.createHmac('sha256',env.FINGERPRINT_PEPPER)
  .update(v.browserMetadata.fingerprint).digest('hex'):null;
 const result=await db.transaction(async c=>{
  const kicked=await c.query(`SELECT id FROM exam_sessions WHERE exam_id=$1 AND lower(roll_number)=lower($2)
   AND lower(class_name)=lower($3) AND lower(section)=lower($4) AND kicked_at IS NOT NULL FOR UPDATE`,
   [e.id,v.rollNumber,v.className,v.section]);
  must(!kicked.rowCount,403,'Your teacher removed you from this exam. Ask them to allow rejoining before trying again.');
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
   fingerprint_hash,user_agent,browser,os,screen_size,timezone,ip_address,consent_webcam,consent_screen,consent_stills,consent_recording,status,student_id)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id,joined_at,status`,
   [id,e.id,v.name,v.rollNumber,v.className,v.section,hash(token),fingerprintHash,
   v.browserMetadata.userAgent||null,v.browserMetadata.browser||null,v.browserMetadata.os||null,
   v.browserMetadata.screenSize||null,v.browserMetadata.timezone||null,
   env.STORE_IP==='true'?req.ip:null,v.consent.webcam,v.consent.screenShare,
   v.consent.stills===true&&(v.consent.webcam||v.consent.screenShare),v.consent.recording===true&&v.consent.screenShare,
   Date.now()<new Date(e.start_time).getTime()?'joined':'active',studentAccount?.id||null]);
  return {session:s.rows[0],token};
 });
 if(result.duplicate){
  // No auto-fail and no arbitrary student lock. Teacher must explicitly revoke the old session to reissue access.
  await event({examId:e.id,sessionId:result.duplicate.id,eventType:'MULTIPLE_SESSION_ATTEMPT'});
  if(fingerprintHash&&result.duplicate.fingerprint_hash && fingerprintHash!==result.duplicate.fingerprint_hash)
   await event({examId:e.id,sessionId:result.duplicate.id,eventType:'BROWSER_CHANGED'});
  throw new HttpError(409,'An active session already exists for this roll number. Reconnect using its token or ask the teacher to reset it.');
 }
 publish(e.id,'exam:studentJoined',{
  sessionId:result.session.id,studentName:v.name,rollNumber:v.rollNumber,status:result.session.status,
  className:v.className,section:v.section,consentWebcam:v.consent.webcam,
  consentScreen:v.consent.screenShare,consentStills:v.consent.stills===true,consentRecording:v.consent.recording===true&&v.consent.screenShare,joinedAt:result.session.joined_at,
  device:{browser:v.browserMetadata.browser||null,os:v.browserMetadata.os||null,
    screen:v.browserMetadata.screenSize||null,timezone:v.browserMetadata.timezone||null}
 });
 res.status(201).json({token:result.token,session:result.session,exam:{id:e.id,title:e.title,startTime:e.start_time,endTime:e.end_time,
  status:e.status,durationMinutes:e.duration_minutes,settings:e.settings},serverTime:new Date().toISOString(),
  monitoring:{webcam:v.consent.webcam,screen:v.consent.screenShare,recording:v.consent.recording===true&&v.consent.screenShare}});
}));
// The student can voluntarily grant optional screen sharing during an exam.
// A separate browser getDisplayMedia prompt must also be accepted to capture.
router.post('/student/media-consent',student,asyncWrap(async(req,res)=>{
 studentAllowed(req.student);
 const body=z.object({screenShare:z.boolean()}).strict().parse(req.body);
 const q=await db.query(`UPDATE exam_sessions SET consent_screen=$1,updated_at=now()
   WHERE id=$2 AND status IN('joined','active','disconnected','flagged')
   RETURNING id,consent_screen`,[body.screenShare,req.student.id]);
 must(q.rowCount,409,'This session can no longer change sharing preferences.');
 publish(req.student.exam_id,'exam:studentStatusUpdate',{
  sessionId:req.student.id,screen:body.screenShare,
  ...(body.screenShare?{}:{screenActive:false})
 });
 res.json({screenShare:q.rows[0].consent_screen});
}));
router.get('/student/session',student,(req,res)=>{
 const {token_hash,fingerprint_hash,ip_address,active_socket_id,...s}=req.student;res.json({session:s});
});
// Lobby metadata deliberately contains no questions, answers, passcodes or private tests.
router.get('/student/exams/:examId/entry',student,asyncWrap(async(req,res)=>{
 must(req.student.exam_id===req.params.examId,403,'Invalid exam session.');
 const s=req.student;
 must(['active','scheduled'].includes(s.exam_status)&&Date.now()<Date.parse(s.end_time),403,'This exam has ended or was closed.');
 res.json({waiting:Date.now()<Date.parse(s.start_time),serverTime:new Date().toISOString(),
  startedAt:new Date(sessionStart(s)).toISOString(),exam:{id:s.exam_id,title:s.exam_title,startTime:s.start_time,
   endTime:s.end_time,durationMinutes:s.duration_minutes,className:s.class_name,section:s.section,status:Date.now()<Date.parse(s.start_time)?'scheduled':'active',settings:s.settings},
  recordingConsent:s.consent_recording});
}));
router.get('/student/exams/:examId/questions',student,asyncWrap(async(req,res)=>{
 must(req.student.exam_id===req.params.examId,403,'Invalid exam session.');studentAllowed(req.student);
 await db.query(`UPDATE exam_sessions SET started_at=coalesce(started_at,$1),
  status=CASE WHEN status='joined' THEN 'active' ELSE status END WHERE id=$2`,
  [new Date(sessionStart(req.student)),req.student.id]);
 const q=await db.query('SELECT * FROM questions WHERE exam_id=$1 ORDER BY sort_order,id',[req.student.exam_id]);
 res.json({questions:q.rows.map(cleanQ),serverTime:new Date().toISOString(),endTime:req.student.end_time,startedAt:new Date(sessionStart(req.student)).toISOString()});
}));
router.get('/student/exams/:examId/answers',student,asyncWrap(async(req,res)=>{
 must(req.student.exam_id===req.params.examId,403,'Invalid exam session.');
 studentAllowed(req.student);
 const q=await db.query('SELECT question_id,answer_text,code,language,auto_saved_at FROM answers WHERE session_id=$1 AND exam_id=$2',[req.student.id,req.student.exam_id]);
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
 const finalAnswers=z.object({finalAnswers:z.array(answerShape).max(200).default([])}).parse(req.body).finalAnswers;
 must(new Set(finalAnswers.map(a=>a.questionId)).size===finalAnswers.length,400,'Duplicate final answer.');
 must(Date.now()<=new Date(req.student.end_time).getTime()+60000,403,'Submission deadline has passed. Contact your teacher.');
 const result=await db.transaction(async c=>{
  const lock=await c.query('SELECT status,joined_at,exam_id FROM exam_sessions WHERE id=$1 FOR UPDATE',[req.student.id]);
  must(['joined','active','disconnected','flagged'].includes(lock.rows[0]?.status),409,'Session already submitted or revoked.');
  // Duration enforcement uses exam duration, not client elapsed time.
  const dur=await c.query('SELECT duration_minutes FROM exams WHERE id=$1',[req.student.exam_id]);
 must(Date.now()>=Date.parse(req.student.start_time),403,'The exam has not started.');
 const due=Math.min(new Date(req.student.end_time).getTime(),sessionStart(req.student)+dur.rows[0].duration_minutes*60000)+60000;
  must(Date.now()<=due,403,'Your exam duration has ended.');
  if(finalAnswers.length){
   const questions=await c.query('SELECT id,type,language FROM questions WHERE exam_id=$1 AND id=ANY($2::uuid[])',[req.student.exam_id,finalAnswers.map(a=>a.questionId)]);
   must(questions.rowCount===finalAnswers.length,400,'A final answer does not belong to this exam.');
   for(const v of finalAnswers){
    const q=questions.rows.find(q=>q.id===v.questionId);
    if(q.type==='code')must(v.language===q.language,400,'Language does not match this question.');
    must(q.type!=='file',400,'File answers must use the file upload endpoint.');
    await c.query(`INSERT INTO answers(exam_id,session_id,question_id,answer_text,code,language)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(session_id,question_id)
     DO UPDATE SET answer_text=$4,code=$5,language=$6,auto_saved_at=now()`,
     [req.student.exam_id,req.student.id,v.questionId,v.answerText??null,v.code??null,v.language??null]);
   }
  }
  await c.query(`UPDATE answers a SET marks_awarded=CASE
   WHEN q.type='mcq' AND q.correct_answer IS NOT NULL AND to_jsonb(trim(a.answer_text))=q.correct_answer THEN q.marks
   WHEN q.type='mcq' THEN 0 ELSE a.marks_awarded END,
   submitted_at=now() FROM questions q WHERE a.question_id=q.id AND a.session_id=$1`,[req.student.id]);
  await c.query(`UPDATE exam_sessions SET status='submitted',submitted_at=now(),active_socket_id=NULL,updated_at=now() WHERE id=$1`,[req.student.id]);
  await c.query(`UPDATE incident_recordings SET ended_at=now(),finish_reason='exam-submitted' WHERE session_id=$1 AND ended_at IS NULL`,[req.student.id]);
  return {submitted:true,sessionId:req.student.id};
 });
 publish(req.student.exam_id,'exam:studentStatusUpdate',{sessionId:req.student.id,status:'submitted'});
 res.json(result);
}));
module.exports=router;
