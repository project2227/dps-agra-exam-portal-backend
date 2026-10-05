'use strict';
const db=require('../config/db');
async function deploymentWindow(){
 return db.transaction(async c=>{
  await c.query('SET TRANSACTION READ ONLY');await c.query("SET LOCAL statement_timeout='15s'");
  const q=await c.query(`SELECT count(*)::integer AS count,max(end_time) AS until FROM exams
   WHERE archived_at IS NULL AND status IN ('active','scheduled') AND end_time>now()
   AND start_time<=now()+interval '3 hours' AND (settings->>'releaseSmoke') IS DISTINCT FROM 'true'`);
  // Calendar entries have no end time. The portal's maximum exam duration is
  // six hours, so use that conservative limit for unlinked calendar entries.
  const dates=await c.query(`SELECT count(*)::integer AS count,max(date+interval '6 hours') AS until FROM exam_dates d
   WHERE date<=now()+interval '3 hours' AND date+interval '6 hours'>now()
   AND NOT EXISTS(SELECT 1 FROM exams e WHERE lower(e.class_name)=lower(d.class_name)
    AND lower(e.title)=lower(d.title) AND abs(extract(epoch FROM e.start_time-d.date))<900)`);
  const activeOrSoon=Number(q.rows[0].count),calendarExams=Number(dates.rows[0].count);
  const until=Math.max(Date.now(),Date.parse(q.rows[0].until)||0,Date.parse(dates.rows[0].until)||0);
  return {deploymentAllowed:activeOrSoon===0&&calendarExams===0,activeOrSoon,calendarExams,
   recheckAfter:activeOrSoon||calendarExams?new Date(until+60000).toISOString():null};
 });
}
module.exports={deploymentWindow};
