'use strict';
// Build-time gate: runs before the production container is replaced, without
// migrating or modifying the current database. Failure keeps the old build live.
async function gate(){
 const renderWeb=process.env.RENDER==='true'&&process.env.RENDER_SERVICE_TYPE==='web';
 if((process.env.NODE_ENV!=='production'&&!renderWeb)||process.env.DPS_DISPOSABLE_STAGE==='true')return console.log('[deployment gate] Non-production build; schedule gate skipped.');
 const {deploymentWindow}=require('../src/services/deploymentWindow'),{pool}=require('../src/config/db');
 const deadline=Date.now()+45*60000;
 try{for(;;){
  const result=await deploymentWindow();
  if(result.deploymentAllowed){console.log('[deployment gate] PASS no live or upcoming exams within 3 hours, calendar checked.');return;}
  console.log('[deployment gate] WAIT activeOrSoon='+result.activeOrSoon+' calendarExams='+result.calendarExams+' recheckAfter='+result.recheckAfter);
  if(Date.now()>deadline)throw Error('Deployment window remained closed. The previous build stays live. Retry after the reported exam window.');
  await new Promise(r=>setTimeout(r,30000));
 }}finally{await pool.end();}
}
if(require.main===module)gate().catch(e=>{console.error('[deployment gate] BLOCKED '+(e.code||e.message));process.exitCode=1;});
module.exports={gate};
