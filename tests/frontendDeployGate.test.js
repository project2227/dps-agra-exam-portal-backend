'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('static frontend build with unset NODE_ENV waits until the exam window is clear',()=>{
 const script=`
 const assert=require('node:assert/strict');
 let requests=0;
 global.fetch=async url=>{
  assert.equal(url,'https://exam-api.example.invalid/api/deployment-window');
  requests++;
  return {ok:true,json:async()=>({deploymentAllowed:requests>1,recheckAfter:'2026-10-05T14:00:00Z'})};
 };
 global.setTimeout=fn=>setImmediate(fn);
 require('./scripts/frontend-deploy-window').gate().then(()=>assert.equal(requests,2)).catch(e=>{console.error(e);process.exitCode=1});
 `;
 const env={...process.env,VITE_API_BASE_URL:'https://exam-api.example.invalid'};
 for(const k of ['NODE_ENV','DPS_DISPOSABLE_STAGE','UI_VISUAL_QA','DPS_PARENT_GATE_PASSED'])delete env[k];
 const r=spawnSync(process.execPath,['-e',script],{cwd:require('node:path').join(__dirname,'..'),env,encoding:'utf8',timeout:5000});
 assert.equal(r.status,0,r.stderr||r.error?.message);
 assert.match(r.stdout,/WAIT/);assert.match(r.stdout,/PASS/);
});
