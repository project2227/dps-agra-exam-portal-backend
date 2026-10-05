import test from 'node:test'
import assert from 'node:assert/strict'
import { facePose, VisionSignals } from '../src/services/visionSignals.js'
function face({ yaw = 0, gaze = 0.5, closed = false } = {}) {
 const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
 Object.assign(points, { 1: { x: 0.5 + yaw * 0.4, y: 0.55 }, 33: { x: 0.3, y: 0.4 }, 133: { x: 0.4, y: 0.4 }, 362: { x: 0.6, y: 0.4 }, 263: { x: 0.7, y: 0.4 }, 468: { x: 0.3 + gaze * 0.1, y: 0.4 }, 473: { x: 0.6 + gaze * 0.1, y: 0.4 }, 159: { x: 0.35, y: closed ? 0.4 : 0.385 }, 145: { x: 0.35, y: closed ? 0.4 : 0.415 }, 386: { x: 0.65, y: closed ? 0.4 : 0.385 }, 374: { x: 0.65, y: closed ? 0.4 : 0.415 } })
 return points
}
const calibrated = () => { const s = new VisionSignals(); for (let i = 0; i < 12; i++) s.update([face()], i * 350); assert.ok(s.baseline); return s }
const observe = (s, f, start, end) => { const events = []; for (let at = start; at <= end; at += 350) events.push(...s.update(f, at).events); return events }
test('stable open-eye frames calibrate; ordinary forward attention generates no flags', () => {
 const s = calibrated(); assert.deepEqual(observe(s, [face()], 4200, 25000), []); assert.equal(s.update([face()], 25300).status, 'active')
})
test('sustained head and iris deviation generates one combined review signal', () => {
 const s = calibrated(), events = observe(s, [face({ yaw: 0.3, gaze: 0.8 })], 4200, 16000)
 assert.deepEqual(events, ['vision_attention_away']); assert.equal(observe(s, [face({ yaw: 0.3, gaze: 0.8 })], 16350, 60000).length, 0)
})
test('brief glances and blinks never meet the sustained observation window', () => {
 const s = calibrated(); assert.deepEqual(observe(s, [face({ yaw: 0.3, gaze: 0.8 })], 4200, 7000), [])
 assert.deepEqual(observe(s, [face({ closed: true })], 7350, 8050), []); assert.deepEqual(observe(s, [face()], 8400, 22000), [])
})
test('a hidden-tab or camera gap cannot count as observed time away', () => {
 const s = calibrated(); observe(s, [], 4200, 7000); assert.deepEqual(s.update([], 60000).events, [])
 assert.deepEqual(observe(s, [], 60350, 67500), []); assert.deepEqual(s.update([], 68050).events, ['vision_face_missing'])
})
test('unstable calibration waits for twelve consecutive stable frames', () => {
 const s = new VisionSignals(); for (let i = 0; i < 30; i++) s.update([face({ yaw: i % 2 ? 0.22 : 0 })], i * 350)
 assert.equal(s.baseline, null); for (let i = 30; i < 42; i++) s.update([face()], i * 350); assert.ok(s.baseline)
})
test('closed eyes, malformed landmarks and tiny face crops are quality problems, not peek flags', () => {
 assert.equal(facePose(face({ closed: true })), null); assert.equal(facePose([]), null)
 const invalid = face(); invalid[468].x = NaN; assert.equal(facePose(invalid), null)
 const small = face(); small[263].x = 0.31; assert.equal(facePose(small), null)
 const s = calibrated(); assert.deepEqual(observe(s, [invalid], 4200, 18000), [])
 assert.match(s.update([invalid], 18350).quality, /lighting/)
})
test('multiple faces remain a sustained review signal and results never contain images or landmarks', () => {
 const s = calibrated(); assert.deepEqual(observe(s, [face(), face()], 4200, 13000), ['vision_multiple_faces'])
 const r = s.update([face()], 13350); assert.deepEqual(Object.keys(r).sort(), ['events', 'quality', 'status'])
})
