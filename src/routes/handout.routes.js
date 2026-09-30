'use strict';
const express=require('express');const multer=require('multer');const {z}=require('zod');const db=require('../config/db');
const {teacher,student,studentAllowed}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const {upload,signedRead,remove}=require('../services/storage');const {assertAssignedClass}=require('../services/permissions');
const router=express.Router();const uploader=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1}});
const shape=z.object({title:z.string().trim().min(1).max(180),description:z.string().max(2000).default(''),
 className:z.string().trim().min(1).max(40),section:z.string().trim().min(1).max(12).default('All')});
router.post('/teacher/handouts/upload',teacher,uploader.single('file'),asyncWrap(async(req,res)=>{
 must(req.file?.buffer,400,'File is required.');const v=shape.parse(req.body);
 await assertAssignedClass(req.teacher,v.className,v.section);
 const file=await upload(req.file.buffer,'handouts');
 try {const q=await db.query(`INSERT INTO handouts(title,description,file_key,file_type,class_name,section,uploaded_by)
 VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,title,description,file_type,class_name,section,created_at`,
 [v.title,v.description,file.key,file.type,v.className,v.section,req.teacher.id]);res.status(201).json({handout:q.rows[0]});}
 catch(e){await remove(file.key).catch(()=>{});throw e;}
}));
router.get('/teacher/handouts',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query('SELECT id,title,description,file_type,class_name,section,created_at FROM handouts WHERE uploaded_by=$1 ORDER BY created_at DESC',[req.teacher.id]);
 res.json({handouts:q.rows});
}));
router.delete('/teacher/handouts/:id',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query('DELETE FROM handouts WHERE id=$1 AND uploaded_by=$2 RETURNING file_key',[req.params.id,req.teacher.id]);
 must(q.rowCount,404,'Handout not found.');await remove(q.rows[0].file_key).catch(e=>console.error('[storage] delete pending',e.message));
 res.json({deleted:true});
}));
router.get('/handouts',asyncWrap(async(req,res)=>{
 const {className,section}=z.object({className:z.string().min(1).max(40),section:z.string().min(1).max(12)}).parse(req.query);
 const q=await db.query(`SELECT id,title,description,file_type,class_name,section,created_at FROM handouts
 WHERE lower(class_name)=lower($1) AND (lower(section)='all' OR lower(section)=lower($2)) ORDER BY created_at DESC LIMIT 100`,[className,section]);
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
 const file=await upload(req.file.buffer,'student-answers');
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
