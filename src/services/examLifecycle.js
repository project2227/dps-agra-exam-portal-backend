'use strict';
const LOBBY_MINUTES=30;
function canJoinExam(exam,now=Date.now()) {
 return !exam.archived_at && ['active','scheduled'].includes(exam.status) &&
  now>=Date.parse(exam.start_time)-LOBBY_MINUTES*60000 && now<Date.parse(exam.end_time);
}
function sessionStart(session) {
 return session.started_at?Date.parse(session.started_at):
  Math.max(Date.parse(session.joined_at),Date.parse(session.start_time));
}
function canPurgeExam(exam,now=Date.now()) {
 return exam.status==='draft'||exam.status==='closed'||Date.parse(exam.end_time)<now;
}
module.exports={LOBBY_MINUTES,canJoinExam,sessionStart,canPurgeExam};
