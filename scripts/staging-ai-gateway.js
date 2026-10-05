'use strict';
// Deterministic protocol fixture, never an actual AI model. Available only in
// an explicitly disposable staging process with a loopback bind.
const http=require('node:http');
async function startStagingGateway(key){
 if(process.env.DPS_DISPOSABLE_STAGE!=='true')throw Error('A disposable staging environment is required.');
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.headers.authorization!=='Bearer '+key){res.statusCode=401;return res.end('{}');}
  if(req.url==='/health')return res.end(JSON.stringify({gatewayReady:true,modelInstalled:true,model:'synthetic-stage-model',busy:false}));
  let body='';for await(const bytes of req){body+=bytes;if(body.length>20000){res.statusCode=413;return res.end('{}');}}
  let p;try{p=JSON.parse(body)}catch{res.statusCode=400;return res.end('{}');}
  if(req.url==='/v1/exams/draft'){
   const types=p.questionTypes||['mcq'],count=p.questionCount||types.length;
   const page=Number(p.sourceText?.match(/\[Page (\d+)\]/)?.[1]);
   const offset=Number(p.topic?.match(/(?:question, number|original question) (\d+)/)?.[1])||1;
   const questions=Array.from({length:count},(_,i)=>{const type=types[i%types.length];return {
    type,prompt:type==='mcq'?'Synthetic question '+(offset+i)+': What is 2 + 2?':type==='code'?'Synthetic question '+(offset+i)+': Write a function that adds two numbers.':'Synthetic question '+(offset+i)+': Explain Python lists.',
    marks:type==='mcq'?1:5,options:type==='mcq'?['4','5']:[],correctAnswer:type==='mcq'?0:null,modelAnswer:'',rubric:type==='mcq'?'':'Synthetic rubric for staging verification only.',
    language:type==='code'?p.language||'python':null,starterCode:'',sourcePages:page?[page]:[]};});
   return res.end(JSON.stringify({title:'Synthetic staging assessment',questions,warnings:['This is a synthetic protocol fixture. No AI inference was performed.'],needsTeacherReview:true,status:'draft'}));
  }
  if(req.url==='/v1/grades/suggest')return res.end(JSON.stringify({verdict:'needs_review',suggestedMarks:null,explanation:'Synthetic staging response. This fixture does not assess answers.',rubricChecks:[],needsTeacherReview:true,finalGrade:false}));
  res.statusCode=404;res.end('{}');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));server.unref();return 'http://127.0.0.1:'+server.address().port;
}
module.exports={startStagingGateway};
