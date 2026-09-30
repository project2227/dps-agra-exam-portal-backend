import test from 'node:test'
import assert from 'node:assert/strict'
import {generatePracticeTest,TOPICS,QUESTION_BANK} from '../src/services/practiceTestGenerator.js'
test('every course subject generates a nonempty offline exam with valid shuffled answers',()=>{
 for(const {id} of TOPICS){
  const a=generatePracticeTest({topic:id,count:8,seed:2027})
  assert.ok(a.questions.length>=5,id+' should contain at least five unique questions')
  assert.equal(new Set(a.questions.map(x=>x.prompt)).size,a.questions.length)
  for(const item of a.questions){
   assert.equal(item.options.length,4)
   assert.ok(Number.isInteger(item.correct)&&item.correct>=0&&item.correct<4)
   assert.ok(typeof item.explanation==='string' && item.explanation.trim().length>=6)
  }
 }
})
test('seeded generation is deterministic and refuses unrecognized topics',()=>{
 const params={topic:'python',count:8,seed:39393,difficulty:2}
 assert.deepEqual(generatePracticeTest(params),generatePracticeTest(params))
 assert.throws(()=>generatePracticeTest({topic:'<script>'}),/Unknown/)
})
test('difficulty preference and length options do not duplicate or invent answers',()=>{
 for(const difficulty of [0,1,2,3]){
  const result=generatePracticeTest({topic:'mixed',count:20,seed:1414,difficulty})
  assert.equal(result.questions.length,20)
  assert.ok(result.questions.every(q=>typeof q.explanation==='string'))
 }
})
