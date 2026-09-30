'use strict';
const db=require('../config/db');
async function audit({teacherId=null,examId=null,action,details={}}){
 await db.query('INSERT INTO audit_logs(teacher_id,exam_id,action,details) VALUES($1,$2,$3,$4)',
 [teacherId,examId,action,JSON.stringify(details)]);
}
module.exports={audit};
