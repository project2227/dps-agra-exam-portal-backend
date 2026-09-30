'use strict';
const express=require('express');
const crypto=require('node:crypto');
const jwt=require('jsonwebtoken');
const rateLimit=require('express-rate-limit');
const {env}=require('../config/env');
const {teacher,student}=require('../middleware/auth');
const {asyncWrap}=require('../utils/http');
const router=express.Router();
const standby=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
// Each authenticated user receives short-lived TURN credentials, never the
// Cloudflare secret TURN key. A private endpoint must not be publicly cached.
const limit=rateLimit({
 windowMs:30*60*1000,limit:18,standardHeaders:'draft-7',legacyHeaders:false,
 keyGenerator:req=>{
  const bearer=String(req.headers.authorization||'');
  return bearer.startsWith('Bearer ')?crypto.createHash('sha256').update(bearer).digest('hex'):'unauthenticated';
 }
});
async function auth(req,res,next){
 const bearer=String(req.headers.authorization||'').match(/^Bearer (.+)$/i)?.[1];
 if(!bearer)return res.status(401).json({error:'Exam or teacher authentication required.'});
 try {
  const t=jwt.verify(bearer,env.JWT_SECRET,{issuer:'dps-exam'});
  if(t.kind==='teacher')return teacher(req,res,next);
 }catch{}
 return student(req,res,next);
}
router.get('/ice',limit,auth,asyncWrap(async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 if(!env.TURN_KEY_ID||!env.TURN_KEY_API_TOKEN)
  return res.json({iceServers:standby,relay:false,message:'TURN not configured; using free STUN only.'});
 const url='https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(env.TURN_KEY_ID)+'/credentials/generate-ice-servers';
 let response;
 try{
  response=await fetch(url,{
   method:'POST',
   headers:{Authorization:'Bearer '+env.TURN_KEY_API_TOKEN,'Content-Type':'application/json'},
   body:JSON.stringify({ttl:28800}),
   signal:AbortSignal.timeout(8000)
  });
 }catch{
  return res.status(503).json({error:'TURN provider unreachable. Retry the peer connection shortly.'});
 }
 if(!response.ok)return res.status(503).json({error:'TURN provider unavailable. Check backend TURN configuration.'});
 const data=await response.json();
 if(!Array.isArray(data.iceServers)||data.iceServers.length<1)
  return res.status(503).json({error:'TURN provider returned an invalid response.'});
 const safe=data.iceServers.filter(server=>Array.isArray(server.urls)&&server.urls.every(url=>typeof url==='string'&&/^(stun|turn|turns):/.test(url))).slice(0,6)
  .map(server=>({...server,urls:server.urls.filter(url=>!/:53(?:\?|$)/.test(url))}));
 const relay=safe.some(server=>server.urls.some(url=>/^turns?:/.test(url)));
 if(!relay)return res.status(503).json({error:'TURN provider supplied no usable relay.'});
 return res.json({iceServers:safe,relay:true,expiresIn:28800});
}));
module.exports=router;
