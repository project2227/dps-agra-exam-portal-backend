import {useCallback,useEffect,useRef,useState} from 'react'

// Only the selected student is watched. JPEGs are never put in persistent
// browser storage, logs, teacher-room broadcasts, or exam grading.
export function useTeacherSnapshots(socket) {
 const selected=useRef(null)
 const ready=useRef(false)
 const timer=useRef(null)
 const [frames,setFrames]=useState({})
 const [statuses,setStatuses]=useState({})
 const status=(id,next)=>setStatuses(old=>({...old,[id]:next}))
 const stop=useCallback(id=>{
  if(!id||selected.current!==id)return
  if(socket?.connected)socket.emit('teacher:snapshotUnsubscribe',{sessionId:id})
  clearInterval(timer.current);timer.current=null
  selected.current=null
  setFrames(old=>{const next={...old};delete next[id];return next})
  setStatuses(old=>({...old,[id]:'off'}))
 },[socket])
 const subscribe=useCallback(id=>{
  if(!id||!socket)return
  if(selected.current&&selected.current!==id)stop(selected.current)
  selected.current=id
  setFrames(old=>{const next={...old};delete next[id];return next})
  setStatuses(old=>({...old,[id]:'requesting'}))
  if(socket.connected&&ready.current)socket.emit('teacher:snapshotSubscribe',{sessionId:id})
  clearInterval(timer.current)
  // A lease prevents a forgotten browser tab from obtaining snapshots forever.
  timer.current=setInterval(()=>{
   if(selected.current===id&&socket.connected&&ready.current)
    socket.emit('teacher:snapshotKeepalive',{sessionId:id})
  },17000)
 },[socket,stop])
 useEffect(()=>{
  if(!socket)return
  const onJoined=()=>{
   ready.current=true
   if(selected.current)
    socket.emit('teacher:snapshotSubscribe',{sessionId:selected.current})
  }
  const onDisconnect=()=>{
   ready.current=false
   if(selected.current){
    status(selected.current,'reconnecting')
    setFrames({})
   }
  }
  const onFrame=frame=>{
   if(!frame||frame.sessionId!==selected.current||
      typeof frame.jpeg!=='string'||frame.jpeg.length>130000||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame.jpeg))return
   setFrames({[frame.sessionId]:{jpeg:frame.jpeg,ts:frame.ts||new Date().toISOString()}})
   status(frame.sessionId,'sharing')
  }
  const onStatus=packet=>{
   if(!packet||packet.sessionId!==selected.current)return
   status(packet.sessionId,packet.status)
   if(['student-stopped','student-offline','not-consented','session-ended','stopped'].includes(packet.status))
    setFrames({})
  }
  socket.on('teacher:monitorJoined',onJoined)
  socket.on('disconnect',onDisconnect)
  socket.on('teacher:snapshotFrame',onFrame)
  socket.on('teacher:snapshotStatus',onStatus)
  return()=>{
   if(selected.current&&socket.connected)
    socket.emit('teacher:snapshotUnsubscribe',{sessionId:selected.current})
   selected.current=null;ready.current=false
   clearInterval(timer.current)
   socket.off('teacher:monitorJoined',onJoined)
   socket.off('disconnect',onDisconnect)
   socket.off('teacher:snapshotFrame',onFrame)
   socket.off('teacher:snapshotStatus',onStatus)
  }
 },[socket])
 return {frames,statuses,subscribe,stop}
}
