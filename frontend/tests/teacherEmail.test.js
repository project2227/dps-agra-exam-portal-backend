import test from 'node:test'
import assert from 'node:assert/strict'
import {isValidTeacherEmail} from '../src/utils/teacherEmail.js'
test('teacher login explicitly validates the registered email field',()=>{
 assert.equal(isValidTeacherEmail('instructor@example.edu'),true)
 assert.equal(isValidTeacherEmail(' instructor@example.edu '),true)
 assert.equal(isValidTeacherEmail('instructor.example.edu'),false)
 assert.equal(isValidTeacherEmail('instructor@'),false)
 assert.equal(isValidTeacherEmail(''),false)
})
