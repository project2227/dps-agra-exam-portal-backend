import test from 'node:test'
import assert from 'node:assert/strict'
import { formatTime, formatDateTime } from '../src/utils/format.js'
import { parseLocal12, fromLocal12 } from '../src/utils/time12.js'
test('exam and monitoring clock shows explicit 12-hour AM/PM',()=>{
 const morning=formatTime(new Date(2026,8,30,9,5,0));
 const evening=formatTime(new Date(2026,8,30,21,35,0));
 assert.match(morning,/9:05\s*AM/i);
 assert.match(evening,/9:35\s*PM/i);
 assert.match(formatDateTime(new Date(2026,8,30,21,35)),/PM/i);
});
test('12-hour date picker converts noon and midnight correctly',()=>{
 assert.equal(fromLocal12({date:'2026-09-30',hour:12,minute:'00',period:'AM'}),'2026-09-30T00:00');
 assert.equal(fromLocal12({date:'2026-09-30',hour:12,minute:'30',period:'PM'}),'2026-09-30T12:30');
 assert.equal(fromLocal12({date:'2026-09-30',hour:9,minute:'05',period:'PM'}),'2026-09-30T21:05');
 assert.deepEqual(parseLocal12('2026-09-30T21:05'),{date:'2026-09-30',hour:9,minute:'05',period:'PM'});
 assert.equal(fromLocal12({date:'',hour:1,minute:'00',period:'PM'}),'');
});
test('exam deep links select one exam without embedding the password in the URL',()=>{
 const e=await import('node:fs');
 const create=e.readFileSync('src/pages/CreateExam.jsx','utf8');
 const join=e.readFileSync('src/pages/StudentJoinPage.jsx','utf8');
 assert.match(create,/\/student\/join\?exam=/);
 assert.doesNotMatch(create,/\/student\/join\?passcode=/);
 assert.match(join,/examFromLink/);
});
