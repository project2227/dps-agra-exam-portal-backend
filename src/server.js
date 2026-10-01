'use strict';
const http=require('http');const {Server}=require('socket.io');
const {app}=require('./app');const {env,origins}=require('./config/env');
const {pool}=require('./config/db');const {migrate}=require('./config/migrate');const {bootstrap}=require('./config/bootstrap');
const {attachSockets}=require('./sockets/exam.socket');
async function start(){
 await migrate();await bootstrap();
 const server=http.createServer(app);
 const io=new Server(server,{cors:{origin:origins,methods:['GET','POST']},maxHttpBufferSize:192*1024,pingTimeout:20000});
 attachSockets(io);
 await new Promise((resolve,reject)=>server.listen(env.PORT,'0.0.0.0',err=>err?reject(err):resolve()));
 // Expired incident bytes are removed, not merely hidden from review.
 const retention=setInterval(()=>pool.query('DELETE FROM incident_recordings WHERE expires_at<now()').catch(err=>console.error('[incident retention]',err.code||'failed')),60*60*1000);
 retention.unref();
 pool.query('DELETE FROM incident_recordings WHERE expires_at<now()').catch(err=>console.error('[incident retention]',err.code||'failed'));
 console.log(`[ready] DPS Agra Exam Portal running on ${env.PORT}`);
 const shutdown=async()=>{clearInterval(retention);io.close();server.close();await pool.end();process.exit(0);};
 process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
 return {app,server,io};
}
if(require.main===module)start().catch(err=>{console.error('[startup failed]',err);process.exit(1)});
module.exports={start};
