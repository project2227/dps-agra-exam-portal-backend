import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file=path=>readFileSync('src/'+path,'utf8')
test('already-consented screen and webcam can be forwarded only when teacher requests a preview',()=>{
 const webcam=file('hooks/useSnapshots.js')
 const screen=file('hooks/useStudentScreenWall.js')
 assert.match(webcam,/active&&requested&&live&&socket\?\.connected/)
 assert.match(screen,/active&&requested&&live&&socket\?\.connected/)
 assert.match(webcam,/student:snapshotConsent/)
 assert.match(screen,/student:screenWallConsent/)
 assert.doesNotMatch(webcam,/const \[allowed,setAllowed\]/)
 assert.doesNotMatch(screen,/const \[allowed,setAllowed\]/)
})
test('monitor opens existing-consent screen wall by default and selected webcam previews automatically',()=>{
 const monitor=file('pages/ExamMonitor.jsx')
 const details=file('components/proctoring/StudentDetailPanel.jsx')
 assert.match(monitor,/params\.get\('view'\)!=='cards'/)
 assert.match(details,/subscribeStills\(sessionId\)/)
 assert.match(details,/return\(\)=>stopStills\?\.\(sessionId\)/)
})
test('no second media-permission buttons while an exam is active',()=>{
 const indicator=file('components/proctoring/MonitoringIndicator.jsx')
 const consent=file('components/proctoring/ProctoringConsentModal.jsx')
 assert.doesNotMatch(indicator,/Allow webcam snapshots|Allow screen wall snapshots/)
 assert.match(consent,/Grant the browser permissions here once/)
 assert.match(indicator,/already-shared screen/)
})
