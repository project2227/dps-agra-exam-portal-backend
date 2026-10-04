import test from 'node:test';
import assert from 'node:assert/strict';
import { VisionSignals } from '../src/services/visionSignals.js';
function face(){const p=Array.from({length:478},()=>({x:0.5,y:0.5,z:0}));p[33]={x:.35,y:.4};p[133]={x:.43,y:.4};p[362]={x:.57,y:.4};p[263]={x:.65,y:.4};p[468]={x:.39,y:.4};p[473]={x:.61,y:.4};p[1]={x:.5,y:.5};return p;}
function calibrated(){const d=new VisionSignals();for(let i=0;i<12;i++)d.update([face()],i*350);return d;}
test('neutral calibration and ordinary gaze produce no review events',()=>{const d=calibrated();assert.equal(d.update([face()],5000).status,'active');assert.deepEqual(d.update([face()],20000).events,[]);});
test('a short head movement is ignored and a sustained turn has a cooldown',()=>{const d=calibrated(),turned=face();turned[1].x=.62;assert.deepEqual(d.update([turned],5000).events,[]);assert.deepEqual(d.update([face()],9000).events,[]);d.update([turned],10000);assert.deepEqual(d.update([turned],18000).events,['vision_head_turn']);assert.deepEqual(d.update([turned],25000).events,[]);});
test('missing and multiple faces require sustained observations',()=>{const d=calibrated();assert.deepEqual(d.update([],5000).events,[]);assert.deepEqual(d.update([],13000).events,['vision_face_missing']);d.update([face(),face()],14000);assert.deepEqual(d.update([face(),face()],22000).events,['vision_multiple_faces']);});
test('gaze deviations are approximate sustained signals and emit no landmarks',()=>{const d=calibrated(),p=face();p[468].x=.42;p[473].x=.64;d.update([p],5000);const r=d.update([p],13000);assert.deepEqual(r.events,['vision_gaze_away']);assert.equal(r.landmarks,undefined);});
