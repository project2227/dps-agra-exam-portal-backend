import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=name=>readFileSync('src/'+name,'utf8')
test('webcam stills require a separate visible opt-in on student exam page',()=>{
 const room=src('pages/ExamRoom.jsx'),indicator=src('components/proctoring/MonitoringIndicator.jsx')
 const hook=src('hooks/useSnapshots.js')
 assert.match(room,/useStudentSnapshots\(socket,streams\.webcam,phase==='active'\)/)
 assert.match(indicator,/onSnapshotChange/)
 assert.match(indicator,/Allow webcam snapshots/)
 assert.match(indicator,/Stop sharing snapshots/)
 assert.match(hook,/canvas\.toDataURL\('image\/jpeg',0\.48\)/)
 assert.match(hook,/const CAPTURE_EVERY_MS=4200/)
 assert.match(hook,/student:snapshotConsent/)
 assert.match(hook,/if\(!needed\)\{setAllowed\(false\)/)
})
test('teacher requests frames for a selected student and never caches them persistently',()=>{
 const hook=src('hooks/useTeacherSnapshots.js'),panel=src('components/proctoring/StudentDetailPanel.jsx')
 assert.match(hook,/teacher:snapshotSubscribe/)
 assert.match(hook,/teacher:snapshotUnsubscribe/)
 assert.match(hook,/teacher:snapshotKeepalive/)
 assert.match(hook,/setFrames\(\{\}\)/)
 assert.doesNotMatch(hook,/localStorage|sessionStorage|indexedDB/)
 assert.match(panel,/Request webcam snapshots/)
 assert.match(panel,/about one JPEG|one JPEG every 4 seconds/i)
})
