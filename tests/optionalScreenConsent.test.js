'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
test('in-exam screen consent is authenticated and not forced by teachers',()=>{
 const src=readFileSync('src/routes/student.routes.js','utf8');
 assert.match(src,/router\.post\('\/student\/media-consent',student/);
 assert.match(src,/studentAllowed\(req\.student\)/);
 assert.match(src,/z\.object\(\{screenShare:z\.boolean\(\)\}\)\.strict\(\)/);
 assert.match(src,/consentScreen:v\.consent\.screenShare/);
});
