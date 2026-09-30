'use strict';
// Requested staff access is deliberately separate from authenticated staff.
// A request does not prove identity or grant any permissions.
const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../config/db');
const { teacher, admin } = require('../middleware/auth');
const { asyncWrap, must } = require('../utils/http');
const { audit } = require('../services/audit');
const router = express.Router();
const classes = ['VI','VII','VIII','IX','X','XI','XII'];
const requestLimit = rateLimit({ windowMs: 60*60*1000, limit: 3, standardHeaders: 'draft-7', legacyHeaders: false });
const adminLimit = rateLimit({ windowMs: 60*1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const publicSchema = z.object({
 name: z.string().trim().min(2).max(120),
 email: z.string().trim().toLowerCase().email().max(200),
 subject: z.string().trim().min(2).max(90).default('Computers'),
 requestedClasses: z.array(z.enum(classes)).max(classes.length).default([]),
 message: z.string().trim().max(400).default(''),
 // Honeypot: ordinary visitors never fill this field.
 website: z.string().max(200).optional()
});
router.post('/request', requestLimit, asyncWrap(async(req,res)=>{
 const data = publicSchema.parse(req.body);
 // Do not disclose if someone already has a staff account or another request.
 if (!data.website) {
  await db.query(`INSERT INTO teacher_access_requests(name,email,subject,requested_classes,message)
   SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS(SELECT 1 FROM teachers WHERE email=$2)
   ON CONFLICT DO NOTHING`,[
    data.name,data.email,data.subject,JSON.stringify(data.requestedClasses),data.message
   ]);
 }
 res.status(202).json({received:true,message:'Request received, if eligible. Only an authorized portal administrator may approve it. This is an independent student-built prototype.'});
}));
router.get('/admin/requests', teacher, admin, asyncWrap(async(req,res)=>{
 const q=await db.query(`SELECT id,name,email,subject,requested_classes,message,created_at
 FROM teacher_access_requests WHERE status='pending'
 ORDER BY created_at ASC LIMIT 150`);
 res.json({requests:q.rows});
}));
const approval = z.object({
 assignedClasses: z.array(z.enum(classes)).max(classes.length).default([])
});
router.post('/admin/requests/:id/approve',teacher,admin,adminLimit,asyncWrap(async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);
 const d=approval.parse(req.body || {});
 const password=crypto.randomBytes(24).toString('base64url');
 const hash=await bcrypt.hash(password,12);
 const approved=await db.transaction(async client=>{
  const pending=await client.query(`SELECT * FROM teacher_access_requests
    WHERE id=$1 AND status='pending' FOR UPDATE`,[id]);
  must(pending.rowCount,404,'Pending request not found.');
  const item=pending.rows[0];
  const created=await client.query(`INSERT INTO teachers(name,email,password_hash,subject,assigned_classes,role)
   VALUES($1,$2,$3,$4,$5,'teacher') ON CONFLICT(email) DO NOTHING
   RETURNING id,name,email,subject,assigned_classes,role`,[
    item.name,item.email,hash,item.subject,JSON.stringify(d.assignedClasses)
  ]);
  must(created.rowCount,409,'Staff email already has an account. Decline this request if it is a duplicate.');
  await client.query(`UPDATE teacher_access_requests SET
   status='approved',teacher_id=$1,reviewed_by=$2,reviewed_at=now()
   WHERE id=$3`,[created.rows[0].id,req.teacher.id,id]);
  return created.rows[0];
 });
 await audit({teacherId:req.teacher.id,action:'teacher:approve-access-request',details:{teacherId:approved.id}}).catch(err=>console.warn('[audit] teacher request audit failed',err.code || 'unknown'));
 // Never persist, email automatically, or log this temporary password.
 // It is returned exactly once over the authorized HTTPS administrator API.
 res.status(201).json({teacher:approved,temporaryPassword:password,message:'Share this temporary password privately. Ask the teacher to change it immediately from My Account.'});
}));
router.post('/admin/requests/:id/decline',teacher,admin,adminLimit,asyncWrap(async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);
 const q=await db.query(`UPDATE teacher_access_requests
 SET status='declined',reviewed_by=$1,reviewed_at=now()
 WHERE id=$2 AND status='pending' RETURNING id`,[req.teacher.id,id]);
 must(q.rowCount,404,'Pending request not found.');
 await audit({teacherId:req.teacher.id,action:'teacher:decline-access-request',details:{requestId:id}}).catch(err=>console.warn('[audit] teacher request audit failed',err.code || 'unknown'));
 res.json({declined:true});
}));
module.exports=router;
