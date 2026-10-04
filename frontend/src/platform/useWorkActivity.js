import { useEffect, useRef, useState } from 'react';
import { request } from './api';
// Only counts and idle duration. No key values, clipboard, field content or screenshots.
export default function useWorkActivity(sessionId,enabled,mode){
 const modeRef=useRef(mode),[status,setStatus]=useState('off');modeRef.current=mode;
 useEffect(()=>{
  if(!enabled||!sessionId){setStatus('off');return;}
  let last=Date.now(),idle=null,nativeAt=0,inputEvents=0,edits=0,repeats=0,busy=false,disposed=false;
  setStatus('Collecting aggregate activity');
  const privateField=e=>e.target?.closest?.('input[type="password"], [data-private="true"], [autocomplete="one-time-code"]');
  const key=e=>{if(privateField(e))return;last=Date.now();inputEvents++;if(e.repeat)repeats++;};
  const input=e=>{if(privateField(e))return;last=Date.now();edits+=Math.min(100,e.data?.length||1);};
  const pointer=()=>{last=Date.now();};
  document.addEventListener('keydown',key);document.addEventListener('input',input);document.addEventListener('pointerdown',pointer);
  const stop=window.plinthDesktop?.onActiveWindow(data=>{if(Number.isFinite(data.idleSeconds)){idle=data.idleSeconds;nativeAt=Date.now();}});
  const timer=setInterval(async()=>{
   if(busy||disposed)return;busy=true;
   const native=idle!==null&&Date.now()-nativeAt<20000;
   const snap={mode:modeRef.current,source:native?'desktop':'browser',inputEvents:Math.min(2000,inputEvents),edits:Math.min(10000,edits),repeats:Math.min(2000,repeats),idleSeconds:Math.min(86400,Math.max(0,Math.floor(native?idle:(Date.now()-last)/1000)))};
   inputEvents=0;edits=0;repeats=0;
   try{const q=await request('/api/productivity/sessions/'+sessionId+'/activity',{method:'POST',body:snap});if(!disposed)setStatus(q.reviewRequired?'Activity estimate flagged for review':'Aggregate activity saved');}
   catch(e){if(!disposed)setStatus(e.message);}finally{busy=false;}
  },30000);
  return()=>{disposed=true;clearInterval(timer);stop?.();document.removeEventListener('keydown',key);document.removeEventListener('input',input);document.removeEventListener('pointerdown',pointer);};
 },[sessionId,enabled]);
 return status;
}
