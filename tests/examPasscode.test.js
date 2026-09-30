'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const bcrypt=require('bcryptjs');
const {normalizeExamPasscode,isValidExamPasscode}=require('../src/utils/examPasscode');
test('the same exam passcode works with uppercase, lowercase, pasted spaces and missing hyphens across browsers', async()=>{
 const issued='DPS-Ab34-Xy78';
 const original=normalizeExamPasscode(issued);
 const hash=await bcrypt.hash(original,4);
 for(const typed of [issued,'dps-ab34-xy78','DPSAB34XY78','  dps - ab34 - xy78  ']){
  assert.equal(normalizeExamPasscode(typed),original);
  assert.equal(await bcrypt.compare(normalizeExamPasscode(typed),hash),true);
 }
 assert.equal(await bcrypt.compare(normalizeExamPasscode('DPS-WRONG-CODE'),hash),false);
});
test('only valid codes are accepted after normalization',()=>{
 assert.equal(isValidExamPasscode('DPS-A1B2-C3D4'),true);
 assert.equal(isValidExamPasscode(' dps-a1b2-c3d4 '),true);
 assert.equal(isValidExamPasscode('a-b-c'),false);
 assert.equal(isValidExamPasscode('12345678<>'),false);
});
test('generation and join endpoints both use canonical exam passcode',()=>{
 const e=fs.readFileSync(path.join(__dirname,'../src/routes/exam.routes.js'),'utf8');
 const j=fs.readFileSync(path.join(__dirname,'../src/routes/student.routes.js'),'utf8');
 assert.match(e,/bcrypt\.hash\(normalizeExamPasscode\(passcode\)/);
 assert.match(j,/bcrypt\.compare\(canonicalCode,e\.passcode_hash\)/);
});
