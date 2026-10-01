'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {canJoinExam,sessionStart,canPurgeExam}=require('../src/services/examLifecycle');
const start=Date.parse('2026-10-01T10:00:00Z'),end=start+3600000;
const exam={status:'scheduled',start_time:new Date(start).toISOString(),end_time:new Date(end).toISOString()};
test('check-in opens exactly thirty minutes before start, closes at the end and excludes archived exams',()=>{
 assert.equal(canJoinExam(exam,start-1800001),false);assert.equal(canJoinExam(exam,start-1800000),true);
 assert.equal(canJoinExam(exam,start-1),true);assert.equal(canJoinExam(exam,end),false);
 assert.equal(canJoinExam({...exam,archived_at:new Date()},start),false);
 assert.equal(canJoinExam({...exam,status:'closed'},start),false);
});
test('early check-in does not consume duration; a late join starts from join time and reconnect preserves the start',()=>{
 const early={joined_at:new Date(start-1200000),start_time:exam.start_time};
 assert.equal(sessionStart(early),start);
 assert.equal(sessionStart({...early,joined_at:new Date(start+600000)}),start+600000);
 assert.equal(sessionStart({...early,started_at:new Date(start+1000),joined_at:new Date(start+5000)}),start+1000);
});
test('permanent cleanup protects active and scheduled exams until their window has ended',()=>{
 assert.equal(canPurgeExam(exam,start),false);assert.equal(canPurgeExam({...exam,status:'active'},start),false);
 assert.equal(canPurgeExam(exam,end+1),true);assert.equal(canPurgeExam({...exam,status:'draft'},start),true);
 assert.equal(canPurgeExam({...exam,status:'closed'},start),true);
});
