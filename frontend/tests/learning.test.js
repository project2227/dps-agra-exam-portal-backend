import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BOOKS, STARTER_LESSONS, STARTER_QUIZZES } from '../src/services/starterCourses.js'
import { GAME_BANK, MOCK_EXAM } from '../src/services/gameQuestions.js'
import { deriveCourseNotes } from '../src/services/handoutAssistant.js'
test('all seven study paths include downloadable original PDFs, lessons, and verifiable questions',()=>{
 assert.equal(Object.keys(BOOKS).length,7)
 for(const [key,book] of Object.entries(BOOKS)){
  assert.equal(existsSync(join(import.meta.dirname,'..','public',book.pdf.slice(1))),true,key)
  assert.ok(STARTER_LESSONS[key].length>=2,key)
  assert.ok(STARTER_QUIZZES[key].length>=2,key)
  for(const q of STARTER_QUIZZES[key])assert.ok(q.answerIndex>=0&&q.answerIndex<q.options.length,key)
 }
})
test('mini-games and Class IX practice exam contain valid question indexes',()=>{
 assert.ok(Object.keys(GAME_BANK).length>=3)
 for(const g of [...Object.values(GAME_BANK).flatMap(x=>x.questions),...MOCK_EXAM]){
  assert.ok(g.options.length>=3)
  assert.ok(g.correct>=0&&g.correct<g.options.length)
 }
})
test('keyword assistance is explicit rather than pretending to be AI',()=>{
 const text='Variables are named containers for storing values in a running program. The expression on the right computes a result before assignment. Loops repeat instructions while a condition remains true in the program. A good function has a clear purpose and returns a result for another function.'
 const x=deriveCourseNotes(text)
 assert.match(x.method,/keyword extraction/)
 assert.ok(x.lessons.length>=1)
})
test('practice runners are browser workers and never call the private exam database',()=>{
 const x=readFileSync(join(import.meta.dirname,'..','src','services','browserRunner.js'),'utf8')
 assert.match(x,/new Worker/)
 assert.match(x,/worker\.terminate/)
 assert.doesNotMatch(x,/DATABASE_URL|JWT_SECRET|execSync|child_process/)
})
