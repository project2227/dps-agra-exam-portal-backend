import {useEffect,useRef,useState} from 'react'
const CAPTURE_EVERY_MS=4200
const MAX_JPEG_DATA_URI=130000

/**
 * Opt-in teacher-requested JPEG stills. The camera stream must already have
 * been created by the student's explicit browser/consent interaction.
 * Still images go over authenticated Socket.IO only while an authorized
 * teacher has requested them. No recording, face recognition, or gaze scoring.
 */
export function useStudentSnapshots(socket,webcam,active) {
 const [requested,setRequested]=useState(false)
 const [allowed,setAllowed]=useState(false)
 const [status,setStatus]=useState('off')
 const sessionRef=useRef(false)
 useEffect(()=>{
  if(!socket||!active){setRequested(false);setAllowed(false);return}
  const request=packet=>{
   const needed=packet?.requested===true
   setRequested(needed)
   if(!needed){setAllowed(false);setStatus('off')}
   else setStatus(old=>old==='sharing'?old:'permission-needed')
  }
  const disconnected=()=>{
   // Reconnection requires a new, explicit opt-in.
   sessionRef.current=false
   setRequested(false);setAllowed(false);setStatus('reconnecting')
  }
  socket.on('teacher:snapshotRequested',request)
  socket.on('disconnect',disconnected)
  return()=>{
   socket.off('teacher:snapshotRequested',request)
   socket.off('disconnect',disconnected)
  }
 },[socket,active])
 useEffect(()=>{
  const ready=active&&requested&&allowed&&socket?.connected&&
    webcam?.getVideoTracks().some(t=>t.readyState==='live')
  if(!ready){
   if(sessionRef.current && socket?.connected)
     socket.emit('student:snapshotConsent',{enabled:false})
   sessionRef.current=false
   if(allowed && (!webcam || !webcam.getVideoTracks().some(t=>t.readyState==='live')))
    setStatus('webcam-unavailable')
   return
  }
  let closed=false
  const video=document.createElement('video')
  video.srcObject=webcam
  video.muted=true;video.playsInline=true;video.autoplay=true
  const canvas=document.createElement('canvas')
  canvas.width=320;canvas.height=240
  const ctx=canvas.getContext('2d',{alpha:false})
  const send=()=>{
   if(closed||!socket.connected||video.readyState<2||!ctx)return
   try{
    ctx.drawImage(video,0,0,320,240)
    const jpeg=canvas.toDataURL('image/jpeg',0.48)
    if(jpeg.length>=300 && jpeg.length<=MAX_JPEG_DATA_URI){
     socket.emit('student:snapshotFrame',{jpeg})
     setStatus('sharing')
    }else setStatus('image-too-large')
   }catch{
    setStatus('camera-unavailable')
   }
  }
  sessionRef.current=true
  socket.emit('student:snapshotConsent',{enabled:true})
  setStatus('starting')
  video.play().catch(()=>{if(!closed)setStatus('camera-unavailable')})
  const first=setTimeout(send,1100)
  const timer=setInterval(send,CAPTURE_EVERY_MS)
  return()=>{
   closed=true
   clearTimeout(timer);clearTimeout(first)
   if(socket.connected)socket.emit('student:snapshotConsent',{enabled:false})
   sessionRef.current=false
   video.pause();video.srcObject=null
   canvas.width=0;canvas.height=0
  }
 },[socket,webcam,active,requested,allowed])
 return {requested,allowed,setAllowed,status}
}
