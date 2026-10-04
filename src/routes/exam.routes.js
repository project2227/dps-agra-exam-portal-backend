'use strict';
const express=require('express');const crypto=require('crypto');const bcrypt=require('bcryptjs');const {z}=require('zod');
const db=require('../config/db');const {teacher,ownExam}=require('../middleware/auth');
const {asyncWrap,must}=require('../utils/http');const {normalizeExamPasscode,isValidExamPasscode}=require('../utils/examPasscode');
const {audit}=require('../services/audit');
const {getIo,publish}=require('../services/events');
const {env}=require('../config/env');
const {encryptPasscode,decryptPasscode}=require('../services/passcodeVault');const {assertAssignedClass}=require('../services/permissions');
const router=express.Router();router.use(teacher);
const settingsSchema=z.object({visionTracking:z.boolean().default(false),requireWebcam:z.boolean().default(false),requireScreenShare:z.boolean().default(false),
 enableTabSwitchDetection:z.boolean().default(true),enableCopyPasteDetection:z.boolean().default(true),
 enableFullscreenMode:z.boolean().default(false),enableCodeRunner:z.boolean().default(false),
 allowLateJoin:z.boolean().default(true),monitorAnswerText:z.boolean().default(false),allowGuestJoin:z.boolean().default(true)}).strict();
const examShape=z.object({title:z.string().trim().min(3).max(180),subject:z.string().max(90).default('Computers'),
 className:z.string().trim().min(1).max(40),section:z.string().max(12).default('All'),
 examType:z.enum(['quiz','practical','mixed']),startTime:z.coerce.date(),endTime:z.coerce.date(),
 durationMinutes:z.number().int().min(1).max(360),settings:settingsSchema.default({})}).refine(x=>x.endTime>x.startTime,{message:'End time must be after start time.'});
const scrub=x=>{const {passcode_hash,passcode_ciphertext,...safe}=x;return safe;};
router.post('/exams',asyncWrap(async(req,res)=>{
 const v=examShape.parse(req.body);
 await assertAssignedClass(req.teacher,v.className,v.section);
 const q=await db.query(`INSERT INTO exams(title,subject,class_name,section,teacher_id,exam_type,start_time,end_time,duration_minutes,settings)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
 [v.title,v.subject,v.className,v.section,req.teacher.id,v.examType,v.startTime,v.endTime,v.durationMinutes,JSON.stringify(v.settings)]);
 await audit({teacherId:req.teacher.id,examId:q.rows[0].id,action:'exam:create'});
 res.status(201).json({exam:scrub(q.rows[0])});
}));
router.get('/exams',asyncWrap(async(req,res)=>{
 const archived=req.query.archived==='true';
 const q=await db.query(
 'SELECT * FROM exams WHERE teacher_id=$1 AND (archived_at IS NOT NULL)=$2 ORDER BY created_at DESC LIMIT 200',
 [req.teacher.id,archived]);
 res.json({exams:q.rows.map(scrub)});
}));
router.get('/exams/:examId',asyncWrap(async(req,res)=>res.json({exam:scrub(await ownExam(req.params.examId,req.teacher.id))})));
router.post('/exams/:examId/guest-join',asyncWrap(async(req,res)=>{const e=await ownExam(req.params.examId,req.teacher.id);const d=z.object({allow:z.boolean()}).parse(req.body);await db.query(`UPDATE exams SET settings=jsonb_set(settings,'{allowGuestJoin}',$2::jsonb),updated_at=now() WHERE id=$1`,[e.id,JSON.stringify(d.allow)]);res.json({allowGuestJoin:d.allow});}));
router.post('/exams/:examId/release-results',asyncWrap(async(req,res)=>{const e=await ownExam(req.params.examId,req.teacher.id);const d=z.object({release:z.boolean()}).parse(req.body);must(!d.release||e.status==='closed'||Date.now()>new Date(e.end_time).getTime(),409,'Wait until the exam is over before releasing results.');await db.query('UPDATE exams SET results_released_at=CASE WHEN $2 THEN now() ELSE NULL END WHERE id=$1',[e.id,d.release]);await audit({teacherId:req.teacher.id,examId:e.id,action:d.release?'exam:results-released':'exam:results-withheld'});res.json({released:d.release});}));
router.put('/exams/:examId',asyncWrap(async(req,res)=>{
 const v=examShape.parse(req.body);await assertAssignedClass(req.teacher,v.className,v.section);const current=await ownExam(req.params.examId,req.teacher.id);
 must(current.status==='draft'||current.status==='scheduled',409,'Active or closed exams cannot be edited.');
 const q=await db.query(`UPDATE exams SET title=$1,subject=$2,class_name=$3,section=$4,exam_type=$5,
 start_time=$6,end_time=$7,duration_minutes=$8,settings=$9,updated_at=now()
 WHERE id=$10 AND teacher_id=$11 AND status IN ('draft','scheduled') RETURNING *`,
 [v.title,v.subject,v.className,v.section,v.examType,v.startTime,v.endTime,v.durationMinutes,
 JSON.stringify(v.settings),current.id,req.teacher.id]);
 must(q.rowCount,409,'Exam status changed; reload.');res.json({exam:scrub(q.rows[0])});
}));
// Remove a published exam from the active teacher/student lists, retaining
// submitted work in the database for review and recovery.
router.delete('/exams/:examId',asyncWrap(async(req,res)=>{
 const confirmation=z.object({confirmation:z.string().min(1).max(180)}).parse(req.body||{});
 const result=await db.transaction(async c=>{
  const owned=await c.query('SELECT * FROM exams WHERE id=$1 AND teacher_id=$2 FOR UPDATE',
   [req.params.examId,req.teacher.id]);
  must(owned.rowCount,404,'Exam not found.');
  const exam=owned.rows[0];
  must(!exam.archived_at,409,'This exam is already removed.');
  must(confirmation.confirmation.trim()===exam.title,400,'Type the exact exam title to confirm removal.');
  const participants=await c.query("SELECT count(*)::int AS n FROM exam_sessions WHERE exam_id=$1 AND status NOT IN ('submitted','revoked')",[exam.id]);
  // Scheduled exams may also be underway without their status being
  // promoted yet; expired live exams should still be removable.
  const now=Date.now();
  const windowOpen=['active','scheduled'].includes(exam.status) &&
    now>=new Date(exam.start_time).getTime() &&
    now<=new Date(exam.end_time).getTime();
  must(!(windowOpen && participants.rows[0].n>0),409,
    'Students are still taking this exam. Wait until they submit or the exam window ends. Existing answers must be preserved.');
  const q=await c.query("UPDATE exams SET archived_at=now(),status='closed',updated_at=now() WHERE id=$1 AND teacher_id=$2 RETURNING id",
   [exam.id,req.teacher.id]);
  return q.rows[0];
 });
 await audit({teacherId:req.teacher.id,examId:result.id,action:'exam:archived'});
 res.json({removed:true,archived:true,notice:'Exam removed from current lists. Existing submissions remain available to restore.'});
}));
router.post('/exams/:examId/restore',asyncWrap(async(req,res)=>{
 const q=await db.query(`UPDATE exams SET archived_at=NULL,status='closed',updated_at=now()
   WHERE id=$1 AND teacher_id=$2 AND archived_at IS NOT NULL RETURNING *`,[req.params.examId,req.teacher.id]);
 must(q.rowCount,404,'Removed exam not found.');await audit({teacherId:req.teacher.id,examId:q.rows[0].id,action:'exam:restored'});
 res.json({exam:scrub(q.rows[0]),notice:'Restored as closed. It does not automatically resume or republish.'});
}));
router.get('/exams/:examId/passcode',asyncWrap(async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 const exam=await ownExam(req.params.examId,req.teacher.id);
 if(!exam.passcode_ciphertext){
  return res.json({available:false,legacy:true,
    notice:'This exam was created before encrypted password recovery was enabled. The original password cannot be recovered. Generate a new password to reveal and copy it.'});
 }
 must(env.EXAM_PASSCODE_KEY,503,'Password recovery is not configured on the backend.');
 const passcode=decryptPasscode(exam.passcode_ciphertext,env.EXAM_PASSCODE_KEY);
 await audit({teacherId:req.teacher.id,examId:exam.id,action:'exam:passcode_revealed'});
 res.json({available:true,passcode,notice:'Only the authenticated exam owner can view this password.'});
}));
router.post('/exams/:examId/generate-passcode',asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 must(['draft','scheduled'].includes(exam.status),409,'Cannot rotate passcode after the exam becomes active.');
 must(env.EXAM_PASSCODE_KEY,503,'Passcode recovery is not configured on the backend.');
 const attendees=await db.query("SELECT count(*)::int AS n FROM exam_sessions WHERE exam_id=$1 AND status IN('joined','active','disconnected','flagged')",[exam.id]);
 must(!attendees.rows[0].n,409,'This exam already has admitted students. Do not change their exam password while it is underway.');
 const custom=req.body?.passcode;
 const passcode=custom===undefined?crypto.randomBytes(5).toString('hex').toUpperCase():
 z.string().min(8).max(64).regex(/^[A-Za-z0-9!@#_\\s-]+$/i).parse(custom).trim().toUpperCase();
 must(isValidExamPasscode(passcode),400,'A passcode must contain 8 to 64 letters, numbers or permitted symbols, excluding separators.');
 const passcodeHash=await bcrypt.hash(normalizeExamPasscode(passcode),12);
 const cipher=encryptPasscode(passcode,env.EXAM_PASSCODE_KEY);
 await db.query('UPDATE exams SET passcode_hash=$1,passcode_ciphertext=$2,updated_at=now() WHERE id=$3',[passcodeHash,cipher,exam.id]);
 await audit({teacherId:req.teacher.id,examId:exam.id,action:'exam:passcode_rotated'});
 res.set('Cache-Control','private, no-store');
 res.json({passcode,notice:'Saved encrypted on the server. You can view it again as the authenticated exam owner.'});
}));
router.post('/exams/:examId/publish',asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 must(exam.status==='draft'||exam.status==='scheduled',409,'Exam cannot be published in its current state.');
 must(exam.passcode_hash,400,'Generate an exam passcode first.');
 const total=await db.query('SELECT count(*)::int AS count FROM questions WHERE exam_id=$1',[exam.id]);
 must(total.rows[0].count>0,400,'Add at least one question first.');
 must(new Date(exam.end_time).getTime()>Date.now(),400,'Exam end time is in the past.');
 const status=new Date(exam.start_time).getTime()>Date.now()?'scheduled':'active';
 const q=await db.query(`UPDATE exams SET status=$1,updated_at=now() WHERE id=$2 AND status IN('draft','scheduled') RETURNING *`,[status,exam.id]);
 await audit({teacherId:req.teacher.id,examId:exam.id,action:'exam:published'});
 res.json({exam:scrub(q.rows[0])});
}));
router.post('/exams/:examId/close',asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 await db.query("UPDATE exams SET status='closed',updated_at=now() WHERE id=$1",[exam.id]);
 await audit({teacherId:req.teacher.id,examId:exam.id,action:'exam:closed'});
 getIo()?.to(`exam:${exam.id}:students`).emit('exam:closed',{reason:'Your teacher closed this exam.'});
 publish(exam.id,'exam:closed',{examId:exam.id});
 res.json({status:'closed'});
}));
const qShape=z.object({type:z.enum(['mcq','short','long','code','file']),title:z.string().min(1).max(240),
 description:z.string().max(10000).default(''),options:z.array(z.string().max(600)).max(16).default([]),
 correctAnswer:z.union([z.string(),z.number(),z.null()]).default(null),marks:z.number().min(0).max(10000),
 language:z.enum(['python','java','cpp','c','javascript']).nullable().optional(),starterCode:z.string().max(20000).default(''),
 visibleTestCases:z.array(z.object({stdin:z.string().max(2048),expectedOutput:z.string().max(2048)})).max(8).default([]),
 hiddenTestCases:z.array(z.object({stdin:z.string().max(2048),expectedOutput:z.string().max(2048)})).max(8).default([]),
 order:z.number().int().min(0).max(10000).default(0)});
async function draftOwner(examId,t){const exam=await ownExam(examId,t);must(exam.status==='draft',409,'Questions can only change while the exam is draft.');return exam;}
router.post('/exams/:examId/questions',asyncWrap(async(req,res)=>{
 const exam=await draftOwner(req.params.examId,req.teacher.id);const v=qShape.parse(req.body);
 must(v.type!=='code'||v.language,400,'Code questions need a language.');
 const q=await db.query(`INSERT INTO questions(exam_id,type,title,description,options,correct_answer,marks,language,starter_code,visible_tests,hidden_tests,sort_order)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
 [exam.id,v.type,v.title,v.description,JSON.stringify(v.options),v.correctAnswer===null?null:JSON.stringify(v.correctAnswer),
 v.marks,v.language||null,v.starterCode,JSON.stringify(v.visibleTestCases),JSON.stringify(v.hiddenTestCases),v.order]);
 res.status(201).json({question:q.rows[0]});
}));
router.get('/exams/:examId/questions',asyncWrap(async(req,res)=>{
 const exam=await ownExam(req.params.examId,req.teacher.id);
 const q=await db.query('SELECT * FROM questions WHERE exam_id=$1 ORDER BY sort_order,id',[exam.id]);res.json({questions:q.rows});
}));
router.put('/questions/:questionId',asyncWrap(async(req,res)=>{
 const v=qShape.parse(req.body);const current=await db.query(`SELECT q.exam_id FROM questions q JOIN exams e ON e.id=q.exam_id
 WHERE q.id=$1 AND e.teacher_id=$2 AND e.status='draft'`,[req.params.questionId,req.teacher.id]);
 must(current.rowCount,404,'Editable question not found.');
 const q=await db.query(`UPDATE questions SET type=$1,title=$2,description=$3,options=$4,correct_answer=$5,marks=$6,
 language=$7,starter_code=$8,visible_tests=$9,hidden_tests=$10,sort_order=$11,updated_at=now() WHERE id=$12 RETURNING *`,
 [v.type,v.title,v.description,JSON.stringify(v.options),v.correctAnswer===null?null:JSON.stringify(v.correctAnswer),v.marks,
 v.language||null,v.starterCode,JSON.stringify(v.visibleTestCases),JSON.stringify(v.hiddenTestCases),v.order,req.params.questionId]);
 res.json({question:q.rows[0]});
}));
router.delete('/questions/:questionId',asyncWrap(async(req,res)=>{
 const q=await db.query(`DELETE FROM questions WHERE id=$1 AND exam_id IN (SELECT id FROM exams WHERE teacher_id=$2 AND status='draft') RETURNING id`,
 [req.params.questionId,req.teacher.id]);must(q.rowCount,404,'Editable question not found.');res.json({deleted:true});
}));
module.exports=router;

