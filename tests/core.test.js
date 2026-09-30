'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {safeCsv,id}=require('../src/utils/http');
const root=path.join(__dirname,'..');
test('CSV export escapes spreadsheet formulas, quotes and newlines',()=>{
 assert.equal(safeCsv('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
 assert.equal(safeCsv('Alice\nBob'),'"Alice Bob"');
 assert.equal(safeCsv('0012'),'"0012"');
});
test('UUID validation',()=>{
 assert.equal(id('b728b8e7-1a29-4f2b-8e38-1cdb6865a90d'),true);
 assert.equal(id('../../admin'),false);
});
test('DB schema includes separate sessions, grades and proctor events',()=>{
 const sql=fs.readFileSync(path.join(root,'db/migrations/001_initial.sql'),'utf8');
 for(const name of ['teachers','class_groups','exams','questions','exam_sessions','answers','code_runs','handouts','exam_dates','anti_cheat_events'])
  assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\(`));
 assert.match(sql,/session_active_roll_uniq/);
 assert.doesNotMatch(sql,/CREATE TABLE IF NOT EXISTS students\s*\(/i);
});
test('no local untrusted code execution is used',()=>{
 const source=fs.readFileSync(path.join(root,'src/services/codeRunner.js'),'utf8');
 assert.doesNotMatch(source,/\b(child_process|execSync|spawnSync|vm\.runInNewContext)\b/);
 assert.match(source,/JUDGE0_API_URL/);
});
test('WebRTC signaling requires per-media consent and avoids recording',()=>{
 const socket=fs.readFileSync(path.join(root,'src/sockets/exam.socket.js'),'utf8');
 assert.match(socket,/mediaType==='webcam'&&!s\.consent_webcam/);
 assert.match(socket,/mediaType==='screen'&&!s\.consent_screen/);
 assert.doesNotMatch(socket,/MediaRecorder|createWriteStream\(/);
});
