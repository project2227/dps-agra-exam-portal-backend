'use strict';
const http=require('http');const {Server}=require('socket.io');
const {app}=require('./app');const {env,origins}=require('./config/env');
const {pool}=require('./config/db');const {migrate}=require('./config/migrate');const {bootstrap}=require('./config/bootstrap');
const {attachSockets}=require('./sockets/exam.socket');
async function start(){
 await migrate();
 if(require('./platform/context').enabled()){
  const tenant=(await require('./config/db').platformQuery('SELECT * FROM tenants WHERE id=$1',[require('./platform/context').DPS_ID])).rows[0];
  await require('./platform/context').withTenant(tenant,bootstrap);await require('./platform/bootstrap').bootstrapPlatform();
 }else await bootstrap();
 const server=http.createServer(app);
 const io=new Server(server,{cors:{origin:require('./platform/context').enabled()?(origin,cb)=>cb(null,require('./platform/tenancy').corsOrigin(origin)):origins,credentials:true,methods:['GET','POST']},maxHttpBufferSize:192*1024,pingTimeout:20000});
 if(require('./platform/context').enabled())io.use(require('./platform/tenancy').socketTenant);
 attachSockets(io);
 if(require('./platform/context').enabled())require('./sockets/workplace.socket').attachWorkplace(io);
 await new Promise((resolve,reject)=>server.listen(env.PORT,'0.0.0.0',err=>err?reject(err):resolve()));
 // Expired incident bytes are removed, not merely hidden from review.
 const retention=setInterval(()=>pool.query('DELETE FROM incident_recordings WHERE expires_at<now()').catch(err=>console.error('[incident retention]',err.code||'failed')),60*60*1000);
 retention.unref();
 let platformWorker;
 if(require('./platform/context').enabled()){
  const tick=()=>Promise.all([require('./platform/provisioning').recover(),require('./platform/cleanup').cleanup()]).catch(error=>console.error('[platform worker]',error.code||'failed'));
  platformWorker=setInterval(tick,60000);platformWorker.unref();void tick();
 }
 pool.query('DELETE FROM incident_recordings WHERE expires_at<now()').catch(err=>console.error('[incident retention]',err.code||'failed'));
 console.log(`[ready] DPS Agra Exam Portal running on ${env.PORT}`);
 console.log('[accounts] email reset delivery '+(require('./services/email').emailReady()?'configured':'not configured; teacher password resets available'));
 // The public edge can still be switching containers immediately after listen().
 let releaseSmokeTimer;
 if(process.env.PLINTH_STAGE_SMOKE==='true'||process.env.PLINTH_RELEASE_SMOKE==='true'){releaseSmokeTimer=setTimeout(()=>require('../scripts/plinth-stage-smoke').stageSmoke().then(result=>console.log('[plinth release smoke] PASS '+JSON.stringify(result))).catch(error=>console.error('[plinth release smoke] FAIL checks='+String(error.releaseChecks||0)+' code='+String(error.code||error.name||'unknown')+' expected='+String(typeof error.expected==='number'?error.expected:'')+' actual='+String(typeof error.actual==='number'?error.actual:''))),45000);releaseSmokeTimer.unref();}
 if(process.env.ACCOUNT_RELEASE_SMOKE==='true'){releaseSmokeTimer=setTimeout(()=>require('../scripts/release-smoke').releaseSmoke().then(result=>console.log('[release smoke] PASS public HTTPS, cookie student login, account and guest join, autosave, teacher Socket.IO monitor, submission, logout; checks='+result.checks)).catch(error=>console.error('[release smoke] FAIL checks='+String(error.releaseChecks??'cleanup')+' type='+String(error.code||error.name||'unknown')+' expected='+String(typeof error.expected==='number'?error.expected:'')+' actual='+String(typeof error.actual==='number'?error.actual:''))),45000);releaseSmokeTimer.unref();}
 const shutdown=async()=>{clearInterval(retention);clearInterval(platformWorker);clearTimeout(releaseSmokeTimer);io.close();server.close();await pool.end();process.exit(0);};
 process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
 return {app,server,io};
}
if(require.main===module)start().catch(err=>{console.error('[startup failed]',err);process.exit(1)});
module.exports={start};
