import {useEffect,useRef,useState} from 'react'

// A new, visible opt-in is required for screen wall images, even if the
// participant already permitted direct screen sharing in the exam.
const EVERY_MS=9000,MAX_URI=158000;
export function useStudentScreenWall(socket,screen,active){
 const [requested,setRequested]=useState(false);
 const [allowed,setAllowed]=useState(false);
 const [status,setStatus]=useState('off');
 const onRef=useRef(false);
 useEffect(()=>{
  if(!socket){setRequested(false);setAllowed(false);return}
  const requestedByTeacher=p=>{
   const needed=p?.requested===true;
   setRequested(needed);
   if(!needed){setAllowed(false);setStatus('off')}
   else setStatus(prev=>prev==='sharing'?prev:'permission-needed');
  };
  const disconnect=()=>{
   onRef.current=false;setAllowed(false);setRequested(false);setStatus('reconnecting');
  };
  socket.on('teacher:screenWallRequested',requestedByTeacher);
  socket.on('disconnect',disconnect);
  return()=>{
   socket.off('teacher:screenWallRequested',requestedByTeacher);
   socket.off('disconnect',disconnect);
  };
 },[socket,active]);
 useEffect(()=>{
  const streamReady=Boolean(screen?.getVideoTracks().some(t=>t.readyState==='live'));
  const ready=active&&requested&&allowed&&socket?.connected&&streamReady;
  if(!ready){
   if(onRef.current&&socket?.connected)socket.emit('student:screenWallConsent',{enabled:false});
   onRef.current=false;
   if(allowed&&!streamReady)setStatus('screen-unavailable');
   return;
  }
  let stopped=false;
  const video=document.createElement('video');
  video.srcObject=screen;video.autoplay=true;video.muted=true;video.playsInline=true;
  const canvas=document.createElement('canvas');
  canvas.width=640;canvas.height=360;
  const context=canvas.getContext('2d',{alpha:false});
  const capture=()=>{
   if(stopped||!socket.connected||!context||video.readyState<2)return;
   try{
    const w=video.videoWidth||640,h=video.videoHeight||360;
    const ratio=Math.min(640/w,360/h),tw=Math.round(w*ratio),th=Math.round(h*ratio);
    context.fillStyle='#081321';context.fillRect(0,0,640,360);
    context.drawImage(video,(640-tw)/2,(360-th)/2,tw,th);
    let image=canvas.toDataURL('image/jpeg',.39);
    if(image.length>MAX_URI){
     image=canvas.toDataURL('image/jpeg',.24);
    }
    if(image.length>=300&&image.length<=MAX_URI){
     socket.emit('student:screenWallFrame',{jpeg:image});
     setStatus('sharing');
    }else setStatus('image-too-large');
   }catch{setStatus('screen-unavailable')}
  };
  onRef.current=true;
  socket.emit('student:screenWallConsent',{enabled:true});
  setStatus('starting');
  video.play().catch(()=>{if(!stopped)setStatus('screen-unavailable')});
  const first=setTimeout(capture,1600);
  const timer=setInterval(capture,EVERY_MS);
  return()=>{
   stopped=true;clearTimeout(first);clearInterval(timer);
   if(socket.connected)socket.emit('student:screenWallConsent',{enabled:false});
   onRef.current=false;
   video.pause();video.srcObject=null;canvas.width=0;canvas.height=0;
  };
 },[socket,screen,active,requested,allowed]);
 return {requested,allowed,setAllowed,status};
}
