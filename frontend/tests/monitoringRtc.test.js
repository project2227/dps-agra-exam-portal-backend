import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mergeMonitorStatus,canPreviewStudent,isRunningExamStatus } from '../src/utils/monitoringState.js'

test('online heartbeat preserves a flagged student and does not hide their live media',()=>{
 const previous={status:'flagged',connected:true,webcam:true,screen:true,flags:{tab:1}}
 const next=mergeMonitorStatus(previous,{status:'online',connected:true})
 assert.equal(next.status,'flagged')
 assert.equal(canPreviewStudent(next),true)
 assert.equal(next.flags.tab,1)
})
test('online and connected are transport states, not ended exams',()=>{
 assert.equal(isRunningExamStatus('online'),true)
 assert.equal(isRunningExamStatus('connected'),true)
 assert.equal(isRunningExamStatus('flagged'),true)
 assert.equal(canPreviewStudent({status:'active',connected:false,webcam:true}),false)
 assert.equal(canPreviewStudent({status:'submitted',connected:true,webcam:true}),false)
 assert.equal(canPreviewStudent({status:'active',connected:true,webcam:false,screen:false}),false)
})
test('disconnect and submit make live feeds ineligible',()=>{
 assert.equal(canPreviewStudent(mergeMonitorStatus({status:'active',connected:true,webcam:true},{status:'disconnected'})),false)
 assert.equal(canPreviewStudent(mergeMonitorStatus({status:'flagged',connected:true,screen:true},{status:'submitted'})),false)
})
test('teacher asks for each feed separately, labels are truthful and teacher notes are review-only',()=>{
 const hook=readFileSync('src/hooks/useWebRTC.js','utf8')
 const panel=readFileSync('src/components/proctoring/StudentDetailPanel.jsx','utf8')
 const server=readFileSync('../src/sockets/exam.socket.js','utf8')
 assert.match(hook,/teacher:requestMediaPreview/)
 assert.match(hook,/sendRequest\(sessionId,kind/)
 assert.match(hook,/teacher:mediaStatus/)
 assert.match(hook,/pc\.connectionState==='connected'/)
 assert.match(panel,/mediaStates\.webcam==='connected'\?live\.webcam:null/)
 assert.match(panel,/isRunningExamStatus/)
 assert.match(server,/limited\('media-preview:'\+mediaType,700\)/)
 assert.doesNotMatch(server,/limited\('media-preview',1000\)/)
 assert.match(server,/TEACHER_OBSERVATION/)
})
