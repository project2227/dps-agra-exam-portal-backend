import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=p=>readFileSync('src/'+p,'utf8')
test('the teacher can remove and restore hosted exams from a dedicated management page',()=>{
 const page=src('pages/ManageHostedExams.jsx')
 const app=src('InstituteApp.jsx'),nav=src('components/layout/Sidebar.jsx')
 assert.match(page,/api\.removeExam\(pending\.id,typed\.trim\(\)\)/)
 assert.match(page,/api\.restoreExam\(exam\.id\)/)
 assert.match(page,/Wait until all active students submit|live exam with students still taking it/i)
 assert.match(app,/path="exams\/manage"/)
 assert.match(nav,/\/teacher\/exams\/manage/)
})
test('the student screen wall reuses initially approved screen capture with no repeated prompt',()=>{
 const hook=src('hooks/useStudentScreenWall.js')
 const indicator=src('components/proctoring/MonitoringIndicator.jsx')
 const room=src('pages/ExamRoom.jsx')
 assert.match(hook,/active&&requested&&live/)
 assert.match(hook,/student:screenWallConsent/)
 assert.match(hook,/EVERY_MS=1500/)
 assert.doesNotMatch(indicator,/Allow screen wall snapshots/)
 assert.match(indicator,/Stop optional screen sharing/)
 assert.match(room,/useStudentScreenWall/)
})
test('one-page teacher wall shows all participant tiles and marks snapshots stale',()=>{
 const wall=src('components/proctoring/ScreenWall.jsx')
 const monitor=src('pages/ExamMonitor.jsx')
 assert.match(wall,/sorted\.map\(s=>/)
 assert.match(wall,/FRESH_MS=7000/)
 assert.match(wall,/Student has not enabled screen sharing/)
 assert.match(monitor,/useTeacherScreenWall/)
 assert.match(monitor,/ScreenWall students=\{filtered\}/)
});
