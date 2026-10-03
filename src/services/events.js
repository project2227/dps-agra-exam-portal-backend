'use strict';
let io=null;
function attach(instance){io=instance;}
function prefix(){const c=require('../platform/context');return c.enabled()&&c.currentTenant()?'tenant:'+c.currentTenant().id+':':'';}
function teacherRoom(examId){return `${prefix()}exam:${examId}:teachers`;}
function studentRoom(sessionId){return `${prefix()}session:${sessionId}`;}
function communityRoom(){return prefix()+'teachers:community';}
function publish(examId,event,data){if(io)io.to(teacherRoom(examId)).emit(event,data);}
function privateStudent(sessionId,event,data){if(io)io.to(studentRoom(sessionId)).emit(event,data);}
module.exports={attach,teacherRoom,studentRoom,communityRoom,publish,privateStudent,getIo:()=>io};
