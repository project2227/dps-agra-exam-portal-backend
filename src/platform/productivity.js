'use strict';
const db=require('../config/db');
const {must}=require('../utils/http');
const work=require('./workplace');
// These are observations and declared modes, not a measure of employee value.
function classify({mode,source,inputEvents,edits,repeats,idleSeconds}){
 if(mode==='reading'||mode==='meeting')return mode;
 if(idleSeconds>=300)return 'idle';
 if(source==='desktop' && idleSeconds<=60 && repeats<Math.max(20,inputEvents*0.8))return 'interaction';
 if(inputEvents>0 && edits>0 && repeats<Math.max(20,inputEvents*0.8))return 'editing';
 return 'unknown';
}
const csvCell=value=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
async function observe(actor,sessionId,v){
 const session=await work.ownedSession(actor,sessionId,{sharing:true});
 const {consent}=await work.sharingAllowed(actor.id);
 must(consent.notice?.activityVersion===1,403,'Read and accept the updated activity notice first.');
 const bucket=new Date(Math.floor(Date.now()/30000)*30000);
 const category=classify(v);
 // Server clock and unique bucket prevent fabricated duration and duplicate uploads.
 const q=await db.transaction(async c=>{
  await c.query('SELECT id FROM work_sessions WHERE id=$1 FOR UPDATE',[sessionId]);
  const prior=(await c.query('SELECT created_at FROM work_activity_intervals WHERE session_id=$1 ORDER BY bucket DESC LIMIT 1',[sessionId])).rows[0];
  const from=Math.max(Date.parse(session.started_at),prior?Date.parse(prior.created_at):Date.now()-30000);
  const seconds=Math.min(30,Math.max(0,Math.floor((Date.now()-from)/1000)));
  return c.query(`INSERT INTO work_activity_intervals(session_id,user_id,team_id,bucket,mode,source,seconds,input_events,edits,repeats,idle_seconds,category)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(tenant_id,session_id,bucket) DO NOTHING RETURNING id`,
   [sessionId,actor.id,session.team_id,bucket,v.mode,v.source,seconds,v.inputEvents,v.edits,v.repeats,v.idleSeconds,category]);
 });
 let type;
 if(category==='idle')type='IDLE_ACTIVITY';
 else if(v.mode==='writing'&&v.inputEvents>=40&&v.repeats>=v.inputEvents*0.8)type='REPETITIVE_ACTIVITY';
 if(q.rowCount&&type){
  const recent=await db.query("SELECT 1 FROM work_events WHERE session_id=$1 AND event_type=$2 AND created_at>now()-interval '5 minutes'",[sessionId,type]);
  if(!recent.rowCount)await work.flag(session,type,{reason:'Activity estimate; check task context with employee'},type==='IDLE_ACTIVITY'?'No observed input for at least five minutes in writing mode. Reading, meetings and accessibility needs may explain this.':'Repeated input observed. Review task progress with the employee; this does not establish irrelevant work.');
 }
 return {accepted:!!q.rowCount,category,reviewRequired:!!type};
}
async function reviewSummary(task,summary){
 const endpoint=process.env.LOCAL_AI_GATEWAY_URL,key=process.env.LOCAL_AI_GATEWAY_KEY;
 if(!endpoint||!key)return {status:'unavailable',explanation:'Local AI has not been connected. Your summary is saved for human review.'};
 try{
  const url=new URL(endpoint);if(url.protocol!=='https:')throw new Error('invalid endpoint');
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify({task:String(task).slice(0,1000),summary}),signal:AbortSignal.timeout(25000),redirect:'error'});
  if(!response.ok)throw new Error('unavailable');
  const text=await response.text();if(text.length>6000)throw new Error('invalid');
  const v=JSON.parse(text);if(!['task_related','needs_review','uncertain'].includes(v.status))throw new Error('invalid');
  return {status:v.status,confidence:Math.max(0,Math.min(1,Number(v.confidence)||0)),explanation:String(v.explanation||'').slice(0,500),reviewRequired:true};
 }catch{return {status:'unavailable',explanation:'Local AI could not respond. Your summary is saved for human review.'};}
}
// Bounded day range, paginated users, and pre-aggregated joins avoid row multiplication.
async function report(actor,from,to,{offset=0,limit=200}={}){
 const q=await db.query(`WITH visible AS (
  SELECT u.id,u.name FROM org_users u WHERE $1='admin' OR u.id=$2 OR $1='manager' AND EXISTS(SELECT 1 FROM team_members m JOIN teams t ON t.id=m.team_id WHERE m.user_id=u.id AND t.manager_id=$2)
  ORDER BY u.name,u.id LIMIT $5 OFFSET $6
 ), activity AS (
  SELECT a.user_id,(a.bucket AT TIME ZONE 'UTC')::date AS day,
   sum(a.seconds) AS observed_seconds,sum(a.seconds) FILTER(WHERE a.category='editing') AS editing_seconds,sum(a.seconds) FILTER(WHERE a.category='interaction') AS interaction_seconds,
   sum(a.seconds) FILTER(WHERE a.category='reading') AS reading_seconds,sum(a.seconds) FILTER(WHERE a.category='meeting') AS meeting_seconds,
   sum(a.seconds) FILTER(WHERE a.category='idle') AS idle_seconds,sum(a.seconds) FILTER(WHERE a.category='unknown') AS unknown_seconds,
   sum(a.input_events) AS input_events,sum(a.repeats) AS repeats,string_agg(DISTINCT a.source,',') AS sources
  FROM work_activity_intervals a JOIN teams t ON t.id=a.team_id WHERE a.bucket >= $3::date AND a.bucket < $4::date+interval '1 day'
  AND ($1='admin' OR a.user_id=$2 OR $1='manager' AND t.manager_id=$2) GROUP BY a.user_id,day
 ), notes AS (
  SELECT n.user_id,(n.created_at AT TIME ZONE 'UTC')::date AS day,count(*) AS summaries,
   count(DISTINCT n.task_id) AS tasks,string_agg(n.summary,E'\n' ORDER BY n.created_at) AS work_summaries,
   count(*) FILTER(WHERE n.ai_review->>'status'='needs_review') AS ai_review_flags
  FROM work_progress_notes n JOIN teams t ON t.id=n.team_id WHERE n.created_at >= $3::date AND n.created_at < $4::date+interval '1 day'
  AND ($1='admin' OR n.user_id=$2 OR $1='manager' AND t.manager_id=$2) GROUP BY n.user_id,day
 ), observed AS (SELECT user_id,day FROM activity UNION SELECT user_id,day FROM notes)
 SELECT v.id AS employee_id,v.name,o.day,COALESCE(a.observed_seconds,0)::int AS observed_seconds,
 COALESCE(a.editing_seconds,0)::int AS editing_seconds,COALESCE(a.interaction_seconds,0)::int AS interaction_seconds,COALESCE(a.reading_seconds,0)::int AS reading_seconds,
 COALESCE(a.meeting_seconds,0)::int AS meeting_seconds,COALESCE(a.idle_seconds,0)::int AS idle_seconds,
 COALESCE(a.unknown_seconds,0)::int AS unknown_seconds,COALESCE(a.input_events,0)::int AS input_events,
 COALESCE(a.repeats,0)::int AS repeats,COALESCE(n.summaries,0)::int AS summaries,COALESCE(n.tasks,0)::int AS tasks,
 COALESCE(n.ai_review_flags,0)::int AS ai_review_flags,COALESCE(n.work_summaries,'') AS work_summaries,COALESCE(a.sources,'none') AS sources
 FROM visible v LEFT JOIN observed o ON o.user_id=v.id LEFT JOIN activity a ON a.user_id=v.id AND a.day=o.day LEFT JOIN notes n ON n.user_id=v.id AND n.day=o.day
 ORDER BY v.name,v.id,o.day`,[actor.role,actor.id,from,to,limit,offset]);
 return q.rows.map(r=>({...r,estimated_engaged_hours:Math.round((r.editing_seconds+r.interaction_seconds+r.reading_seconds+r.meeting_seconds)/36)/100,
  confidence:r.sources==='desktop'?'Observed device idle; modes and summaries self-declared':'Partial browser observation; modes and summaries self-declared',
  limitation:'Unobserved time excluded; activity is not proof of productive work. All flags require human review.'}));
}
module.exports={classify,csvCell,observe,report,reviewSummary};
