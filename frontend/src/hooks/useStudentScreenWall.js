import {useEffect,useRef,useState} from 'react'

// The participant selects and permits their entire screen ONCE before the
// exam. This hook uses that already-granted track only while the authorized
// exam teacher is actively watching the bounded screen wall. No extra prompt.
const EVERY_MS=1500,MAX_URI=158000;
export function useStudentScreenWall(socket,screen,active){
 const [requested,setRequested]=useState(false);
 const [status,setStatus]=useState('off');
 const sent=useRef(false);
 const live=Boolean(screen?.getVideoTracks().some(t=>t.readyState==='live'));
 const allowed=Boolean(active&&live);
 useEffect(()=>{
  if(!socket){setRequested(false);return;}
  const onRequest=packet=>{
   if(typeof packet?.requested!=='boolean')return;
   setRequested(packet.requested);
   setStatus(packet.requested?'waiting-for-stream':'off');
  };
  const onDisconnect=()=>{setRequested(false);setStatus('reconnecting');sent.current=false;};
  socket.on('teacher:screenWallRequested',onRequest);
  socket.on('disconnect',onDisconnect);
  return()=>{
   socket.off('teacher:screenWallRequested',onRequest);
   socket.off('disconnect',onDisconnect);
  };
 },[socket]);
 useEffect(()=>{
  const ready=active&&requested&&live&&socket?.connected;
  if(!ready){
   if(sent.current&&socket?.connected)socket.emit('student:screenWallConsent',{enabled:false});
   sent.current=false;
   if(requested&&!live)setStatus('screen-unavailable');
   return;
  }
  let stopped=false;
  const video=document.createElement('video');
  video.srcObject=screen;video.autoplay=true;video.muted=true;video.playsInline=true;
  const canvas=document.createElement('canvas');
  canvas.width=640;canvas.height=360;
  const ctx=canvas.getContext('2d',{alpha:false});
  const capture=()=>{
   if(stopped||!socket.connected||!ctx||video.readyState<2||
      !screen.getVideoTracks().some(t=>t.readyState==='live'))return;
   try{
    const w=video.videoWidth||640,h=video.videoHeight||360;
    const scale=Math.min(640/w,360/h),tw=Math.max(1,Math.floor(w*scale)),th=Math.max(1,Math.floor(h*scale));
    ctx.fillStyle='#081321';ctx.fillRect(0,0,640,360);
    ctx.drawImage(video,(640-tw)/2,(360-th)/2,tw,th);
    let jpeg=canvas.toDataURL('image/jpeg',.36);
    if(jpeg.length>MAX_URI)jpeg=canvas.toDataURL('image/jpeg',.22);
    if(jpeg.length>=300&&jpeg.length<=MAX_URI){
     socket.volatile.emit('student:screenWallFrame',{jpeg,capturedAt:Date.now()});
     setStatus('sharing');
    }else setStatus('image-too-large');
   }catch{setStatus('screen-unavailable');}
  };
  sent.current=true;
  socket.emit('student:screenWallConsent',{enabled:true});
  setStatus('starting');
  video.play().catch(()=>{if(!stopped)setStatus('screen-unavailable')});
  video.addEventListener('loadeddata',capture);
  const first=setTimeout(capture,150);
  const timer=setInterval(capture,EVERY_MS);
  return()=>{
   stopped=true;clearTimeout(first);clearInterval(timer);video.removeEventListener('loadeddata',capture);
   if(socket.connected)socket.emit('student:screenWallConsent',{enabled:false});
   sent.current=false;
   video.pause();video.srcObject=null;canvas.width=0;canvas.height=0;
  };
 },[socket,screen,active,requested,live]);
 return {requested,allowed,status};
}
