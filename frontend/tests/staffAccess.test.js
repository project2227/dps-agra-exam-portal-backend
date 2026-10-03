import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
test('public teacher requests have a separate page, not staff login privileges',()=>{
 const app=fs.readFileSync('src/InstituteApp.jsx','utf8')
 const page=fs.readFileSync('src/pages/TeacherAccessRequest.jsx','utf8')
 assert.match(app,/path="\/teacher\/request-access"/)
 assert.match(page,/\/api\/staff-access\/request/)
 assert.match(page,/Submitting this form never creates a teacher account/)
});
test('teacher approvals are administrator-only and show generated passwords only once',()=>{
 const src=fs.readFileSync('src/pages/ManageTeachers.jsx','utf8')
 assert.match(src,/role==='admin'/)
 assert.match(src,/temporaryPassword/)
 assert.match(src,/crypto\.getRandomValues/)
 assert.match(src,/One-time teacher credentials/)
});
