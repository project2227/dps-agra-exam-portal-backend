'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('staff access migration holds requests separate from teacher authentication',()=>{
 const sql=read('db/migrations/003_teacher_access_requests.sql');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS teacher_access_requests/);
 assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_teacher_request_email/);
 assert.match(sql,/CHECK \(status IN \('pending','approved','declined'\)\)/);
 assert.doesNotMatch(sql,/ALTER TABLE teachers/);
});
test('public access only queues unverified requests while staff approval requires an authenticated administrator',()=>{
 const source=read('src/routes/staffAccess.routes.js');
 assert.match(source,/router\.post\('\/request', requestLimit/);
 assert.match(source,/res\.status\(202\)/);
 assert.match(source,/router\.get\('\/admin\/requests', teacher, admin/);
 assert.match(source,/router\.post\('\/admin\/requests\/:id\/approve',teacher,admin/);
 assert.match(source,/router\.post\('\/admin\/requests\/:id\/decline',teacher,admin/);
 assert.match(source,/crypto\.randomBytes\(24\)/);
 assert.match(source,/bcrypt\.hash\(password,12\)/);
 assert.match(source,/req\.teacher\.id/);
});
test('teacher enrollment is never registered by anonymous clients',()=>{
 const staff=read('src/routes/auth.routes.js');
 assert.match(staff,/router\.post\('\/teacher\/register',teacher,admin/);
 assert.match(read('src/app.js'),/app\.use\('\/api\/staff-access',require\('\.\/routes\/staffAccess\.routes'\)\)/);
});
