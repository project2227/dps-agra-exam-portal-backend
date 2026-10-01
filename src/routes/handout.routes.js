'use strict';
const express=require('express');const multer=require('multer');const {z}=require('zod');const db=require('../config/db');
const {teacher,student,studentAllowed}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const {upload,signedRead,readSignedFile,remove}=require('../services/storage');
const {env}=require('../config/env');
const rateLimit=require('express-rate-limit');const {assertAssignedClass}=require('../services/permissions');
const router=express.Router();const uploader=multer({storage:multer.memoryStorage(),limits:{fileSize:env.UPLOAD_PROVIDER==='postgres'?5*1024*1024:8*1024*1024,files:1}});
const shape=z.object({title:z.string().trim().min(1).max(180),description:z.string().max(2000).default(''),
 className:z.string().trim().min(1).max(40),section:z.string().trim().min(1).max(12).default('All')});
// A download token is issued only after an authorized student/teacher has
// requested that specific handout. The five-minute link contains an HMAC,
// not an S3 credential or a raw storage key. Never cache download responses.
const downloadLimit=rateLimit({windowMs:10*60*1000,limit:90,standardHeaders:'draft-7',legacyHeaders:false});
router.get('/files/:token',downloadLimit,asyncWrap(async(req,res)=>{
 const f=await readSignedFile(req.params.token);
 res.set('Cache-Control','private, no-store');
 res.set('X-Content-Type-Options','nosniff');
 res.set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`);
 res.type(f.type);
 res.send(f.buffer);
}));
router.post('/teacher/handouts/upload',teacher,uploader.single('file'),asyncWrap(async(req,res)=>{
 must(req.file?.buffer,400,'File is required.');const v=shape.parse(req.body);
 await assertAssignedClass(req.teacher,v.className,v.section);
 const file=await upload(req.file.buffer,'handouts',req.file.originalname);
 try {const q=await db.query(`INSERT INTO handouts(title,description,file_key,file_type,class_name,section,uploaded_by)
 VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,title,description,file_type,class_name,section,created_at`,
 [v.title,v.description,file.key,file.type,v.className,v.section,req.teacher.id]);res.status(201).json({handout:{...q.rows[0],file_name:file.name,file_size:file.size}});}
 catch(e){await remove(file.key).catch(()=>{});throw e;}
}));
router.get('/teacher/handouts',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT h.id,h.title,h.description,h.file_type,h.class_name,h.section,h.created_at,
 f.original_name AS file_name,COALESCE(f.size_bytes,0)::integer AS file_size
 FROM handouts h LEFT JOIN stored_files f ON f.storage_key=h.file_key
 WHERE h.uploaded_by=$1 ORDER BY h.created_at DESC`,[req.teacher.id]);
 res.json({handouts:q.rows});
}));
router.delete('/teacher/handouts/:id',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query('DELETE FROM handouts WHERE id=$1 AND uploaded_by=$2 RETURNING file_key',[req.params.id,req.teacher.id]);
 must(q.rowCount,404,'Handout not found.');await remove(q.rows[0].file_key).catch(e=>console.error('[storage] delete pending',e.message));
 res.json({deleted:true});
}));
router.get('/handouts',asyncWrap(async(req,res)=>{
 const {className,section}=z.object({className:z.string().min(1).max(40),section:z.string().min(1).max(12)}).parse(req.query);
 const q=await db.query(`SELECT h.id,h.title,h.description,h.file_type,h.class_name,h.section,h.created_at,
 f.original_name AS file_name,COALESCE(f.size_bytes,0)::integer AS file_size
 FROM handouts h LEFT JOIN stored_files f ON f.storage_key=h.file_key
 WHERE lower(h.class_name)=lower($1) AND (lower(h.section)='all' OR lower(h.section)=lower($2))
 ORDER BY h.created_at DESC LIMIT 100`,[className,section]);
 res.json({handouts:q.rows});
}));
// A student can retrieve a handout only for their authenticated class/section. Teachers have their own download route.
router.get('/student/handouts/:id/download',student,asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT file_key FROM handouts WHERE id=$1 AND lower(class_name)=lower($2)
 AND (lower(section)='all' OR lower(section)=lower($3))`,[req.params.id,req.student.class_name,req.student.section]);
 must(q.rowCount,404,'Handout not available for this session.');res.json({url:await signedRead(q.rows[0].file_key),expiresIn:300});
}));
router.get('/teacher/handouts/:id/download',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query('SELECT file_key FROM handouts WHERE id=$1 AND uploaded_by=$2',[req.params.id,req.teacher.id]);
 must(q.rowCount,404,'Handout not found.');res.json({url:await signedRead(q.rows[0].file_key),expiresIn:300});
}));
router.post('/student/answers/:questionId/file',student,uploader.single('file'),asyncWrap(async(req,res)=>{
 must(req.file?.buffer,400,'File is required.');
 const q=await db.query(`SELECT id FROM questions WHERE id=$1 AND exam_id=$2 AND type='file'`,
 [req.params.questionId,req.student.exam_id]);must(q.rowCount,404,'File question not found.');
 studentAllowed(req.student);
 const file=await upload(req.file.buffer,'student-answers',req.file.originalname);
 try {const prev=await db.transaction(async c=>{
 const locked=await c.query('SELECT status FROM exam_sessions WHERE id=$1 FOR UPDATE',[req.student.id]);
 must(['joined','active','disconnected','flagged'].includes(locked.rows[0]?.status),409,'Submission is locked.');
 const prev=await c.query('SELECT file_key FROM answers WHERE session_id=$1 AND question_id=$2',[req.student.id,q.rows[0].id]);
 await c.query(`INSERT INTO answers(exam_id,session_id,question_id,file_key) VALUES($1,$2,$3,$4)
 ON CONFLICT(session_id,question_id) DO UPDATE SET file_key=$4,auto_saved_at=now()`,
 [req.student.exam_id,req.student.id,q.rows[0].id,file.key]);return prev.rows[0]?.file_key;
 }); if(prev)await remove(prev).catch(e=>console.warn('[storage] stale answer file',e.message));res.json({saved:true});}
 catch(e){await remove(file.key).catch(()=>{});throw e;}
}));
module.exports=router;
