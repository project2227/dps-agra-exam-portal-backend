import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('teacher monitoring has authenticated reveal, intentional regeneration and copy',()=>{
 const s=readFileSync('src/pages/ExamMonitor.jsx','utf8')
 const live=readFileSync('src/services/liveApi.js','utf8')
 assert.match(s,/api\.getExamPasscode\(examId\)/)
 assert.match(s,/api\.generateExamPasscode\(examId\)/)
 assert.match(s,/window\.confirm\('Generate a new password/)
 assert.match(s,/Copy exam password/)
 assert.match(s,/passNotice/)
 assert.match(live,/\/passcode'\)/)
 assert.match(live,/\/generate-passcode'/)
})
