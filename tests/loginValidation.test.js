'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('teacher login returns a helpful email-format error before a database lookup',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/routes/auth.routes.js'),'utf8');
 const validation=source.slice(source.indexOf("router.post('/teacher/login'"),source.indexOf("router.get('/teacher/me'"));
 assert.match(validation,/\.trim\(\)\.toLowerCase\(\)\.email\(\)/);
 assert.match(validation,/safeParse\(req\.body\)/);
 assert.match(validation,/including the @ symbol/);
 assert.ok(validation.indexOf('safeParse')<validation.indexOf('SELECT * FROM teachers'));
});
