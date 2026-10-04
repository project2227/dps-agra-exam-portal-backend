'use strict';
const db=require('../config/db');const {publish}=require('./events');
const {must}=require('../utils/http');
const EVENT_SEVERITY={TAB_SWITCH:'medium',WINDOW_BLUR:'low',WINDOW_FOCUS:'low',FULLSCREEN_EXIT:'medium',
 COPY:'medium',PASTE:'medium',RIGHT_CLICK:'low',MULTIPLE_SESSION_ATTEMPT:'high',BROWSER_CHANGED:'medium',
 SCREEN_SHARE_STOPPED:'high',WEBCAM_STOPPED:'high',NETWORK_DISCONNECT:'low',DEVTOOLS_SUSPECTED:'low',VISION_HEAD_TURN:'low',VISION_GAZE_AWAY:'low',VISION_FACE_MISSING:'low',VISION_MULTIPLE_FACES:'low'};
const POINTS={low:1,medium:3,high:6};
async function event({examId,sessionId,eventType,message='',metadata={}}){
 must(EVENT_SEVERITY[eventType],400,'Unknown proctoring event.');
 const vision=eventType.startsWith('VISION_');
 if(vision){
  const consent=await db.query(`SELECT 1 FROM exam_sessions s JOIN exams e ON e.id=s.exam_id WHERE s.id=$1 AND s.exam_id=$2 AND s.consent_vision=true AND s.status NOT IN('submitted','revoked') AND e.settings->>'visionTracking'='true'`,[sessionId,examId]);
  must(consent.rowCount,403,'Local vision is not enabled or consented for this exam.');
 }
 // Don't blindly trust client-supplied severity, arbitrary URLs, HTML, keystrokes or media frames.
 const cleanMeta={};for(const name of ['visibility','reason','consent','timestamp']){
  if(['string','boolean','number'].includes(typeof metadata?.[name]))cleanMeta[name]=String(metadata[name]).slice(0,120);
 }
 const severity=EVENT_SEVERITY[eventType];
 const q=await db.query(`INSERT INTO anti_cheat_events(exam_id,session_id,event_type,severity,message,metadata)
 VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
 [examId,sessionId,eventType,severity,String(message).slice(0,260),JSON.stringify(cleanMeta)]);
 await db.query(`UPDATE exam_sessions SET cheating_score=cheating_score+$1,flags_count=flags_count+1,
 status=CASE WHEN $3 IN ('medium','high') AND status='active' THEN 'flagged' ELSE status END,updated_at=now()
 WHERE id=$2 AND status NOT IN('submitted','revoked')`,[vision?0:POINTS[severity],sessionId,severity]);
 publish(examId,'exam:proctorFlag',{sessionId,event:{id:q.rows[0].id,eventType,severity,createdAt:q.rows[0].created_at},reviewRequired:true});
 return q.rows[0];
}
module.exports={event,EVENT_SEVERITY};
