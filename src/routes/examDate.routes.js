'use strict';
const express=require('express');const {z}=require('zod');const db=require('../config/db');
const {teacher}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');const {assertAssignedClass}=require('../services/permissions');
const router=express.Router();const shape=z.object({title:z.string().trim().min(1).max(180),className:z.string().min(1).max(40),
 section:z.string().min(1).max(12).default('All'),date:z.coerce.date(),description:z.string().max(2000).default('')});
router.get('/exam-dates',asyncWrap(async(req,res)=>{
 const f=z.object({className:z.string().min(1).max(40),section:z.string().min(1).max(12)}).parse(req.query);
 const q=await db.query(`SELECT id,title,class_name,section,date,description FROM exam_dates
 WHERE lower(class_name)=lower($1) AND (lower(section)='all' OR lower(section)=lower($2))
 ORDER BY date LIMIT 150`,[f.className,f.section]);res.json({examDates:q.rows});
}));
router.get('/teacher/exam-dates',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query('SELECT * FROM exam_dates WHERE created_by=$1 ORDER BY date DESC',[req.teacher.id]);res.json({examDates:q.rows});
}));
router.post('/teacher/exam-dates',teacher,asyncWrap(async(req,res)=>{
 const v=shape.parse(req.body);await assertAssignedClass(req.teacher,v.className,v.section);const q=await db.query(`INSERT INTO exam_dates(title,class_name,section,date,description,created_by)
 VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[v.title,v.className,v.section,v.date,v.description,req.teacher.id]);
 res.status(201).json({examDate:q.rows[0]});
}));
router.put('/teacher/exam-dates/:id',teacher,asyncWrap(async(req,res)=>{
 const v=shape.parse(req.body);await assertAssignedClass(req.teacher,v.className,v.section);const q=await db.query(`UPDATE exam_dates SET title=$1,class_name=$2,section=$3,date=$4,description=$5
 WHERE id=$6 AND created_by=$7 RETURNING *`,[v.title,v.className,v.section,v.date,v.description,req.params.id,req.teacher.id]);
 must(q.rowCount,404,'Exam date not found.');res.json({examDate:q.rows[0]});
}));
router.delete('/teacher/exam-dates/:id',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query('DELETE FROM exam_dates WHERE id=$1 AND created_by=$2 RETURNING id',[req.params.id,req.teacher.id]);
 must(q.rowCount,404,'Exam date not found.');res.json({deleted:true});
}));
module.exports=router;
