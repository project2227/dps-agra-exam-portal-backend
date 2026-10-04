'use strict';
const express=require('express'),rateLimit=require('express-rate-limit');
const {z}=require('zod');const db=require('../config/db');
const auth=require('../platform/auth');const work=require('../platform/workplace');
const service=require('../platform/productivity');const {currentTenant}=require('../platform/context');
const {asyncWrap,must}=require('../utils/http');
const router=express.Router();router.use(auth.requireUser());
router.use((req,res,next)=>{const t=currentTenant();if(t.path!=='workplace'||!t.features.includes('monitoring'))return res.status(403).json({error:'Work progress is not enabled on this site.'});next();});
const limit=rateLimit({windowMs:60000,limit:12,keyGenerator:req=>req.actor.id,standardHeaders:'draft-7',legacyHeaders:false});
router.post('/sessions/:id/activity',limit,asyncWrap(async(req,res)=>{
 const v=z.object({mode:z.enum(['writing','reading','meeting']),source:z.enum(['browser','desktop']),inputEvents:z.number().int().min(0).max(2000),edits:z.number().int().min(0).max(10000),repeats:z.number().int().min(0).max(2000),idleSeconds:z.number().int().min(0).max(86400)}).strict().parse(req.body);
 res.json(await service.observe(req.actor,z.string().uuid().parse(req.params.id),v));
}));
router.post('/summaries',limit,asyncWrap(async(req,res)=>{
 const v=z.object({taskId:z.string().uuid(),summary:z.string().trim().min(10).max(3000),aiConsent:z.boolean().default(false)}).strict().parse(req.body);
 const q=await db.query('SELECT * FROM work_tasks WHERE id=$1 AND assignee_id=$2',[v.taskId,req.actor.id]);must(q.rowCount,404,'Choose a task assigned to you.');const task=q.rows[0];
 await work.teamAccess(req.actor,task.team_id);
 const review=v.aiConsent?await service.reviewSummary(task.title+'\n'+task.description,v.summary):null;
 const note=(await db.query('INSERT INTO work_progress_notes(user_id,team_id,task_id,summary,ai_consent,ai_review) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,created_at',[req.actor.id,task.team_id,task.id,v.summary,v.aiConsent,review?JSON.stringify(review):null])).rows[0];
 res.status(201).json({note,review});
}));
function range(req){const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);const to=date.parse(req.query.to||new Date().toISOString().slice(0,10));const from=date.parse(req.query.from||new Date(Date.now()-6*86400000).toISOString().slice(0,10));const span=Date.parse(to)-Date.parse(from);must(Number.isFinite(span)&&span>=0&&span<=366*86400000,400,'Choose a valid report range of up to one year.');return {from,to};}
router.get('/report',asyncWrap(async(req,res)=>{const r=range(req);res.json({rows:await service.report(req.actor,r.from,r.to),from:r.from,to:r.to,timezone:'UTC',aiConnected:!!process.env.LOCAL_AI_GATEWAY_URL&&!!process.env.LOCAL_AI_GATEWAY_KEY});}));
router.get('/export.csv',asyncWrap(async(req,res)=>{
 const r=range(req);res.type('text/csv').set('Content-Disposition','attachment; filename="plinth-work-progress-'+r.from+'-'+r.to+'.csv"');
 const fields=['employee_id','name','day','estimated_engaged_hours','observed_seconds','editing_seconds','interaction_seconds','reading_seconds','meeting_seconds','idle_seconds','unknown_seconds','input_events','repeats','tasks','summaries','ai_review_flags','work_summaries','sources','confidence','limitation'];res.write(fields.join(',')+'\r\n');
 const {once}=require('node:events');
 for(let offset=0;!res.destroyed;offset+=200){const rows=await service.report(req.actor,r.from,r.to,{offset,limit:200});if(!rows.length)break;for(const row of rows){if(!res.write(fields.map(k=>service.csvCell(row[k] instanceof Date?row[k].toISOString().slice(0,10):row[k])).join(',')+'\r\n'))await once(res,'drain');}}
 res.end();
}));
module.exports=router;
