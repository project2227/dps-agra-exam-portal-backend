// Presentation-only ordering. Recorded events and teacher decisions are unchanged.
const HIGH = new Set(['tab_hidden','fullscreen_exit','paste','devtools_shortcut','multiple_tabs','screen_share_stopped','webcam_stopped','TAB_SWITCH','FULLSCREEN_EXIT','PASTE','MULTIPLE_SESSION_ATTEMPT','SCREEN_SHARE_STOPPED','WEBCAM_STOPPED'])
const MEDIUM = new Set(['window_blur','copy','cut','devtools_suspected','print_screen','WINDOW_BLUR','COPY','DEVTOOLS_SUSPECTED','BROWSER_CHANGED'])
export function attentionCounts(student) {
  const counts={high:0,medium:0,low:0}
  const events=student.timeline || []
  for(const event of events){const type=event.type || event.eventType;if(event.severity==='high' || (!event.severity && HIGH.has(type)))counts.high++;else if(event.severity==='medium' || (!event.severity && MEDIUM.has(type)))counts.medium++;else if(event.severity==='low')counts.low++}
  if(!events.length){counts.high=Number(student.flags?.tab||0)+Number(student.flags?.fullscreen||0)+Number(student.flags?.other||0);counts.medium=Number(student.flags?.blur||0)+Number(student.flags?.copyPaste||0)+Number(student.flags?.devtools||0)}
  return counts
}
export function compareAttention(a,b) {
  const ac=attentionCounts(a),bc=attentionCounts(b)
  const total=s=>Object.values(s.flags || {}).reduce((sum,n)=>sum+(Number(n)||0),0)
  return bc.high-ac.high || bc.medium-ac.medium || Number(b.connected===false)-Number(a.connected===false) || total(b)-total(a) || Number(a.status==='submitted')-Number(b.status==='submitted') || String(a.rollNumber||'').localeCompare(String(b.rollNumber||''),undefined,{numeric:true})
}
