'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');
const runner=fs.readFileSync('src/services/codeRunner.js','utf8');
const route=fs.readFileSync('src/routes/code.routes.js','utf8');
test('Unconfigured Judge0 never triggers unsafe direct execution of pupil code',()=>{
 assert.match(runner,/const isConfigured=\(\)=>Boolean\(env\.JUDGE0_API_URL\)/);
 assert.doesNotMatch(runner,/execSync\(|spawnSync\(/);
 assert.match(route,/const autoGrade=isConfigured\(\)/);
});
test('Without Judge0 or hidden tests, code is saved for teacher review, with no invented marks',()=>{
 assert.match(route,/marks=autoGrade\?/);
 assert.match(route,/manualReview:!autoGrade/);
 assert.match(route,/autoGrade\?'hidden':'manual'/);
 assert.match(route,/marksAwarded:marks/);
});
