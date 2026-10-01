'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('hosted exams use owner-only recoverable removal instead of destroying submitted work',()=>{
 const routes=read('src/routes/exam.routes.js');
 const migration=read('db/migrations/004_exam_archive.sql');
 assert.match(migration,/archived_at timestamptz/);
 assert.match(routes,/router\.delete\('\/exams\/:examId'/);
 assert.match(routes,/confirmation\.confirmation\.trim\(\)===exam\.title/);
 assert.match(routes,/Students are still taking this exam/);
 assert.match(routes,/UPDATE exams SET archived_at=now\(\),status='closed'/);
 assert.match(routes,/router\.post\('\/exams\/:examId\/restore'/);
 assert.doesNotMatch(routes.slice(routes.indexOf("router.delete('/exams/:examId'"),routes.indexOf("router.post('/exams/:examId/restore'")),/DELETE FROM exams/);
});
test('archived exams do not appear in public join list or active dashboard',()=>{
 assert.match(read('src/routes/student.routes.js'),/archived_at IS NULL AND status/);
 assert.match(read('src/routes/teacher.routes.js'),/AND e\.archived_at IS NULL/);
});
test('screen wall is teacher-owned, ephemeral and guarded by independent student opt-in',()=>{
 const code=read('src/sockets/exam.socket.js');
 assert.match(code,/await checkTeacher\(examId\)/);
 assert.match(code,/socket\.rooms\.has\(teacherRoom\(examId\)\)/);
 assert.match(code,/screenWallOptIn=false/);
 assert.match(code,/const enabled=data\?\.enabled===true&&s\.consent_screen===true/);
 assert.match(code,/!socket\.data\.screenWallOptIn/);
 assert.match(code,/student:screenWallFrame/);
 assert.match(code,/WALL_JPEG_LIMIT=160000/);
 assert.doesNotMatch(code.slice(code.indexOf('student:screenWallFrame'),code.indexOf('End consented screen wall')),/INSERT INTO|UPDATE .*jpeg|fs\.writeFile/);
});
