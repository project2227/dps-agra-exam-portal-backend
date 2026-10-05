import test from 'node:test'
import assert from 'node:assert/strict'
import { generateOneByOne, planAiBatches, sourceFingerprint, waitForAi } from '../src/services/examAiBatches.js'

const question = prompt => ({ type: 'mcq', prompt })
const base = { mode: 'generate', types: ['mcq', 'code'], count: 12, payload: { topic: 'Python', sourceText: '' }, onProgress() {} }
test('more than five mixed questions arrive individually with only one request in flight', async () => {
  const received = [], calls = []; let active = 0
  const result = await generateOneByOne({ ...base, onQuestion: q => received.push(q), request: async p => {
    assert.equal(++active, 1); assert.equal(received.length, calls.length); calls.push(p)
    await Promise.resolve(); active--; return { questions: [question('Question ' + p.sequence.position)] }
  } })
  assert.equal(result.completed, 12); assert.equal(received.length, 12)
  assert.ok(calls.every(p => p.questionCount === 1 && p.questionTypes.length === 1))
  assert.deepEqual(calls.slice(0, 4).map(p => p.questionTypes[0]), ['mcq', 'code', 'mcq', 'code'])
  assert.equal(calls[11].sequence.position, 12); assert.equal(calls[11].sequence.previousPrompts.length, 6)
})
test('a large target is a lazy queue and one selected question can use several types', () => {
  const queue = planAiBatches(['mcq', 'code'], 1000000)
  assert.equal(queue.next().value.count, 1); assert.equal(queue.next().value.type, 'code'); queue.return()
  assert.equal([...planAiBatches(['mcq', 'code'], 1)].length, 1)
  for (const count of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => [...planAiBatches(['mcq'], count)], /whole number/)
})
test('stopping during a request keeps the current result and never starts another', async () => {
  const controller = new AbortController(), received = []; let calls = 0
  const result = await generateOneByOne({ ...base, signal: controller.signal, onQuestion: q => received.push(q), request: async () => {
    calls++; controller.abort(); return { questions: [question('Keep this question')] }
  } })
  assert.equal(calls, 1); assert.equal(result.stopped, true); assert.equal(result.completed, 1); assert.equal(received[0].prompt, 'Keep this question')
})
test('a failure keeps all earlier questions and a retry receives the existing prompts', async () => {
  const received = []; let calls = 0
  await assert.rejects(generateOneByOne({ ...base, onQuestion: q => received.push(q), request: async () => {
    if (++calls === 3) throw Error('Model offline'); return { questions: [question('Saved ' + calls)] }
  } }), /Model offline/)
  assert.equal(received.length, 2)
  await generateOneByOne({ ...base, count: 1, existingQuestions: received, onQuestion() {}, request: async p => {
    assert.equal(p.sequence.position, 3); assert.deepEqual(p.sequence.previousPrompts, ['Saved 1', 'Saved 2']); return { questions: [question('New question')] }
  } })
})
test('429 responses wait and retry the same question without losing progress', async () => {
  const received = [], positions = [], delays = []; let calls = 0
  const result = await generateOneByOne({ ...base, count: 2, onQuestion: q => received.push(q), wait: async ms => delays.push(ms), request: async p => {
    positions.push(p.sequence.position)
    if (++calls === 2) throw Object.assign(Error('Busy'), { status: 429, retryAfter: 3 })
    return { questions: [question('Saved ' + p.sequence.position)] }
  } })
  assert.equal(result.completed, 2); assert.deepEqual(positions, [1, 2, 2]); assert.deepEqual(delays, [3000]); assert.equal(received.length, 2)
})
test('stopping a cooldown does not send a retry', async () => {
  const controller = new AbortController(); let calls = 0
  const result = await generateOneByOne({ ...base, signal: controller.signal, onQuestion() {}, onProgress: p => {
    if (p.includes('Waiting')) queueMicrotask(() => controller.abort())
  }, request: async () => { calls++; throw Object.assign(Error('Busy'), { status: 429 }) } })
  assert.equal(result.stopped, true); assert.equal(calls, 1)
})
test('exact repeats are retried and never silently appended', async () => {
  const received = []; let calls = 0
  const result = await generateOneByOne({ ...base, count: 1, existingQuestions: [question('An earlier question')], onQuestion: q => received.push(q), request: async p => {
    assert.equal(p.sequence.position, 2); return { questions: [question(++calls === 1 ? '  AN earlier   question  ' : 'A different question')] }
  } })
  assert.equal(result.completed, 1); assert.equal(calls, 2); assert.equal(received.length, 1)
})
test('persistent repeats end with a useful error while the existing preview remains', async () => {
  let received = 0, calls = 0
  await assert.rejects(generateOneByOne({ ...base, count: 1, existingQuestions: [question('Already here')], onQuestion: () => received++, request: async () => { calls++; return { questions: [question('Already here')] } } }), /repeated an earlier/)
  assert.equal(received, 0); assert.equal(calls, 3)
})
test('paper imports request one source question and resume the same paper', async () => {
  const sourceText = 'Q1: Boolean values. Q2: Python functions.', existingQuestions = [{ ...question('Boolean question'), importSourceKey: sourceFingerprint(sourceText), sourceQuestionNumber: 1 }]
  let saved
  await generateOneByOne({ ...base, mode: 'import', count: 1, payload: { sourceText }, existingQuestions, onQuestion: q => { saved = q }, request: async p => {
    assert.equal(p.questionCount, 1); assert.deepEqual(p.questionTypes, ['mcq', 'code']); assert.equal(p.sequence.position, 2); return { questions: [question('Function question')] }
  } })
  assert.equal(saved.sourceQuestionNumber, 2); assert.equal(saved.importSourceKey, sourceFingerprint(sourceText))
  await generateOneByOne({ ...base, mode: 'import', count: 1, payload: { sourceText: 'A different paper' }, existingQuestions, onQuestion() {}, request: async p => {
    assert.equal(p.sequence.position, 1); return { questions: [question('Different source question')] }
  } })
})
test('malformed multi-question responses never get appended to a sequential preview', async () => {
  let received = 0
  await assert.rejects(generateOneByOne({ ...base, count: 1, onQuestion: () => received++, request: async () => ({ questions: [question('One'), question('Two')] }) }), /did not return one/)
  assert.equal(received, 0)
})
test('a stopped wait removes its timer promptly', async () => {
  const controller = new AbortController(), wait = waitForAi(60000, controller.signal)
  controller.abort(); await assert.rejects(wait, { name: 'AbortError' })
})
