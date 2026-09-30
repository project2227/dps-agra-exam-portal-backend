'use strict';
// No accounts or exam records are created by this health/security smoke test.
const endpoint=(process.env.EXAM_API_URL||'').replace(/\/$/,'');
if(!endpoint || !/^https:\/\//.test(endpoint)){console.error('Set EXAM_API_URL=https://your-render-service.onrender.com');process.exit(2);}
(async()=>{
 const health=await fetch(endpoint+'/api/health');const body=await health.json();
 if(!health.ok||body.ok!==true||body.database!=='connected')throw new Error('Health/database check failed');
 const privateRes=await fetch(endpoint+'/api/teacher/exams');
 if(privateRes.status!==401)throw new Error('Unauthenticated teacher API did not reject access');
 const studentRes=await fetch(endpoint+'/api/student/session');
 if(studentRes.status!==401)throw new Error('Unauthenticated student API did not reject access');
 console.log('PASS health, database, teacher auth boundary, student auth boundary');
})().catch(e=>{console.error('Smoke test FAILED:',e.message);process.exitCode=1;});
