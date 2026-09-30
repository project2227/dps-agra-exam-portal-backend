'use strict';
const express=require('express');const cors=require('cors');const helmet=require('helmet');
const rateLimit=require('express-rate-limit');const {env,origins}=require('./config/env');
const db=require('./config/db');const {publicError}=require('./utils/http');
const app=express();app.set('trust proxy',1);
app.disable('x-powered-by');app.use(helmet());
app.use(cors({origin(origin,cb){if(!origin||origins.includes(origin))return cb(null,true);return cb(null,false);},methods:['GET','POST','PUT','DELETE','OPTIONS']}));
app.use(express.json({limit:'96kb'}));
app.use('/api',rateLimit({windowMs:60000,limit:4000,standardHeaders:'draft-7',legacyHeaders:false}));
app.get('/api/health',async(req,res)=>{
 try {await db.query('SELECT 1');res.json({ok:true,service:'dps-agra-exam-portal',database:'connected',version:'2.0.0-learning-staging'});}
 catch {res.status(503).json({ok:false,service:'dps-agra-exam-portal',database:'unavailable'});}
});
app.use('/api/auth',require('./routes/auth.routes'));
app.use('/api/learning',require('./routes/learning.routes'));

app.use('/api/teacher',require('./routes/teacher.routes'));
app.use('/api/teacher',require('./routes/exam.routes'));
app.use('/api',require('./routes/student.routes'));
app.use('/api/code',require('./routes/code.routes'));
app.use('/api',require('./routes/handout.routes'));
app.use('/api',require('./routes/examDate.routes'));
app.use('/api',require('./routes/proctor.routes'));
app.use('/api/teacher',require('./routes/submission.routes'));
app.use((req,res)=>res.status(404).json({error:'Route not found.'}));
app.use((err,req,res,next)=>{
 if(err instanceof require('multer').MulterError)return res.status(400).json({error:'File too large or invalid upload.'});
 return publicError(err,req,res,next);
});
module.exports={app};
