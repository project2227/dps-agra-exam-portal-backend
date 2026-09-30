'use strict';
let io=null;
function attach(instance){io=instance;}
function teacherRoom(examId){return `exam:${examId}:teachers`;}
function studentRoom(sessionId){return `session:${sessionId}`;}
function publish(examId,event,data){if(io)io.to(teacherRoom(examId)).emit(event,data);}
function privateStudent(sessionId,event,data){if(io)io.to(studentRoom(sessionId)).emit(event,data);}
module.exports={attach,teacherRoom,studentRoom,publish,privateStudent};
