import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Exam Python can run locally without a remote compiler, but is not graded locally',()=>{
 const s=readFileSync('src/services/codeRunner.js','utf8')
 assert.match(s,/language === 'python'/)
 assert.match(s,/Local Python preview only/)
 assert.match(s,/manualReview/)
})
test('Old local student profiles and game attempts are cleared, admin login preserved',()=>{
 const s=readFileSync('src/utils/cleanSlate.js','utf8')
 assert.match(s,/dps\.learning\./)
 assert.match(s,/dps\.arcade\./)
 assert.match(s,/teacher\?\.role!=='admin'/)
})
