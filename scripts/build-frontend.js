'use strict';
const {spawnSync}=require('node:child_process');
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['--prefix','frontend','run','build'],{
 stdio:'inherit',env:{...process.env,DPS_PARENT_GATE_PASSED:'true'},shell:process.platform==='win32'});
if(result.error)throw result.error;process.exitCode=result.status??1;
if(!process.exitCode&&process.env.DPS_DISPOSABLE_STAGE==='true'){
 const prepared=spawnSync(process.execPath,['--max-old-space-size=128','--liftoff-only','scripts/prepare-staging-db.mjs'],{stdio:'inherit'});
 if(prepared.error)throw prepared.error;process.exitCode=prepared.status??1;
}
