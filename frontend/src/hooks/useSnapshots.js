import {useEffect,useRef,useState} from 'react'
const EVERY_MS=4200,MAX_URI=130000

// This only uses the already-consented webcam stream obtained before the
// exam. A teacher selecting a student does not trigger a second permission
// request. The participant always sees that stills are being forwarded.
export function useStudentSnapshots(socket,webcam,active){
 const [requested,setRequested]=useState(false)
 const [status,setStatus]=useState('off')
 const sent=useRef(false)
 const live=Boolean(webcam?.getVideoTracks().some(t=>t.readyState==='live'))
 const allowed=Boolean(active&&live)
 useEffect(()=>{
  if(!socket){setRequested(false);return}
  const onRequest=p=>{
   if(typeof p?.requested!=='boolean')return
   setRequested(p.requested)
   setStatus(p.requested?'waiting-for-stream':'off')
  }
  const disconnected=()=>{sent.current=false;setRequested(false);setStatus('reconnecting')}
  socket.on('teacher:snapshotRequested',onRequest)
  socket.on('disconnect',disconnected)
  return()=>{
   socket.off('teacher:snapshotRequested',onRequest)
   socket.off('disconnect',disconnected)
  }
 },[socket])
 useEffect(()=>{
  const ready=active&&requested&&live&&socket?.connected
  if(!ready){
   if(sent.current&&socket?.connected)socket.emit('student:snapshotConsent',{enabled:false})
   sent.current=false
   if(requested&&!live)setStatus('webcam-unavailable')
   return
  }
  let stopped=false
  const video=document.createElement('video')
  video.srcObject=webcam;video.autoplay=true;video.muted=true;video.playsInline=true
  const canvas=document.createElement('canvas')
  canvas.width=320;canvas.height=240
  const context=canvas.getContext('2d',{alpha:false})
  const send=()=>{
   if(stopped||!socket.connected||video.readyState<2||!context||
      !webcam.getVideoTracks().some(t=>t.readyState==='live'))return
   try{
    context.drawImage(video,0,0,320,240)
    let jpeg=canvas.toDataURL('image/jpeg',.44)
    if(jpeg.length>MAX_URI)jpeg=canvas.toDataURL('image/jpeg',.27)
    if(jpeg.length>=300&&jpeg.length<=MAX_URI){
     socket.emit('student:snapshotFrame',{jpeg})
     setStatus('sharing')
    }else setStatus('image-too-large')
   }catch{setStatus('webcam-unavailable')}
  }
  sent.current=true
  socket.emit('student:snapshotConsent',{enabled:true})
  setStatus('starting')
  video.play().catch(()=>{if(!stopped)setStatus('webcam-unavailable')})
  const first=setTimeout(send,1100)
  const interval=setInterval(send,EVERY_MS)
  return()=>{
   stopped=true;clearTimeout(first);clearInterval(interval)
   if(socket.connected)socket.emit('student:snapshotConsent',{enabled:false})
   sent.current=false
   video.pause();video.srcObject=null;canvas.width=0;canvas.height=0
  }
 },[socket,webcam,active,requested,live])
 return {requested,allowed,status}
}
