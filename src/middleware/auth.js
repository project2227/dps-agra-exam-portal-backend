'use strict';
const jwt=require('jsonwebtoken');const crypto=require('crypto');
const db=require('../config/db');const {env}=require('../config/env');const {asyncWrap,must}=require('../utils/http');
const {sessionStart}=require('../services/examLifecycle');
const hash=token=>crypto.createHash('sha256').update(token).digest('hex');
const teacherToken=t=>jwt.sign({kind:'teacher',sub:t.id,role:t.role},env.JWT_SECRET,{issuer:'dps-exam',expiresIn:'8h'});
const studentToken=(s,seconds)=>jwt.sign({kind:'student',sub:s.id,examId:s.exam_id},env.STUDENT_SESSION_SECRET,{issuer:'dps-exam',expiresIn:Math.max(120,Math.min(seconds,8*3600))});
const teacher=asyncWrap(async(req,res,next)=>{
 const bearer=String(req.headers.authorization||'').match(/^Bearer (.+)$/i)?.[1];must(bearer,401,'Teacher login required.');
 let token;try{token=jwt.verify(bearer,env.JWT_SECRET,{issuer:'dps-exam'});}catch{must(false,401,'Teacher session expired.');}
 must(token.kind==='teacher',403,'Teacher token required.');
 const q=await db.query('SELECT id,name,email,role,active,assigned_classes FROM teachers WHERE id=$1',[token.sub]);
 must(q.rows[0]?.active,401,'Account not active.');req.teacher=q.rows[0];next();
});
const admin=(req,res,next)=>req.teacher?.role==='admin'?next():next(Object.assign(new Error('Administrator required.'),{status:403}));
const student=asyncWrap(async(req,res,next)=>{
 const bearer=String(req.headers.authorization||'').match(/^Bearer (.+)$/i)?.[1];must(bearer,401,'Exam session token required.');
 let token;try{token=jwt.verify(bearer,env.STUDENT_SESSION_SECRET,{issuer:'dps-exam'});}catch{must(false,401,'Exam session expired.');}
 must(token.kind==='student',403,'Student token required.');
 const q=await db.query(`SELECT s.*,e.start_time,e.end_time,e.status AS exam_status,e.settings,e.duration_minutes,e.title AS exam_title
 FROM exam_sessions s JOIN exams e ON e.id=s.exam_id WHERE s.id=$1 AND s.exam_id=$2`,[token.sub,token.examId]);
 const sess=q.rows[0];must(sess && sess.token_hash===hash(bearer) && !['submitted','revoked'].includes(sess.status),401,'Session no longer active.');
 req.student=sess;next();
});
const ownExam=async(examId,teacherId)=>{
 const q=await db.query('SELECT * FROM exams WHERE id=$1 AND teacher_id=$2',[examId,teacherId]);must(q.rowCount,404,'Exam not found.');return q.rows[0];
};
const examOpen=e=>{const now=Date.now();return ['active','scheduled'].includes(e.status)&&now>=new Date(e.start_time).getTime()&&now<=new Date(e.end_time).getTime();};
const studentAllowed=s=>{
 must(examOpen({status:s.exam_status,start_time:s.start_time,end_time:s.end_time}),403,'Exam is not currently active.');
 const personalEnd=sessionStart(s)+Number(s.duration_minutes)*60000;
 must(Date.now()<=personalEnd,403,'Your exam duration has ended.');
};
module.exports={hash,teacherToken,studentToken,teacher,admin,student,ownExam,examOpen,studentAllowed};
