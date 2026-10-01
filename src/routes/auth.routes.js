'use strict';
const express=require('express');const rateLimit=require('express-rate-limit');const bcrypt=require('bcryptjs');const {z}=require('zod');
const db=require('../config/db');const {teacherToken,teacher,admin}=require('../middleware/auth');
const {asyncWrap,must}=require('../utils/http');const {audit}=require('../services/audit');
const router=express.Router();
const limiter=rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-7',legacyHeaders:false});
router.post('/teacher/login',limiter,asyncWrap(async(req,res)=>{
 const parsed=z.object({
  email:z.string().trim().toLowerCase().email().max(200),
  password:z.string().min(1).max(200)
 }).safeParse(req.body);
 if(!parsed.success){
  const invalidEmail=parsed.error.issues.some(issue=>issue.path[0]==='email');
  return res.status(400).json({
    error:invalidEmail
      ? 'Enter your registered email address, including the @ symbol.'
      : 'Please enter your account password.'
  });
 }
 const {email,password}=parsed.data;
 const q=await db.query('SELECT * FROM teachers WHERE email=$1 AND active=true',[email]);
 // Constant-cost hash verification even for missing accounts.
 const dummy='$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36nYkJxb1ylKwJ6/hZJWh2i';
 const valid=await bcrypt.compare(password,q.rows[0]?.password_hash||dummy);
 must(valid&&q.rowCount,401,'Invalid credentials.');
 const t=q.rows[0];res.json({token:teacherToken(t),teacher:{id:t.id,name:t.name,email:t.email,role:t.role,subject:t.subject}});
}));
router.get('/teacher/me',teacher,(req,res)=>res.json({teacher:req.teacher}));
// Provisioning is admin-only; never expose open public teacher registration.
router.post('/teacher/register',teacher,admin,asyncWrap(async(req,res)=>{
 const data=z.object({name:z.string().trim().min(2).max(120),email:z.string().email().max(200),
  password:z.string().min(12).max(128),role:z.enum(['teacher','admin']).default('teacher'),
  subject:z.string().max(90).default('Computers'),assignedClasses:z.array(z.string().max(40)).max(30).default([])}).parse(req.body);
 const hash=await bcrypt.hash(data.password,12);
 const q=await db.query(`INSERT INTO teachers(name,email,password_hash,subject,assigned_classes,role)
 VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,email,subject,assigned_classes,role`,
 [data.name,data.email,hash,data.subject,JSON.stringify(data.assignedClasses),data.role]);
 await audit({teacherId:req.teacher.id,action:'teacher:create',details:{teacherId:q.rows[0].id}});
 res.status(201).json({teacher:q.rows[0]});
}));
router.post('/teacher/change-password',teacher,limiter,asyncWrap(async(req,res)=>{
 const d=z.object({currentPassword:z.string().min(1).max(200),newPassword:z.string().min(12).max(128)}).parse(req.body);
 const q=await db.query('SELECT password_hash FROM teachers WHERE id=$1 AND active=true',[req.teacher.id]);
 must(q.rowCount && await bcrypt.compare(d.currentPassword,q.rows[0].password_hash),403,'Current password is incorrect.');
 must(d.newPassword!==d.currentPassword,400,'Choose a different password.');
 const hash=await bcrypt.hash(d.newPassword,12);
 await db.query('UPDATE teachers SET password_hash=$1,updated_at=now() WHERE id=$2',[hash,req.teacher.id]);
 await audit({teacherId:req.teacher.id,action:'teacher:password-changed'});
 res.json({changed:true,message:'Password updated. Sign out other sessions on shared devices.'});
}));
module.exports=router;
