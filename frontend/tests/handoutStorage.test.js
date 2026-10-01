import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('teacher handout form advertises only supported small-file types and matches backend section contract',()=>{
 const form=readFileSync('src/pages/Handouts.jsx','utf8')
 const live=readFileSync('src/services/liveApi.js','utf8')
 assert.match(form,/maxSizeMB=\{5\}/)
 assert.match(form,/\.docx,\.pptx/)
 assert.doesNotMatch(form,/up to 25 MB/)
 assert.match(live,/form\.append\('className',cls\)/)
 assert.match(live,/form\.append\('section'/)
 assert.match(live,/file_size/)
})
