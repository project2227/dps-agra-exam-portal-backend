'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('webRTC relay allows bounded ICE candidate bursts for both media types',()=>{
 const s=read('src/sockets/exam.socket.js');
 assert.match(s,/relayWindow\.length>=240/);
 assert.match(s,/event==='webrtc:iceCandidate'\?4096:65536/);
 assert.doesNotMatch(s,/limited\(event,100\)/);
 assert.match(s,/limited\('media-preview:'\+mediaType,700\)/);
 assert.match(s,/limited\('proctor:'\+data\?\.eventType,1000\)/);
})
test('student heartbeats distinguish transport connection from exam status',()=>{
 const s=read('src/sockets/exam.socket.js');
 assert.doesNotMatch(s,/status:'online'/);
 assert.match(s,/status:Date\.now\(\)<Date\.parse\(s\.start_time\)\?'joined':s\.status==='flagged'\?'flagged':'active',connected:true/);
 assert.match(s,/teacher:mediaStatus/);
})
test('a teacher observation is audited and not added to automatic cheating score',()=>{
 const s=read('src/sockets/exam.socket.js');
 const m=s.slice(s.indexOf("socket.on('teacher:sendWarning'"),s.indexOf("socket.on('teacher:lockStudentExam'"));
 assert.match(m,/await audit/);
 assert.match(m,/TEACHER_OBSERVATION/);
 assert.doesNotMatch(m,/await event\(/);
})
test('teacher monitor exposes saved progress and non-sensitive device diagnostics',()=>{
 const s=read('src/routes/proctor.routes.js');
 assert.match(s,/AS total_questions/);
 assert.match(s,/AS answered/);
 assert.match(s,/browser,os,screen_size,timezone/);
});
