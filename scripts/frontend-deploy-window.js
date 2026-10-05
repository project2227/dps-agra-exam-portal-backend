'use strict';
async function gate(){
 // Static-site build environments can leave NODE_ENV unset until Vite starts.
 if(['development','test'].includes(process.env.NODE_ENV)||process.env.DPS_DISPOSABLE_STAGE==='true'||process.env.UI_VISUAL_QA==='true'||process.env.DPS_PARENT_GATE_PASSED==='true')return;
 const base=(process.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
 // Self-hosted builds have the database gate in the parent build. An explicit
 // API origin means this is a separate static-site deployment.
 if(!base)return;
 const deadline=Date.now()+45*60000;
 for(;;){
  try{
   const r=await fetch(base+'/api/deployment-window',{signal:AbortSignal.timeout(15000)});
   if(r.ok){const result=await r.json();if(result.deploymentAllowed===true){console.log('[frontend deployment gate] PASS API ready and exam window clear.');return;}
    console.log('[frontend deployment gate] WAIT recheckAfter='+result.recheckAfter);
   }else console.log('[frontend deployment gate] Waiting for the new API release.');
  }catch{console.log('[frontend deployment gate] Waiting for the exam API.');}
  if(Date.now()>deadline)throw Error('Exam API or deployment window is unavailable. The previous frontend stays live.');
  await new Promise(r=>setTimeout(r,30000));
 }
}
if(require.main===module)gate().catch(e=>{console.error('[frontend deployment gate] BLOCKED '+e.message);process.exitCode=1;});
module.exports={gate};
