'use strict';
async function gate(){
 const onRender=process.env.RENDER==='true',staticRender=onRender&&process.env.RENDER_SERVICE_TYPE==='static';
 // Render build settings can use development mode to install build dependencies.
 // A static site's automatic root install has no database gate of its own.
 if((!onRender&&['development','test'].includes(process.env.NODE_ENV))||process.env.DPS_DISPOSABLE_STAGE==='true'||process.env.UI_VISUAL_QA==='true'||(process.env.DPS_PARENT_GATE_PASSED==='true'&&!staticRender))return;
 let base=process.env.VITE_API_BASE_URL||'';
 if(!base&&staticRender){
  const vite=await import(require.resolve('vite',{paths:[require('node:path').join(__dirname,'../frontend')]}));
  const loadEnv=vite.loadEnv||vite.default.loadEnv;
  base=loadEnv('production',require('node:path').join(__dirname,'../frontend'),'VITE_').VITE_API_BASE_URL||'';
 }
 base=base.replace(/\/$/,'');
 // Self-hosted builds have the database gate in the parent build. An explicit
 // API origin means this is a separate static-site deployment.
 if(!base){if(staticRender&&process.env.VITE_DEMO_MODE!=='true')throw Error('Set VITE_API_BASE_URL before deploying the exam frontend.');return;}
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
