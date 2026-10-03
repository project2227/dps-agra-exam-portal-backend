import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IncidentCapture,
  BUFFER_LIMIT,
} from '../src/services/incidentCapture.js';
const original = globalThis.MediaRecorder;
class FakeRecorder {
  static isTypeSupported() {
    return true;
  }
  state = 'inactive';
  start() {
    this.state = 'recording';
  }
  emit(bytes) {
    this.ondataavailable({ data: new Blob([bytes]) });
  }
  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.onstop?.();
  }
}
test('exam recording remains flag-only and uploads one ordered WebM stream', async () => {
  globalThis.MediaRecorder = FakeRecorder;
  const sent = [],
    made = [];
  const engine = new IncidentCapture({
    screen: {},
    createRecorder: () => {
      const r = new FakeRecorder();
      made.push(r);
      return r;
    },
    upload: {
      open: async (meta) => {
        assert.equal(meta.triggerType, 'TAB_SWITCH');
        return { recordingId: 'clip' };
      },
      chunk: async (id, n, part) =>
        sent.push([n, new Uint8Array(await part.arrayBuffer())]),
      finish: async () => sent.push('finished'),
    },
  });
  assert.equal(made.length, 0);
  assert(engine.begin({ triggerType: 'TAB_SWITCH' }));
  made[0].emit(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]));
  made[0].emit(new Uint8Array([9]));
  await engine.finish();
  assert.deepEqual(
    sent.map((x) => (Array.isArray(x) ? x[0] : x)),
    [0, 1, 'finished'],
  );
  assert.equal(sent[0][1][0], 0x1a);
  await engine.close();
  globalThis.MediaRecorder = original;
});
test('Workplace pre-roll stays in RAM until a flag and preserves the oldest live recorder header', async () => {
  globalThis.MediaRecorder = FakeRecorder;
  let time = 0;
  const made = [],
    parts = [];
  const engine = new IncidentCapture({
    screen: {},
    preRollMs: 10000,
    now: () => time,
    createRecorder: () => {
      const r = new FakeRecorder();
      made.push(r);
      return r;
    },
    upload: {
      open: async () => ({ recordingId: 'clip' }),
      chunk: async (id, n, part) =>
        parts.push({ n, bytes: [...new Uint8Array(await part.arrayBuffer())] }),
      finish: async () => {},
    },
  });
  assert.equal(made.length, 1);
  made[0].emit(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1]));
  time = 5000;
  engine.prepare();
  made[1].emit(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 2]));
  assert.equal(parts.length, 0);
  time = 7000;
  assert(engine.begin({ flagId: 'flag' }));
  assert.equal(made[1].state, 'inactive');
  made[0].emit(new Uint8Array([3]));
  await engine.finish('flag-context-complete');
  assert.deepEqual(parts, [
    { n: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3, 1] },
    { n: 1, bytes: [3] },
  ]);
  await engine.close();
  assert.equal(engine.candidates.length, 0);
  globalThis.MediaRecorder = original;
});
test('an unflagged buffer over the cap is discarded without uploading', async () => {
  globalThis.MediaRecorder = FakeRecorder;
  let recorder,
    opened = 0;
  const engine = new IncidentCapture({
    screen: {},
    preRollMs: 10000,
    createRecorder: () => (recorder = new FakeRecorder()),
    upload: {
      open: async () => {
        opened++;
        return { recordingId: 'clip' };
      },
      chunk: async () => {},
      finish: async () => {},
    },
  });
  recorder.emit(new Uint8Array(BUFFER_LIMIT + 1));
  assert.equal(recorder.state, 'inactive');
  assert.equal(opened, 0);
  await engine.close();
  globalThis.MediaRecorder = original;
});
