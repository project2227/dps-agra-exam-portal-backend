// Approximate browser-local signals, never a cheating verdict. No landmarks leave this module.
const average = values => values.reduce((a,b)=>a+b,0) / values.length;
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1;
function eye(points, outer, inner, iris) {
  const a=points[outer], b=points[inner], c=points[iris];
  if(![a,b,c].every(validPoint))return null;
  const dx=b.x-a.x, dy=b.y-a.y, d=dx*dx+dy*dy;
  return d>0.00001 ? ((c.x-a.x)*dx+(c.y-a.y)*dy)/d : null;
}
export function facePose(points) {
  if (!points || points.length<478) return null;
  const left=points[33],right=points[263],nose=points[1];
  if(![left,right,nose].every(validPoint))return null;
  const width=Math.hypot(right.x-left.x,right.y-left.y);
  if(width<0.08 || width>0.7) return null;
  const a=eye(points,33,133,468), b=eye(points,362,263,473);
  if(a===null || b===null) return null;
  const lids=[159,145,386,374].map(i=>points[i]);
  if(!lids.every(validPoint))return null;
  // Closed eyes and poor iris fits are unreliable gaze measurements.
  const leftWidth=Math.hypot(points[133].x-left.x,points[133].y-left.y),rightWidth=Math.hypot(right.x-points[362].x,right.y-points[362].y);
  if(leftWidth<0.015||rightWidth<0.015||Math.hypot(lids[0].x-lids[1].x,lids[0].y-lids[1].y)/leftWidth<0.08||Math.hypot(lids[2].x-lids[3].x,lids[2].y-lids[3].y)/rightWidth<0.08||a<0.05||a>0.95||b<0.05||b>0.95)return null;
  return { yaw:(nose.x-(left.x+right.x)/2)/width,
    pitch:(nose.y-(left.y+right.y)/2)/width, gaze:(a+b)/2 };
}
export class VisionSignals {
  constructor(){this.samples=[];this.baseline=null;this.pending={};this.last={};this.started=null;this.lastAt=null;this.smoothed=null;}
  update(faces, at) {
    if(!Number.isFinite(at))return {events:[],status:'calibrating',quality:'Camera timing needs adjustment'};
    // A hidden tab, stalled camera or worker pause is not sustained observed movement.
    if(this.lastAt!==null&&(at-this.lastAt>1500||at<=this.lastAt)){this.pending={};this.smoothed=null;if(!this.baseline)this.samples=[];}
    this.lastAt=at;
    this.started ??= at;
    const measured=faces.length===1?facePose(faces[0]):null;
    if(!measured&&!this.baseline)this.samples=[];
    const pose=measured?Object.fromEntries(['yaw','pitch','gaze'].map(k=>[k,this.smoothed?this.smoothed[k]*0.65+measured[k]*0.35:measured[k]])):null;
    this.smoothed=pose;
    if(!this.baseline && pose){
      if(Math.abs(measured.yaw)>0.25||Math.abs(measured.pitch)>0.8){this.samples=[];}
      else{
        this.samples.push(measured);if(this.samples.length>12)this.samples.shift();
        if(this.samples.length===12&&['yaw','pitch','gaze'].every(k=>Math.max(...this.samples.map(x=>x[k]))-Math.min(...this.samples.map(x=>x[k]))<0.1))this.baseline=Object.fromEntries(['yaw','pitch','gaze'].map(k=>[k,average(this.samples.map(x=>x[k]))]));
      }
    }
    const headAway=!!(pose&&this.baseline&&(Math.abs(pose.yaw-this.baseline.yaw)>0.18||Math.abs(pose.pitch-this.baseline.pitch)>0.22));
    const gazeAway=!!(pose&&this.baseline&&Math.abs(pose.gaze-this.baseline.gaze)>0.13);
    const kinds={
      vision_multiple_faces:faces.length>1,
      vision_face_missing:faces.length===0,
      vision_attention_away:headAway&&gazeAway,
      vision_head_turn:headAway&&!gazeAway,
      vision_gaze_away:gazeAway&&!headAway,
    };
    const events=[];
    for(const [type, present] of Object.entries(kinds)){
      if(!present){delete this.pending[type];continue;}
      this.pending[type] ??= at;
      if(at-this.pending[type]>=8000 && at-(this.last[type]??-Infinity)>=60000){
        events.push(type);this.last[type]=at;
      }
    }
    return {events,status:this.baseline?'active':'calibrating',quality:pose?(this.baseline?'Local AI face and iris estimates active':'Look at the screen and keep your head steady for calibration'):'Face position, open eyes or lighting needs adjustment'};
  }
}
