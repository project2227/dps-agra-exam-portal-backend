'use strict';
const express=require('express');const cors=require('cors');const helmet=require('helmet');
const rateLimit=require('express-rate-limit');const {env,origins}=require('./config/env');
const db=require('./config/db');const {publicError}=require('./utils/http');
const app=express();app.set('trust proxy',1);
app.disable('x-powered-by');app.use(helmet());
app.use(cors({origin(origin,cb){if(!origin||origins.includes(origin))return cb(null,true);return cb(null,false);},credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS']}));
app.use('/api/teacher/exam-drafts',express.json({limit:'2mb'}));
app.use('/api/learning/teacher/courses',express.json({limit:'2mb'}));
app.use(express.json({limit:'96kb'}));
app.use('/api',rateLimit({windowMs:60000,limit:4000,standardHeaders:'draft-7',legacyHeaders:false}));
app.get('/api/health',async(req,res)=>{
 try {await db.query('SELECT 1');res.json({ok:true,service:'dps-agra-exam-portal',database:'connected',version:'3.0.0-accounts',release:'student-accounts-v1',examFeatures:'local-ai-drafts-v1'});}
 catch {res.status(503).json({ok:false,service:'dps-agra-exam-portal',database:'unavailable'});}
});
app.get('/api/deployment-window',rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}),async(req,res,next)=>{
 try{res.set('Cache-Control','no-store');res.json(await require('./services/deploymentWindow').deploymentWindow());}catch(e){next(e);}
});
app.use('/api/auth',require('./routes/auth.routes'));
app.use('/api/accounts',require('./routes/accounts.routes'));
app.use('/api/staff-access',require('./routes/staffAccess.routes'));
app.use('/api/rtc',require('./routes/rtc.routes'));
app.use('/api/learning',require('./routes/learning.routes'));
app.use('/api/admin/data',require('./routes/adminData.routes'));
app.use('/api',require('./routes/incident.routes'));

app.use('/api/teacher',require('./routes/teacher.routes'));
app.use('/api/teacher',require('./routes/examDraft.routes'));
app.use('/api/teacher',require('./routes/examAi.routes'));
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
 app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/'))return next();res.set('Cache-Control','no-store').type('html').send(fs.readFileSync(path.join(frontendDir,'index.html'),'utf8').replace('<head>','<head><meta name="dps-self-hosted" content="true">'));});
}
app.use((req,res)=>res.status(404).json({error:'Route not found.'}));
app.use((err,req,res,next)=>{
 if(err instanceof require('multer').MulterError)return res.status(400).json({error:'File too large or invalid upload.'});
 return publicError(err,req,res,next);
});
module.exports={app};
