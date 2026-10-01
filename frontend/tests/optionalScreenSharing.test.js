import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=name=>readFileSync('src/'+name,'utf8')
test('optional screen sharing requires the individual to select the option before joining',()=>{
 const join=read('pages/StudentJoinPage.jsx')
 assert.match(join,/screenShare: false/)
 assert.match(join,/selected && \(/)
 assert.match(join,/Optional:/)
 assert.match(join,/if\(exam.id!==examId\)setMediaConsent/)
 assert.match(join,/temporary low-resolution screen stills/)
})
test('previously approved capture is obtained once through the browser and can be stopped',()=>{
 const modal=read('components/proctoring/ProctoringConsentModal.jsx')
 const room=read('pages/ExamRoom.jsx')
 const widget=read('components/proctoring/MonitoringIndicator.jsx')
 assert.match(modal,/canStartScreen = needScreen \|\| allowOptionalScreen/)
 assert.match(modal,/const ready = \(!needCam \|\| webcam\) && \(!canStartScreen \|\| screen\)/)
 assert.match(room,/capture=await requestScreen\(\)/)
 assert.match(room,/await api\.setScreenMediaConsent\(true\)/)
 assert.match(room,/await api\.setScreenMediaConsent\(false\)/)
 assert.match(widget,/Start optional screen sharing/)
 assert.match(widget,/Stop optional screen sharing/)
 assert.doesNotMatch(widget,/Allow screen wall snapshots/)
})
test('an authorized screen-wall request cannot bypass the initial database consent',()=>{
 const server=readFileSync('../src/sockets/exam.socket.js','utf8')
 assert.match(server,/privateStudent\(s\.id,'teacher:screenWallRequested'/)
 assert.match(server,/s\.consent_screen&&viewers\(s\.exam_id\)/)
 assert.match(server,/socket\.data\.screenWallOptIn=enabled/)
 assert.match(server,/s\.active_socket_id!==socket\.id\|\|!s\.consent_screen/)
 const wall=read('components/proctoring/ScreenWall.jsx')
 assert.match(wall,/Student has not enabled screen sharing/)
})
