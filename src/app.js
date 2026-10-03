'use strict';
const express=require('express');const cors=require('cors');const helmet=require('helmet');
const rateLimit=require('express-rate-limit');const {env,origins}=require('./config/env');
const db=require('./config/db');const {publicError}=require('./utils/http');
const app=express();app.set('trust proxy',1);
app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:{directives:{
 scriptSrc:["'self'",'https://cdn.jsdelivr.net','https://cdnjs.cloudflare.com',"'wasm-unsafe-eval'"],
 styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com','data:'],
 imgSrc:["'self'",'data:','blob:','https:'],mediaSrc:["'self'",'blob:'],workerSrc:["'self'",'blob:'],
 connectSrc:["'self'",'https:','wss:'],frameSrc:["'self'",'blob:']
}}}));
app.use(cors({origin(origin,cb){if(!origin||(require('./platform/context').enabled()?require('./platform/tenancy').corsOrigin(origin):origins.includes(origin)))return cb(null,true);return cb(null,false);},credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS']}));
app.use(require('./platform/tenancy').middleware);
app.get('/preview-sandbox',require('./services/previewSandbox').previewSandbox);
app.use(express.json({limit:'96kb'}));
app.use('/api',rateLimit({windowMs:60000,limit:4000,standardHeaders:'draft-7',legacyHeaders:false}));
app.get('/api/health',async(req,res)=>{
 try {await (require('./platform/context').enabled()?db.platformQuery:db.query)('SELECT 1');res.json({ok:true,service:require('./platform/context').enabled()?'plinth':'dps-agra-exam-portal',database:'connected',version:'4.0.0',release:require('./platform/context').enabled()?'plinth-v1':'student-accounts-v1'});}
 catch {res.status(503).json({ok:false,service:'dps-agra-exam-portal',database:'unavailable'});}
});
if(require('./platform/context').enabled()){
 app.use('/api/platform',require('./routes/platform.routes'));
 app.use('/api/site',require('./routes/site.routes'));
 app.use('/api/erp',require('./routes/erp.routes'));
 app.use('/api/workplace',require('./routes/workplace.routes'));
 app.use('/api/chat',require('./routes/chat.routes'));
}
app.use('/api/auth',require('./routes/auth.routes'));
app.use('/api/accounts',require('./routes/accounts.routes'));
app.use('/api/staff-access',require('./routes/staffAccess.routes'));
app.use('/api/rtc',require('./routes/rtc.routes'));
app.use('/api/learning',require('./routes/learning.routes'));
app.use('/api/admin/data',require('./routes/adminData.routes'));
app.use('/api',require('./routes/incident.routes'));

app.use('/api/teacher',require('./routes/teacher.routes'));
app.use('/api/teacher',require('./routes/exam.routes'));
app.use('/api',require('./routes/student.routes'));
app.use('/api/code',require('./routes/code.routes'));
app.use('/api',require('./routes/handout.routes'));
app.use('/api',require('./routes/examDate.routes'));
app.use('/api',require('./routes/proctor.routes'));
app.use('/api/teacher',require('./routes/submission.routes'));
const fs=require('fs'),path=require('path');const frontendDir=path.resolve(__dirname,'../frontend/dist');
if(fs.existsSync(path.join(frontendDir,'index.html'))){
 app.use(express.static(frontendDir,{index:false}));
 app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/'))return next();let head='<meta name="dps-self-hosted" content="true">';
  if(require('./platform/context').enabled()){
   const tenant=req.tenant?require('./routes/platform.routes').publicTenant(req.tenant):null;
   const payload=JSON.stringify({enabled:true,tenant,base:req.siteBase||''}).replace(/</g,'\\u003c');
   head+='<script id="plinth-site" type="application/json">'+payload+'</script>';
  }
  res.set('Cache-Control','no-store').type('html').send(fs.readFileSync(path.join(frontendDir,'index.html'),'utf8').replace('<head>','<head>'+head));});
}
app.use((req,res)=>res.status(404).json({error:'Route not found.'}));
app.use((err,req,res,next)=>{
 if(err instanceof require('multer').MulterError)return res.status(400).json({error:'File too large or invalid upload.'});
 return publicError(err,req,res,next);
});
module.exports={app};
