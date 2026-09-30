import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('exam-to-exam and staff re-login cannot reuse a Socket.IO connection authenticated with an old token',()=>{
 const s=readFileSync('src/services/socket.js','utf8')
 assert.match(s,/socketToken === token/)
 assert.match(s,/socketToken = token/)
 assert.match(s,/socketToken = null/)
 assert.doesNotMatch(s,/if \(socket && socketRole === role\) return socket/)
})
