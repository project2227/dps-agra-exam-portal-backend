import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const target = new URL('../public/ai/', import.meta.url);
await mkdir(target, { recursive: true });
const model = new URL('face_landmarker.task', target);
const sha = '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';
const valid = bytes => createHash('sha256').update(bytes).digest('hex') === sha;
let bytes;
try { bytes = await readFile(model); } catch {}
if (!bytes || !valid(bytes)) {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error('Could not download the pinned vision model.');
  bytes = Buffer.from(await response.arrayBuffer());
  if (!valid(bytes)) throw new Error('Vision model checksum did not match.');
  await writeFile(model, bytes);
}
await cp(fileURLToPath(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url)), fileURLToPath(new URL('wasm/', target)), { recursive: true });
console.log('Local vision assets prepared; pinned model checksum verified.');
