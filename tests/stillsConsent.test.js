'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('old exam sessions cannot acquire still-image relay permission from a software deployment',()=>{
 const migration=read('db/migrations/006_initial_stills_consent.sql');
 const student=read('src/routes/student.routes.js');
 const socket=read('src/sockets/exam.socket.js');
 assert.match(migration,/consent_stills BOOLEAN NOT NULL DEFAULT FALSE/);
 assert.match(student,/v\.consent\.stills===true/);
 assert.match(socket,/!s\.consent_stills/);
 assert.match(socket,/consent_screen=true AND consent_stills=true/);
 assert.match(socket,/data\?\.enabled===true && s\.consent_webcam===true && s\.consent_stills===true/);
});
