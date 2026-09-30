'use strict';
const {env}=require('../config/env');const {must,HttpError}=require('../utils/http');
const LANGUAGES={python:71,java:62,cpp:54,c:50,javascript:63};
function runnerConfig(){must(env.JUDGE0_API_URL,503,'The isolated code runner is not configured.');
 const url=new URL(env.JUDGE0_API_URL);must(url.protocol==='https:',503,'Isolated runner must use HTTPS.');
 return url.toString().replace(/\/$/,'');}
const safeError=()=>new HttpError(502,'Isolated code runner temporarily unavailable.');
async function request(route,method,body){
 const base=runnerConfig();const headers={'Content-Type':'application/json'};
 if(env.JUDGE0_API_KEY)headers['X-RapidAPI-Key']=env.JUDGE0_API_KEY;
 if(env.JUDGE0_API_HOST)headers['X-RapidAPI-Host']=env.JUDGE0_API_HOST;
 if(env.JUDGE0_AUTH_TOKEN)headers['X-Auth-Token']=env.JUDGE0_AUTH_TOKEN;
 const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),15000);
 try{const r=await fetch(base+route,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:ctrl.signal});
  if(!r.ok)throw safeError();return r.json();
 }catch(e){if(e.status)throw e;throw safeError();}finally{clearTimeout(timeout);}
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function runOne({code,language,stdin='',expectedOutput=''}){
 must(typeof code==='string'&&code.length<=20000,400,'Code exceeds 20,000 characters.');
 must(Object.hasOwn(LANGUAGES,language),400,'Unsupported programming language.');
 must(stdin.length<=2048&&expectedOutput.length<=2048,400,'Test case is too large.');
 const job=await request('/submissions?base64_encoded=false&wait=false','POST',{
  language_id:LANGUAGES[language],source_code:code,stdin,expected_output:expectedOutput,
  cpu_time_limit:2,memory_limit:65536,wall_time_limit:5,max_file_size:256
 });
 must(typeof job.token==='string',502,'Runner did not return a job token.');
 for(let i=0;i<13;i++){
  await delay(500);
  const result=await request(`/submissions/${encodeURIComponent(job.token)}?base64_encoded=false&fields=stdout,stderr,compile_output,status,time,memory`,'GET');
  if(!Number.isInteger(Number(result.status?.id)))throw safeError();
  if(Number(result.status?.id)<=2)continue;
  return {passed:result.status?.id===3,status:result.status?.description||'Unknown',
   stdout:String(result.stdout||'').slice(0,3000),stderr:String(result.stderr||result.compile_output||'').slice(0,3000),
   time:result.time,memory:result.memory};
 }
 throw new HttpError(504,'Runner timed out; try again later.');
}
async function runTests({code,language,tests,hidden=false}){
 must(Array.isArray(tests)&&tests.length<=8,400,'Too many test cases.');
 const results=[];
 for(let i=0;i<tests.length;i++){
  const tc=tests[i];
  const r=await runOne({code,language,stdin:String(tc.stdin??''),expectedOutput:String(tc.expectedOutput??'')});
  results.push(hidden?{test:i+1,passed:r.passed,status:r.status}:
   {test:i+1,...r,expectedOutput:String(tc.expectedOutput??'')});
 }
 return {passed:results.filter(x=>x.passed).length,total:results.length,results};
}
module.exports={LANGUAGES,runOne,runTests};
