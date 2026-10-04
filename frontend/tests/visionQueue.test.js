import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Execute the real reporter with a fake transport; no sockets or browser credentials.
const source=readFileSync(new URL('../src/services/proctoring.js',import.meta.url),'utf8');
const reporterSource=source.slice(source.indexOf('export function createProctorReporter')).replace('export function','function');
function setup(send){const retries=[];let seq=0;const factory=new Function('api','EVENTS','PROCTOR_EVENTS','uid','setTimeout',reporterSource+'; return createProctorReporter;');return {reporter:factory({sendProctorEvent:send},{},{},()=>String(++seq),callback=>retries.push(callback))({examId:'test-exam',sessionId:'test-session',socket:null}),retries};}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('revoked optional vision consent cannot block original integrity events',async()=>{const sent=[];const {reporter,retries}=setup(async e=>{sent.push(e.type);if(e.type.startsWith('vision_'))throw Object.assign(new Error('Paused'),{status:403});});reporter.report('vision_head_turn');reporter.report('tab_hidden');await settle();assert.deepEqual(sent,['vision_head_turn','tab_hidden']);assert.equal(retries.length,0);});
test('authentication failures retain the original retry behavior instead of discarding flags',async()=>{let allow=false;const sent=[];const {reporter,retries}=setup(async e=>{if(!allow)throw Object.assign(new Error('Expired'),{status:401});sent.push(e.type);});reporter.report('vision_head_turn');reporter.report('fullscreen_exit');await settle();assert.equal(retries.length,1);allow=true;retries[0]();await settle();assert.deepEqual(sent,['vision_head_turn','fullscreen_exit']);});
