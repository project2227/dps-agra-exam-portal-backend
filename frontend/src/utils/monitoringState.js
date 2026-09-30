// A live transport/heartbeat update is not an exam lifecycle transition.
// Keep media available even after a student's exam was flagged for review.
const running=new Set(['joined','active','flagged','online','connected']);
export const isRunningExamStatus=status=>running.has(status);
export const canPreviewStudent=s=>Boolean(s && isRunningExamStatus(s.status) &&
 s.connected!==false && (s.webcam===true||s.screen===true));
export function mergeMonitorStatus(current={},incoming={}) {
 const next={...current,...incoming};
 if(incoming.status==='online'||incoming.status==='connected'){
   // A flag must not disappear just because another heartbeat arrived.
   next.status=current.status==='flagged'?'flagged':'active';
   next.connected=true;
 }else if(incoming.status==='disconnected'){
   next.connected=false;
 }else if(incoming.status==='revoked'||incoming.status==='submitted'){
   next.connected=false;
 }
 return next;
}
