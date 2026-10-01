'use strict';
const express=require('express');const multer=require('multer');const {z}=require('zod');
const rateLimit=require('express-rate-limit');const db=require('../config/db');
const {student,studentAllowed,teacher}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const {publish}=require('../services/events');
const router=express.Router();const TOTAL_LIMIT=128*1024*1024,CLIP_LIMIT=12*1024*1024;
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:1048576,files:1,fields:1}});
const id=z.string().uuid();
const notify=r=>publish(r.exam_id,'exam:incidentUpdate',{sessionId:r.session_id,recordingId:r.id,recording:!r.ended_at,sizeBytes:r.size_bytes});
router.post('/student/incidents',student,rateLimit({windowMs:60000,limit:12,keyGenerator:req=>req.student.id,standardHeaders:'draft-7',legacyHeaders:false}),asyncWrap(async(req,res)=>{
 studentAllowed(req.student);
 must(req.student.consent_screen&&req.student.consent_recording,403,'Explicit screen and incident-recording consent are required.');
 const v=z.object({clientId:id,triggerType:z.enum(['TAB_SWITCH','WINDOW_BLUR','FULLSCREEN_EXIT']),mimeType:z.string().max(80).refine(x=>/^video\/webm(?:;codecs=[\w, -]+)?$/.test(x))}).parse(req.body);
 const r=await db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(73460136)');
  await c.query('DELETE FROM incident_recordings WHERE expires_at<now()');
  const existing=await c.query('SELECT * FROM incident_recordings WHERE session_id=$1 AND client_id=$2',[req.student.id,v.clientId]);
  if(existing.rowCount)return existing.rows[0];
  await c.query(`UPDATE incident_recordings SET ended_at=now(),finish_reason='replaced-after-interruption'
   WHERE session_id=$1 AND ended_at IS NULL`,[req.student.id]);
  const q=await c.query(`INSERT INTO incident_recordings(exam_id,session_id,client_id,trigger_type,mime_type)
   VALUES($1,$2,$3,$4,$5) RETURNING *`,[req.student.exam_id,req.student.id,v.clientId,v.triggerType,v.mimeType]);return q.rows[0];
 });
 notify(r);res.status(201).json({recordingId:r.id,expiresAt:r.expires_at,maxBytes:CLIP_LIMIT});
}));
router.post('/student/incidents/:id/chunks/:sequence',student,rateLimit({windowMs:60000,limit:90,keyGenerator:req=>req.student.id,standardHeaders:'draft-7',legacyHeaders:false}),upload.single('chunk'),asyncWrap(async(req,res)=>{
 id.parse(req.params.id);
 const sequence=z.coerce.number().int().min(0).max(15000).parse(req.params.sequence);
 must(req.student.consent_screen&&req.student.consent_recording,403,'Recording consent is no longer active.');
 must(req.file?.buffer?.length,400,'A nonempty video chunk is required.');
 const r=await db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(73460136)');
  const q=await c.query('SELECT * FROM incident_recordings WHERE id=$1 AND session_id=$2 AND expires_at>now() FOR UPDATE',[req.params.id,req.student.id]);
  must(q.rowCount,404,'Recording unavailable.');const row=q.rows[0];
  must(!row.ended_at,409,'Recording already finished.');
  if((await c.query('SELECT 1 FROM incident_recording_chunks WHERE recording_id=$1 AND sequence=$2',[row.id,sequence])).rowCount)return row;
  const next=(await c.query('SELECT count(*)::int AS n FROM incident_recording_chunks WHERE recording_id=$1',[row.id])).rows[0].n;
  must(sequence===next,409,'Recording chunks must arrive in order.');
  if(sequence===0)must(req.file.buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])),415,'Expected a WebM screen recording.');
  const total=Number((await c.query('SELECT coalesce(sum(size_bytes),0) AS n FROM incident_recordings')).rows[0].n);
  must(row.size_bytes+req.file.buffer.length<=CLIP_LIMIT&&total+req.file.buffer.length<=TOTAL_LIMIT,507,'Incident recording storage is full. Recording is incomplete; ask the administrator to remove old test data.');
  await c.query('INSERT INTO incident_recording_chunks(recording_id,sequence,file_bytes) VALUES($1,$2,$3)',[row.id,sequence,req.file.buffer]);
  return (await c.query('UPDATE incident_recordings SET size_bytes=size_bytes+$1 WHERE id=$2 RETURNING *',[req.file.buffer.length,row.id])).rows[0];
 });res.json({saved:true,sizeBytes:r.size_bytes});
}));
router.post('/student/incidents/:id/finish',student,asyncWrap(async(req,res)=>{
 const reason=z.object({reason:z.string().max(60)}).parse(req.body).reason;
 const q=await db.query(`UPDATE incident_recordings SET ended_at=coalesce(ended_at,now()),finish_reason=coalesce(finish_reason,$1)
 WHERE id=$2 AND session_id=$3 RETURNING *`,[reason,id.parse(req.params.id),req.student.id]);
 must(q.rowCount,404,'Recording unavailable.');notify(q.rows[0]);res.json({finished:true});
}));
router.get('/teacher/sessions/:sessionId/incidents',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT r.id,r.trigger_type,r.started_at,r.ended_at,r.finish_reason,r.size_bytes,r.expires_at
 FROM incident_recordings r JOIN exams e ON e.id=r.exam_id WHERE r.session_id=$1 AND e.teacher_id=$2
 AND r.expires_at>now() ORDER BY r.started_at DESC LIMIT 100`,[id.parse(req.params.sessionId),req.teacher.id]);
 res.set('Cache-Control','private, no-store');res.json({recordings:q.rows});
}));
router.get('/teacher/incidents/:id/video',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT r.* FROM incident_recordings r JOIN exams e ON e.id=r.exam_id
 WHERE r.id=$1 AND e.teacher_id=$2 AND r.expires_at>now()`,[id.parse(req.params.id),req.teacher.id]);
 must(q.rowCount,404,'Recording unavailable.');must(q.rows[0].ended_at,409,'The incident is still recording.');
 const chunks=await db.query('SELECT file_bytes FROM incident_recording_chunks WHERE recording_id=$1 ORDER BY sequence',[req.params.id]);
 must(chunks.rowCount,404,'No video was uploaded for this incident.');
 res.set('Cache-Control','private, no-store');res.type('video/webm');res.set('Content-Disposition','inline; filename="incident.webm"');
 res.send(Buffer.concat(chunks.rows.map(x=>x.file_bytes)));
}));
module.exports=router;
