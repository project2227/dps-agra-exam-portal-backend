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
 for(const k of ['NODE_ENV','RENDER','RENDER_SERVICE_TYPE','DPS_DISPOSABLE_STAGE','UI_VISUAL_QA','DPS_PARENT_GATE_PASSED'])delete env[k];
 const r=spawnSync(process.execPath,['-e',script],{cwd:require('node:path').join(__dirname,'..'),env,encoding:'utf8',timeout:5000});
 assert.equal(r.status,0,r.stderr||r.error?.message);
 assert.match(r.stdout,/WAIT/);assert.match(r.stdout,/PASS/);
});
test('Render static builds gate even with development mode and a root-install parent flag',()=>{
 const script=`
 const assert=require('node:assert/strict');let requests=0;
 global.fetch=async()=>({ok:true,json:async()=>({deploymentAllowed:++requests>1})});
 global.setTimeout=fn=>setImmediate(fn);
 require('./scripts/frontend-deploy-window').gate().then(()=>assert.equal(requests,2)).catch(e=>{console.error(e);process.exitCode=1});`;
 const env={...process.env,NODE_ENV:'development',RENDER:'true',RENDER_SERVICE_TYPE:'static',DPS_PARENT_GATE_PASSED:'true',VITE_API_BASE_URL:'https://exam-api.example.invalid'};
 delete env.DPS_DISPOSABLE_STAGE;delete env.UI_VISUAL_QA;
 const r=spawnSync(process.execPath,['-e',script],{cwd:require('node:path').join(__dirname,'..'),env,encoding:'utf8',timeout:5000});
 assert.equal(r.status,0,r.stderr||r.error?.message);assert.match(r.stdout,/WAIT/);assert.match(r.stdout,/PASS/);
});
test('Render web build with unset NODE_ENV checks the database window before its child build',()=>{
 const script=`
 const assert=require('node:assert/strict');let requests=0,closed=false;
 const windowPath=require.resolve('./src/services/deploymentWindow'),dbPath=require.resolve('./src/config/db');
 require.cache[windowPath]={id:windowPath,filename:windowPath,loaded:true,exports:{deploymentWindow:async()=>({deploymentAllowed:++requests>1,activeOrSoon:1,calendarExams:0})}};
 require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{pool:{end:async()=>{closed=true}}}};
 global.setTimeout=fn=>setImmediate(fn);
 require('./scripts/deploy-window').gate().then(()=>{assert.equal(requests,2);assert.equal(closed,true)}).catch(e=>{console.error(e);process.exitCode=1});`;
 const env={...process.env,RENDER:'true',RENDER_SERVICE_TYPE:'web'};
 delete env.NODE_ENV;delete env.DPS_DISPOSABLE_STAGE;
 const r=spawnSync(process.execPath,['-e',script],{cwd:require('node:path').join(__dirname,'..'),env,encoding:'utf8',timeout:5000});
 assert.equal(r.status,0,r.stderr||r.error?.message);assert.match(r.stdout,/WAIT/);assert.match(r.stdout,/PASS/);
});
