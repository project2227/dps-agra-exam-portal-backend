'use strict';
const {z}=require('zod');const {env}=require('../config/env');const {must,HttpError}=require('../utils/http');
const languages=['python','java','cpp','c','javascript'];
const draftRequest=z.object({mode:z.enum(['generate','import']),className:z.string().trim().min(1).max(20),subject:z.string().trim().min(1).max(80),
 // The older PC gateway supports eight per inference. The portal queues single
 // questions with no total quota; retaining this bound keeps old clients compatible.
 topic:z.string().trim().max(1200).default(''),questionCount:z.number().int().min(1).max(8).optional(),
 questionTypes:z.array(z.enum(['mcq','short','long','code'])).min(1).max(4),language:z.enum(languages).optional(),sourceText:z.string().max(12000).default(''),
 sequence:z.object({position:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),previousPrompts:z.array(z.string().max(500)).max(6).default([])}).strict().optional()}).strict().superRefine((v,c)=>{
 if(v.sequence&&(v.questionCount!==1||(v.mode==='generate'&&new Set(v.questionTypes).size!==1)))c.addIssue({code:'custom',path:['questionCount'],message:'Sequential requests create one question at a time.'});
 if(v.mode==='generate'&&(!v.questionCount||v.questionCount<new Set(v.questionTypes).size))c.addIssue({code:'custom',path:['questionCount'],message:'Request at least one question per selected type.'});
 if(v.mode==='generate'&&!v.topic&&!v.sourceText.trim())c.addIssue({code:'custom',path:['topic'],message:'Describe the exam or add source text.'});
 if(v.mode==='import'&&!v.sourceText.trim())c.addIssue({code:'custom',path:['sourceText'],message:'Extract or paste the paper text first.'});
 if(v.questionTypes.includes('code')&&!v.language)c.addIssue({code:'custom',path:['language'],message:'Choose a practical language.'});
});
const generatedQuestion=z.object({type:z.enum(['mcq','short','long','code']),prompt:z.string().trim().min(1).max(5000),marks:z.number().finite().min(0).max(100),
 options:z.array(z.string().trim().min(1).max(600)).max(8),correctAnswer:z.number().int().nonnegative().nullable(),
 modelAnswer:z.string().max(4000),rubric:z.string().max(4000),language:z.enum(languages).nullable(),starterCode:z.string().max(20000),
 sourcePages:z.array(z.number().int().positive()).max(40)}).strict().superRefine((q,c)=>{
 if(q.type==='mcq'&&(q.options.length<2||new Set(q.options).size!==q.options.length||(q.correctAnswer!==null&&q.correctAnswer>=q.options.length)))c.addIssue({code:'custom',message:'Invalid MCQ options or key.'});
 if(q.type!=='mcq'&&(q.options.length||q.correctAnswer!==null))c.addIssue({code:'custom',message:'Unexpected answer options.'});
 if(q.type==='code'&&!q.language)c.addIssue({code:'custom',message:'Missing practical language.'});
 if(q.type!=='code'&&q.language!==null)c.addIssue({code:'custom',message:'Unexpected language.'});
});
const draftResponse=z.object({title:z.string().trim().min(1).max(180),questions:z.array(generatedQuestion).min(1).max(8),
 warnings:z.array(z.string().max(1600)).max(30),needsTeacherReview:z.literal(true),status:z.literal('draft')}).strict();
const gradeResponse=z.object({verdict:z.enum(['correct','partially_correct','incorrect','needs_review']),suggestedMarks:z.number().finite().min(0).nullable(),
 explanation:z.string().max(8000),rubricChecks:z.array(z.string().max(2000)).max(30),needsTeacherReview:z.literal(true),finalGrade:z.literal(false)}).strict();
function gatewayUrl(){
 if(!env.DPS_AI_GATEWAY_URL||!env.DPS_AI_GATEWAY_KEY)return null;
 let url;try{url=new URL(env.DPS_AI_GATEWAY_URL)}catch{return null;}
 const localTest=(env.NODE_ENV==='test'||process.env.DPS_DISPOSABLE_STAGE==='true')&&url.protocol==='http:'&&url.hostname==='127.0.0.1';
 if((url.protocol!=='https:'&&!localTest)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))return null;
 return url.origin;
}
async function boundedJson(response){
 must(response.body,502,'The AI gateway returned an empty response.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;
  must(size<=128000,502,'The AI response was too large. Try fewer questions.');chunks.push(value);
 }return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 catch(e){await reader.cancel().catch(()=>{});if(e.status)throw e;throw new HttpError(502,'The AI response could not be read. Try again.');}
}
async function callGateway(path,payload){
 const origin=gatewayUrl();must(origin,503,'AI is not configured yet. Set the private gateway URL and key on the exam API server.');
 const body=payload?JSON.stringify(payload):undefined;
 must(!body||Buffer.byteLength(body)<=18000,400,'The source is too long for this model request. Choose a smaller section or shorten the text.');
 try{
  const response=await fetch(origin+path,{method:payload?'POST':'GET',redirect:'error',headers:{Authorization:'Bearer '+env.DPS_AI_GATEWAY_KEY,...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body}:{}),signal:AbortSignal.timeout(payload?145000:8000)});
  if(response.status===429)throw new HttpError(429,'The school AI is busy. Wait a minute, then try again.');
  if([401,403].includes(response.status))throw new HttpError(503,'The AI gateway key does not match. Ask the portal administrator to check the private Render setting.');
  if([400,413,415].includes(response.status))throw new HttpError(400,'The AI request was rejected. Shorten the source text and check the selected question types.');
  must(response.ok,503,'The local AI could not complete this request. Keep Ollama, the gateway and Cloudflare running, then try again.');
  return await boundedJson(response);
 }catch(e){if(e.status)throw e;throw new HttpError(503,'Cannot reach the local AI. Keep your PC, Ollama, the gateway and Cloudflare running, then try again.');}
}
async function status(){
 if(!gatewayUrl())return {configured:false,ready:false,message:'AI setup is incomplete. Add the gateway URL and private key to the exam API server.'};
 try{const h=await callGateway('/health');const ready=h.gatewayReady===true&&h.modelInstalled===true;
  return {configured:true,ready,busy:h.busy===true,model:typeof h.model==='string'?h.model.slice(0,80):'',message:ready?'Local AI is connected.': 'Install the selected model in Ollama on the gateway PC.'};
 }catch(e){return {configured:true,ready:false,message:e.message};}
}
async function draft(input){
 const request=draftRequest.parse(input);request.questionTypes=[...new Set(request.questionTypes)];
 const {sequence,...gatewayRequest}=request;
 // Import counts are a portal-side cap. The existing PC gateway interprets a
 // supplied count as exact, which would reject shorter question papers.
 if(request.mode==='import'&&!sequence)delete gatewayRequest.questionCount;
 if(sequence){
  const instruction=request.mode==='import'
   ? 'Import ONLY original question '+sequence.position+' from the supplied paper, with its original type and provided answer key. Do not invent missing questions or answers. '
   : 'Generate exactly ONE '+request.questionTypes[0]+' question, number '+sequence.position+' in the exam. Vary the concept and example from earlier questions. ';
  const prior=sequence.previousPrompts.length?' Avoid repeating earlier prompts: '+sequence.previousPrompts.map(p=>p.slice(0,110)).join(' | '):'';
  const topic=request.topic.slice(0,Math.min(650,1200-instruction.length));
  gatewayRequest.topic=(instruction+topic+prior).slice(0,1200);
 }else if(request.mode==='generate'&&request.questionTypes.length===1){
  const instruction='Generate exactly '+request.questionCount+' '+request.questionTypes[0]+' questions only for this part of the exam. ';
  gatewayRequest.topic=instruction+request.topic.slice(0,1200-instruction.length);
 }
 const raw=await callGateway('/v1/exams/draft',gatewayRequest),parsed=draftResponse.safeParse(raw);
 must(parsed.success,502,'The model returned an invalid exam draft. Try a smaller request. Nothing has been saved.');
 const result=parsed.data;
 if(sequence)must(result.questions.length===1,502,'The model did not return one question. Your earlier previews are unchanged; try again.');
 // Legacy imports may request a smaller preview, but there is no five-question cap.
 if(request.mode==='import'&&!sequence&&request.questionCount&&result.questions.length>request.questionCount){
  result.questions=result.questions.slice(0,request.questionCount);
  result.warnings=[...result.warnings,'Only the first '+request.questionCount+' questions were imported. Select the remaining source questions for your next request.'].slice(-30);
 }
 if(request.mode==='generate'){
  must(result.questions.length===request.questionCount,502,'The model returned the wrong number of questions. Try again. Nothing has been saved.');
  must(result.questions.every(q=>request.questionTypes.includes(q.type))&&request.questionTypes.every(type=>result.questions.some(q=>q.type===type)),502,'The model missed a requested question type. Try again.');
 }
 if(sequence&&request.mode==='import')must(result.questions.every(q=>request.questionTypes.includes(q.type)),502,'This source question has a different type. Select its type and try again.');
 const sourcePages=new Set([...request.sourceText.matchAll(/\[Page (\d+)\]/g)].map(m=>Number(m[1])));
 must(result.questions.every(q=>q.sourcePages.every(p=>sourcePages.has(p))),502,'The model cited a page outside the supplied source. Try again.');
 return result;
}
async function suggest(question,answer){
 const raw=await callGateway('/v1/grades/suggest',{rubricApproved:true,question,answer}),parsed=gradeResponse.safeParse(raw);
 must(parsed.success,502,'The model returned an invalid marking suggestion. Mark this answer manually or try again.');
 const result=parsed.data;
 must((result.suggestedMarks==null||result.suggestedMarks<=question.marks)&&(result.verdict!=='needs_review'||result.suggestedMarks===null),502,'The model returned marks outside the rubric. Mark this answer manually.');
 return result;
}
module.exports={gatewayUrl,status,draft,suggest,draftRequest,draftResponse,gradeResponse};
