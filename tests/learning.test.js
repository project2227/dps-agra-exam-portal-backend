'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('practice profiles are distinct from exam sessions, keep credentials hashed',()=>{
 const sql=read('db/migrations/002_learning_hub.sql');
 for(const table of ['practice_users','courses','course_enrollments','course_attempts','practice_game_results','teacher_community_messages'])assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
 assert.match(sql,/password_hash/);assert.match(sql,/REFERENCES practice_users\(id\) ON DELETE CASCADE/);
 assert.doesNotMatch(sql,/ALTER TABLE exam_sessions/i);
});
test('student course serialization does not reveal answers before submission',()=>{
 const src=read('src/routes/learning.routes.js');
 assert.match(src,/quiz\.map\(\(\{answerIndex,\.\.\.q\}\)=>q\)/);
 assert.match(src,/d\.answers\[i\]===q\.answerIndex/);
 assert.match(src,/must\(c\.quiz\.length>0/);
});
test('teacher creation and messages require active teacher or administrator auth',()=>{
 const src=read('src/routes/learning.routes.js'),auth=read('src/routes/auth.routes.js');
 assert.match(src,/router\.post\('\/teacher\/courses',teacher,writeLimiter/);
 assert.match(src,/router\.post\('\/teacher\/community',teacher,writeLimiter/);
 assert.match(src,/router\.get\('\/teacher\/admin\/teachers',teacher,admin/);
 assert.match(auth,/router\.post\('\/teacher\/register',teacher,admin/);
});
test('marksheets only query exams owned by the authenticated teacher',()=>{
 const src=read('src/routes/submission.routes.js');
 assert.match(src,/router\.get\('\/exams\/:examId\/grade-summary'/);
 assert.match(src,/await ownExam\(req\.params\.examId,req\.teacher\.id\)/);
 assert.match(src,/pending_grading/);
});

test('staff can change passwords using current password verification',()=>{
 const src=read('src/routes/auth.routes.js');
 assert.match(src,/router\.post\('\/teacher\/change-password',teacher,limiter/);
 assert.match(src,/bcrypt\.compare\(d\.currentPassword/);
});
