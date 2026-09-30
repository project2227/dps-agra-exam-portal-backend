'use strict';
const db=require('../config/db');const {must}=require('../utils/http');
async function assertAssignedClass(teacher,className,section='All'){
 const q=await db.query('SELECT id,sections FROM class_groups WHERE lower(class_name)=lower($1)',[className]);
 must(q.rowCount,400,'The class has not been configured by an administrator.');
 must(section.toLowerCase()==='all'||q.rows[0].sections.some(x=>String(x).toLowerCase()===section.toLowerCase()),
 400,'This section is not configured for the selected class.');
 if(teacher.role==='admin')return;
 const assigned=teacher.assigned_classes;
 must(Array.isArray(assigned)&&assigned.some(x=>String(x).toLowerCase()===className.toLowerCase()),
 403,'You are not assigned to this class. Contact the school administrator.');
}
module.exports={assertAssignedClass};
