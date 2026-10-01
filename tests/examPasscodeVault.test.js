'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {encryptPasscode,decryptPasscode}=require('../src/services/passcodeVault');
const key='5e'.repeat(32),different='4a'.repeat(32);
test('AES-256-GCM passcode can be recovered by its configured key only',()=>{
 const plaintext='DPS-TEST-2-ABC';
 const c=encryptPasscode(plaintext,key);
 assert.notEqual(c,plaintext);assert.equal(decryptPasscode(c,key),plaintext);
 assert.throws(()=>decryptPasscode(c,different));
 assert.notEqual(encryptPasscode(plaintext,key),c,'fresh random nonce per encryption');
 const parts=c.split('.');parts[2]='AAAAAAAA';
 assert.throws(()=>decryptPasscode(parts.join('.'),key),'tampering fails authentication');
});
test('owner-only routes expose neither plaintext ciphertext nor hash in exam lists',()=>{
 const s=fs.readFileSync('src/routes/exam.routes.js','utf8');
 assert.match(s,/const \{passcode_hash,passcode_ciphertext,\.\.\.safe\}=x/);
 assert.match(s,/ownExam\(req\.params\.examId,req\.teacher\.id\)/);
 assert.match(s,/passcode_ciphertext=\$2/);
 assert.match(s,/res\.set\('Cache-Control','private, no-store'\)/);
 assert.match(s,/exam already has admitted students/i);
});
