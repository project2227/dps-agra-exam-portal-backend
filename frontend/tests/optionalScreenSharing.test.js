import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=name=>readFileSync('src/'+name,'utf8')
test('optional sharing is visible on every selected exam but is never checked by default',()=>{
 const join=read('pages/StudentJoinPage.jsx')
 assert.match(join,/screenShare: false/)
 assert.match(join,/selected && \(/)
 assert.match(join,/Optional:/)
 assert.match(join,/if\(exam.id!==examId\)setMediaConsent/)
})
test('student browser consent is required to enable or resume a previously unshared screen',()=>{
 const modal=read('components/proctoring/ProctoringConsentModal.jsx')
 const room=read('pages/ExamRoom.jsx')
 const widget=read('components/proctoring/MonitoringIndicator.jsx')
 assert.match(modal,/canStartScreen = needScreen \|\| allowOptionalScreen/)
 assert.match(room,/capture=await requestScreen\(\)/)
 assert.match(room,/await api\.setScreenMediaConsent\(true\)/)
 assert.match(room,/await api\.setScreenMediaConsent\(false\)/)
 assert.match(widget,/Share my entire screen/)
 assert.match(widget,/Stop optional screen sharing/)
})
test('newly granted screen consent reaches the teacher without bypassing separate snapshot consent',()=>{
 const server=readFileSync('../src/sockets/exam.socket.js','utf8')
 assert.match(server,/privateStudent\(s\.id,'teacher:screenWallRequested'/)
 assert.match(server,/s\.consent_screen&&viewers\(s\.exam_id\)/)
 assert.match(server,/socket\.data\.screenWallOptIn=enabled/)
 const wall=read('components/proctoring/ScreenWall.jsx')
 assert.match(wall,/Student has not enabled screen sharing/)
})
