'use strict';
const express=require('express');const {z}=require('zod');const db=require('../config/db');
const {teacher,admin}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const router=express.Router();router.use(teacher);
const body=z.object({className:z.string().trim().min(1).max(40),sections:z.array(z.string().trim().min(1).max(12)).min(1).max(30),computerTeacherId:z.string().uuid().nullable().optional()});
router.get('/classes',asyncWrap(async(req,res)=>{
 const q=await db.query('SELECT * FROM class_groups ORDER BY class_name');res.json({classes:q.rows});
}));
router.post('/classes',admin,asyncWrap(async(req,res)=>{
 const v=body.parse(req.body);
 const q=await db.query('INSERT INTO class_groups(class_name,sections,computer_teacher_id) VALUES($1,$2,$3) RETURNING *',
 [v.className,JSON.stringify(v.sections),v.computerTeacherId||req.teacher.id]);res.status(201).json({classGroup:q.rows[0]});
}));
router.put('/classes/:id',admin,asyncWrap(async(req,res)=>{
 const v=body.parse(req.body);const q=await db.query(`UPDATE class_groups SET class_name=$1,sections=$2,computer_teacher_id=$3
 WHERE id=$4 RETURNING *`,[v.className,JSON.stringify(v.sections),v.computerTeacherId||null,req.params.id]);
 must(q.rowCount,404,'Class group not found.');res.json({classGroup:q.rows[0]});
}));
router.get('/dashboard',asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT e.id,e.title,e.class_name,e.section,e.status,e.start_time,e.end_time,
 (SELECT count(*)::int FROM exam_sessions s WHERE s.exam_id=e.id) AS participants,
 (SELECT count(*)::int FROM exam_sessions s WHERE s.exam_id=e.id AND s.submitted_at IS NOT NULL) AS submissions
 FROM exams e WHERE e.teacher_id=$1 AND e.archived_at IS NULL ORDER BY e.start_time DESC LIMIT 100`,[req.teacher.id]);
 res.json({exams:q.rows});
}));
module.exports=router;
