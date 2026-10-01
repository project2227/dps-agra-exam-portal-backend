import {useCallback,useEffect,useRef,useState} from 'react'
const MAX_URI=160000;
const VALID=/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
export function useTeacherScreenWall(socket,examId,enabled){
 const [frames,setFrames]=useState({});
 const [statuses,setStatuses]=useState({});
 const [state,setState]=useState('off');
 const ready=useRef(false),frameRef=useRef({});
 const setStatus=(id,next)=>setStatuses(old=>({...old,[id]:next}));
 const clear=useCallback(()=>{frameRef.current={};setFrames({});setStatuses({})},[]);
 const request=useCallback(()=>{
  if(!enabled||!socket?.connected||!ready.current)return;
  socket.emit('teacher:screenWallStart',{examId});
 },[socket,examId,enabled]);
 useEffect(()=>{
  if(!socket||!examId)return;
  const joined=()=>{ready.current=true;request()};
  const disconnected=()=>{ready.current=false;setState('reconnecting');clear()};
  const onState=p=>{
   if(p?.examId!==examId)return;
   setState(p.status||'off');
  };
  const onFrame=p=>{
   if(!enabled||!p||typeof p.sessionId!=='string'||
      typeof p.jpeg!=='string'||p.jpeg.length>MAX_URI||
      !VALID.test(p.jpeg))return;
   // Keep only the most recent transient frame per student in memory.
   const item={jpeg:p.jpeg,ts:p.ts||new Date().toISOString()};
   frameRef.current[p.sessionId]=item;
   setFrames(previous=>({...previous,[p.sessionId]:item}));
   setStatus(p.sessionId,'sharing');
  };
  const onStudent=p=>{if(p?.sessionId)setStatus(p.sessionId,p.status)};
  socket.on('teacher:monitorJoined',joined);
  socket.on('disconnect',disconnected);
  socket.on('teacher:screenWallStatus',onState);
  socket.on('teacher:screenWallFrame',onFrame);
  socket.on('teacher:screenWallStudentStatus',onStudent);
  // joinMonitorRoom can precede this hook's effect if a teacher clicks quickly.
  if(socket.connected&&enabled)request();
  return()=>{
   socket.off('teacher:monitorJoined',joined);
   socket.off('disconnect',disconnected);
   socket.off('teacher:screenWallStatus',onState);
   socket.off('teacher:screenWallFrame',onFrame);
   socket.off('teacher:screenWallStudentStatus',onStudent);
  };
 },[socket,examId,enabled,request,clear]);
 useEffect(()=>{
  if(!enabled){
   if(socket?.connected)socket.emit('teacher:screenWallStop',{examId});
   clear();setState('off');return;
  }
  // Teacher switches to wall mode deliberately; the server verifies ownership.
  if(socket?.connected&&ready.current)request();
  const t=setInterval(()=>{
   if(socket?.connected&&ready.current)
    socket.emit('teacher:screenWallKeepalive',{examId});
  },17000);
  return()=>{
   clearInterval(t);
   if(socket?.connected)socket.emit('teacher:screenWallStop',{examId});
   clear();
  };
 },[enabled,socket,examId,request,clear]);
 return {frames,statuses,state};
}
