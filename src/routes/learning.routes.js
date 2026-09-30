'use strict';
const express=require('express');
const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');const crypto=require('crypto');
const {z}=require('zod');const rateLimit=require('express-rate-limit');
const db=require('../config/db');const {env}=require('../config/env');
const {teacher,admin}=require('../middleware/auth');const {asyncWrap,must}=require('../utils/http');
const router=express.Router();
const authLimiter=rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-7',legacyHeaders:false});
const writeLimiter=rateLimit({windowMs:60*1000,limit:25,standardHeaders:'draft-7',legacyHeaders:false});
const classes=['VI','VII','VIII','IX','X','XI','XII'];
const languages=['python','web','java','c','cpp','sql','blocks'];
const profilePublic=p=>({id:p.id,handle:p.handle,className:p.class_name,createdAt:p.created_at});
const tokenFor=p=>jwt.sign({kind:'practice',sub:p.id},env.JWT_SECRET,{issuer:'dps-practice',expiresIn:'7d'});
const passHash=v=>crypto.createHmac('sha256',env.FINGERPRINT_PEPPER).update(String(v).trim().toUpperCase()).digest('hex');
const practice=asyncWrap(async(req,res,next)=>{
 const raw=String(req.headers.authorization||'').match(/^Bearer (.+)$/i)?.[1];must(raw,401,'Practice profile sign-in required.');
 let t;try{t=jwt.verify(raw,env.JWT_SECRET,{issuer:'dps-practice'});}catch{must(false,401,'Practice session expired.');}
 must(t.kind==='practice',403,'Incorrect token type.');
 const q=await db.query('SELECT id,handle,class_name,created_at FROM practice_users WHERE id=$1 AND active=true',[t.sub]);
 must(q.rowCount,401,'Practice profile is no longer active.');req.practice=q.rows[0];next();
});
const register=z.object({handle:z.string().trim().regex(/^[a-z0-9_-]{3,32}$/i),password:z.string().min(10).max(128),className:z.enum(classes).default('IX'),acknowledgePrototype:z.literal(true)});
router.post('/register',authLimiter,asyncWrap(async(req,res)=>{
 const d=register.parse(req.body);
 const passwordHash=await bcrypt.hash(d.password,12);
 const q=await db.query(`INSERT INTO practice_users(handle,password_hash,class_name) VALUES($1,$2,$3)
 ON CONFLICT(handle) DO NOTHING RETURNING id,handle,class_name,created_at`,[d.handle,passwordHash,d.className]);
 must(q.rowCount,409,'This nickname is already registered.');
 res.status(201).json({profile:profilePublic(q.rows[0]),token:tokenFor(q.rows[0])});
}));
router.post('/login',authLimiter,asyncWrap(async(req,res)=>{
 const d=z.object({handle:z.string().min(1).max(32),password:z.string().min(1).max(128)}).parse(req.body);
 const q=await db.query('SELECT * FROM practice_users WHERE handle=$1 AND active=true',[d.handle]);
 const dummy='$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36nYkJxb1ylKwJ6/hZJWh2i';
 const ok=await bcrypt.compare(d.password,q.rows[0]?.password_hash||dummy);must(ok&&q.rowCount,401,'Invalid nickname or password.');
 res.json({profile:profilePublic(q.rows[0]),token:tokenFor(q.rows[0])});
}));
router.get('/me',practice,asyncWrap(async(req,res)=>{
 const a=await db.query(`SELECT count(*)::int AS game_attempts,coalesce(max(score),0)::int AS best_score
 FROM practice_game_results WHERE user_id=$1`,[req.practice.id]);
 const b=await db.query(`SELECT count(*)::int AS courses_joined FROM course_enrollments WHERE user_id=$1`,[req.practice.id]);
 res.json({profile:profilePublic(req.practice),stats:{...a.rows[0],...b.rows[0]}});
}));
// The owner can erase a nickname profile and its informal practice/course scores.
// Exam sessions are completely separate and unaffected.
router.delete('/me',practice,asyncWrap(async(req,res)=>{
 const d=z.object({confirm:z.literal('DELETE MY PRACTICE DATA')}).parse(req.body);
 await db.query('DELETE FROM practice_users WHERE id=$1',[req.practice.id]);
 res.json({deleted:true});
}));
router.post('/games',practice,writeLimiter,asyncWrap(async(req,res)=>{
 const d=z.object({gameId:z.enum(['bug-hunt','output-detective','syntax-sprint','mock-practical']),score:z.number().int().min(0).max(100)}).parse(req.body);
 // Self-reported practice game scores are informal, never an official exam result.
 const q=await db.query('INSERT INTO practice_game_results(user_id,game_id,score) VALUES($1,$2,$3) RETURNING id,created_at',[req.practice.id,d.gameId,d.score]);
 res.status(201).json({saved:true,informal:true,...q.rows[0]});
}));
router.get('/games',practice,asyncWrap(async(req,res)=>{
 const q=await db.query('SELECT game_id,score,created_at FROM practice_game_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[req.practice.id]);res.json({results:q.rows});
}));
const safeCourse=c=>({id:c.id,title:c.title,summary:c.summary,language:c.language,className:c.class_name,published:c.published,lessonCount:Array.isArray(c.lessons)?c.lessons.length:0,teacher:c.teacher_name,createdAt:c.created_at});
router.get('/courses',asyncWrap(async(req,res)=>{
 const cls=String(req.query.className||'').slice(0,16);
 const q=await db.query(`SELECT c.id,c.title,c.summary,c.language,c.class_name,c.published,c.lessons,c.created_at,t.name AS teacher_name
 FROM courses c JOIN teachers t ON t.id=c.teacher_id AND t.active=true WHERE c.published=true AND ($1='' OR c.class_name=$1) ORDER BY c.created_at DESC LIMIT 100`,[cls]);
 res.json({courses:q.rows.map(safeCourse)});
}));
router.get('/courses/my',practice,asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT c.id,c.title,c.summary,c.language,c.class_name,c.lessons,c.published,e.completed_lessons,
 (SELECT max(a.score) FROM course_attempts a WHERE a.course_id=c.id AND a.user_id=$1) AS best_score
 FROM course_enrollments e JOIN courses c ON c.id=e.course_id
 WHERE e.user_id=$1 ORDER BY e.joined_at DESC`,[req.practice.id]);res.json({courses:q.rows.map(c=>({...safeCourse(c),completedLessons:c.completed_lessons,bestScore:c.best_score}))});
}));
router.post('/courses/:id/join',practice,authLimiter,asyncWrap(async(req,res)=>{
 const d=z.object({joinCode:z.string().min(4).max(80)}).parse(req.body);
 const q=await db.query('SELECT id,join_code_hash FROM courses WHERE id=$1 AND published=true',[req.params.id]);must(q.rowCount,404,'Course unavailable.');
 const good=crypto.timingSafeEqual(Buffer.from(passHash(d.joinCode)),Buffer.from(q.rows[0].join_code_hash));must(good,403,'Invalid course join code.');
 await db.query('INSERT INTO course_enrollments(user_id,course_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.practice.id,req.params.id]);
 res.json({joined:true});
}));
async function enrolled(uid,cid){const q=await db.query(`SELECT c.id,c.title,c.summary,c.language,c.class_name,c.lessons,c.resources,c.quiz,c.published,e.completed_lessons
 FROM course_enrollments e JOIN courses c ON c.id=e.course_id
 WHERE e.user_id=$1 AND c.id=$2 AND c.published=true`,[uid,cid]);must(q.rowCount,404,'Join the course first.');return q.rows[0];}
router.get('/courses/:id',practice,asyncWrap(async(req,res)=>{
 const c=await enrolled(req.practice.id,req.params.id);
 const questions=c.quiz.map(({answerIndex,...q})=>q);
 res.json({course:{...safeCourse(c),lessons:c.lessons,resources:c.resources,quiz:questions,completedLessons:c.completed_lessons}});
}));
router.post('/courses/:id/lessons/:index/complete',practice,writeLimiter,asyncWrap(async(req,res)=>{
 const c=await enrolled(req.practice.id,req.params.id),i=Number(req.params.index);
 must(Number.isSafeInteger(i)&&i>=0&&i<c.lessons.length,400,'Invalid lesson.');
 const completed=[...new Set([...(c.completed_lessons||[]),i])].sort((a,b)=>a-b);
 await db.query('UPDATE course_enrollments SET completed_lessons=$1 WHERE user_id=$2 AND course_id=$3',[JSON.stringify(completed),req.practice.id,c.id]);
 res.json({completedLessons:completed});
}));
router.post('/courses/:id/quiz',practice,writeLimiter,asyncWrap(async(req,res)=>{
 const c=await enrolled(req.practice.id,req.params.id);
 must(c.quiz.length>0&&Array.isArray(c.quiz),400,'This course has no assessment.');
 must((c.completed_lessons||[]).length===c.lessons.length,403,'Complete the lessons before attempting the quiz.');
 const d=z.object({answers:z.array(z.number().int().min(-1).max(5)).max(30)}).parse(req.body);
 must(d.answers.length===c.quiz.length,400,'Answer every quiz item.');
 const correct=c.quiz.reduce((sum,q,i)=>sum+(d.answers[i]===q.answerIndex?1:0),0);
 const score=Math.round(correct/c.quiz.length*100);
 const q=await db.query(`INSERT INTO course_attempts(user_id,course_id,score,correct,total) VALUES($1,$2,$3,$4,$5) RETURNING id,submitted_at`,[req.practice.id,c.id,score,correct,c.quiz.length]);
 res.json({score,correct,total:c.quiz.length,submittedAt:q.rows[0].submitted_at,attemptId:q.rows[0].id});
}));
// Course authoring requires an authenticated, active teacher with that class assigned.
const teacherOwned=async(req)=>{const q=await db.query('SELECT * FROM courses WHERE id=$1 AND teacher_id=$2',[req.params.id,req.teacher.id]);must(q.rowCount,404,'Course not found.');return q.rows[0];};
const lesson=z.object({title:z.string().trim().min(2).max(140),body:z.string().trim().min(20).max(12000)});
const quiz=z.object({prompt:z.string().trim().min(4).max(350),options:z.array(z.string().trim().min(1).max(180)).length(4),answerIndex:z.number().int().min(0).max(3)});
const courseBody=z.object({title:z.string().trim().min(4).max(150),summary:z.string().max(800).default(''),language:z.enum(languages),className:z.enum(classes),lessons:z.array(lesson).min(1).max(20),quiz:z.array(quiz).min(1).max(20),resources:z.array(z.object({title:z.string().max(120),url:z.string().url().refine(x=>x.startsWith('https://'))})).max(8).default([])});
const canTeach=(t,cls)=>t.role==='admin'||t.assigned_classes?.includes(cls);
router.get('/teacher/courses',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query('SELECT c.*,t.name AS teacher_name FROM courses c JOIN teachers t ON t.id=c.teacher_id WHERE c.teacher_id=$1 ORDER BY c.created_at DESC LIMIT 100',[req.teacher.id]);
 res.json({courses:q.rows.map(c=>({...safeCourse(c),joinCode:'Only visible when initially created'}))});
}));
router.post('/teacher/courses',teacher,writeLimiter,asyncWrap(async(req,res)=>{
 const d=courseBody.extend({joinCode:z.string().trim().min(10).max(40)}).parse(req.body);
 must(canTeach(req.teacher,d.className),403,'Not assigned to this class.');
 const q=await db.query(`INSERT INTO courses(teacher_id,title,summary,language,class_name,lessons,quiz,resources,join_code_hash)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[req.teacher.id,d.title,d.summary,d.language,d.className,JSON.stringify(d.lessons),JSON.stringify(d.quiz),JSON.stringify(d.resources),passHash(d.joinCode)]);
 res.status(201).json({course:safeCourse(q.rows[0]),message:'Share the join code privately. It will not be shown again.'});
}));
router.put('/teacher/courses/:id',teacher,writeLimiter,asyncWrap(async(req,res)=>{
 const old=await teacherOwned(req);must(!old.published,409,'Published courses cannot be edited while students are enrolled. Create a new draft.');
 const d=courseBody.parse(req.body);must(canTeach(req.teacher,d.className),403,'Class not assigned.');
 const q=await db.query(`UPDATE courses SET title=$1,summary=$2,language=$3,class_name=$4,lessons=$5,quiz=$6,resources=$7,updated_at=now() WHERE id=$8 RETURNING *`,[d.title,d.summary,d.language,d.className,JSON.stringify(d.lessons),JSON.stringify(d.quiz),JSON.stringify(d.resources),old.id]);res.json({course:safeCourse(q.rows[0])});
}));
router.post('/teacher/courses/:id/publish',teacher,asyncWrap(async(req,res)=>{
 const c=await teacherOwned(req);await db.query('UPDATE courses SET published=true,updated_at=now() WHERE id=$1',[c.id]);res.json({published:true});
}));
router.get('/teacher/courses/:id/results',teacher,asyncWrap(async(req,res)=>{
 const c=await teacherOwned(req);
 const q=await db.query(`SELECT u.handle,u.class_name,e.completed_lessons,
 max(a.score)::int AS best_score,count(a.id)::int AS attempts,max(a.submitted_at) AS last_attempt
 FROM course_enrollments e JOIN practice_users u ON u.id=e.user_id
 LEFT JOIN course_attempts a ON a.user_id=e.user_id AND a.course_id=e.course_id
 WHERE e.course_id=$1 GROUP BY u.id,e.completed_lessons ORDER BY u.handle LIMIT 500`,[c.id]);
 res.json({course:safeCourse(c),students:q.rows});
}));
router.get('/teacher/community',teacher,asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT m.id,m.body,m.resource_url,m.created_at,t.name AS author
 FROM teacher_community_messages m JOIN teachers t ON t.id=m.teacher_id ORDER BY m.created_at DESC LIMIT 100`);
 res.json({messages:q.rows.reverse()});
}));
router.post('/teacher/community',teacher,writeLimiter,asyncWrap(async(req,res)=>{
 const d=z.object({body:z.string().trim().min(1).max(1000),resourceUrl:z.string().url().refine(x=>x.startsWith('https://')).optional()}).parse(req.body);
 const q=await db.query(`INSERT INTO teacher_community_messages(teacher_id,body,resource_url) VALUES($1,$2,$3) RETURNING id,body,resource_url,created_at`,[req.teacher.id,d.body,d.resourceUrl||null]);
 const message={...q.rows[0],author:req.teacher.name};
 // Broadcast only to connected, active, authorized teachers.
 const {getIo}=require('../services/events');const io=getIo();if(io)io.to('teachers:community').emit('teachers:message',message);
 res.status(201).json({message});
}));
router.delete('/teacher/community/:id',teacher,admin,asyncWrap(async(req,res)=>{
 const q=await db.query('DELETE FROM teacher_community_messages WHERE id=$1 RETURNING id',[req.params.id]);must(q.rowCount,404,'Message not found.');res.json({removed:true});
}));
router.get('/teacher/admin/teachers',teacher,admin,asyncWrap(async(req,res)=>{
 const q=await db.query('SELECT id,name,email,subject,role,assigned_classes,active,created_at FROM teachers ORDER BY created_at DESC LIMIT 300');res.json({teachers:q.rows});
}));
router.patch('/teacher/admin/teachers/:id',teacher,admin,asyncWrap(async(req,res)=>{
 const d=z.object({active:z.boolean().optional(),assignedClasses:z.array(z.string().max(40)).max(30).optional()}).refine(x=>Object.keys(x).length>0).parse(req.body);
 must(req.params.id!==req.teacher.id||d.active!==false,403,'Cannot disable your own administrator account.');
 const q=await db.query(`UPDATE teachers SET active=COALESCE($1,active),assigned_classes=COALESCE($2::jsonb,assigned_classes),updated_at=now() WHERE id=$3
 RETURNING id,name,email,role,active,assigned_classes`,[d.active??null,d.assignedClasses?JSON.stringify(d.assignedClasses):null,req.params.id]);must(q.rowCount,404,'Teacher not found.');res.json({teacher:q.rows[0]});
}));
module.exports=router;
