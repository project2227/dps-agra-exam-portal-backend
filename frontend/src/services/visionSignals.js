// Approximate browser-local signals, never a cheating verdict. No landmarks leave this module.
const average = values => values.reduce((a,b)=>a+b,0) / values.length;
function eye(points, outer, inner, iris) {
  const a=points[outer], b=points[inner], c=points[iris];
  const dx=b.x-a.x, dy=b.y-a.y, d=dx*dx+dy*dy;
  return d>0.00001 ? ((c.x-a.x)*dx+(c.y-a.y)*dy)/d : null;
}
export function facePose(points) {
  if (!points || points.length<478) return null;
  const left=points[33],right=points[263],nose=points[1];
  const width=Math.hypot(right.x-left.x,right.y-left.y);
  if(width<0.08 || width>0.7) return null;
  const a=eye(points,33,133,468), b=eye(points,362,263,473);
  if(a===null || b===null) return null;
  return { yaw:(nose.x-(left.x+right.x)/2)/width,
    pitch:(nose.y-(left.y+right.y)/2)/width, gaze:(a+b)/2 };
}
export class VisionSignals {
  constructor(){this.samples=[];this.baseline=null;this.pending={};this.last={};this.started=null;}
  update(faces, at) {
    this.started ??= at;
    const pose=faces.length===1?facePose(faces[0]):null;
    if(!this.baseline && pose){
      this.samples.push(pose);
      if(this.samples.length>=12){this.baseline=Object.fromEntries(['yaw','pitch','gaze'].map(k=>[k,average(this.samples.map(x=>x[k]))]));}
    }
    const kinds={
      vision_multiple_faces:faces.length>1,
      vision_face_missing:faces.length===0,
      vision_head_turn:!!(pose&&this.baseline&&(Math.abs(pose.yaw-this.baseline.yaw)>0.18||Math.abs(pose.pitch-this.baseline.pitch)>0.22)),
      vision_gaze_away:!!(pose&&this.baseline&&Math.abs(pose.gaze-this.baseline.gaze)>0.13),
    };
    const events=[];
    for(const [type, present] of Object.entries(kinds)){
      if(!present){delete this.pending[type];continue;}
      this.pending[type] ??= at;
      if(at-this.pending[type]>=8000 && at-(this.last[type]??-Infinity)>=60000){
        events.push(type);this.last[type]=at;
      }
    }
    return {events,status:this.baseline?'active':'calibrating',quality:pose?'face visible':'Face position or lighting needs adjustment'};
  }
}
