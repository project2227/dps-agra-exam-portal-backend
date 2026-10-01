import {useCallback,useEffect,useRef,useState} from 'react'
import {releaseRequest} from '../services/releaseApi'
const TRIGGERS={tab_hidden:'TAB_SWITCH',window_blur:'WINDOW_BLUR',fullscreen_exit:'FULLSCREEN_EXIT'}
const BUFFER_LIMIT=12*1024*1024,CHUNK_SIZE=512*1024
export function useIncidentRecorder(screen,active,consented) {
 const [state,setState]=useState({status:'idle',message:''})
 const current=useRef(null),context=useRef({screen,active,consented}),mounted=useRef(true)
 context.current={screen,active,consented}
 const notify=next=>{if(mounted.current)setState(next)}
 const finish=useCallback(async(reason='returned-to-fullscreen')=>{
  const entry=current.current
  if(!entry)return
  entry.reason=reason
  if(entry.recorder.state!=='inactive')entry.recorder.stop()
  return entry.finished
 },[])
 const report=useCallback(type=>{
  if(['fullscreen_enter','window_focus','tab_visible'].includes(type)) {
   if(document.fullscreenElement&&document.visibilityState==='visible'&&document.hasFocus())finish()
   return
  }
  const trigger=TRIGGERS[type],ctx=context.current
  if(!trigger||!ctx.active||current.current)return
  if(!ctx.consented||!ctx.screen?.getVideoTracks().some(t=>t.readyState==='live')) {
   notify({status:'unavailable',message:'Screen incident logged. Recording requires your screen-sharing and incident-recording consent.'});return
  }
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>window.MediaRecorder?.isTypeSupported(t))
  if(!mime){notify({status:'unavailable',message:'This browser cannot record WebM clips. Your teacher still receives the activity flag.'});return}
  try {
   const recorder=new MediaRecorder(new MediaStream(ctx.screen.getVideoTracks()),{mimeType:mime,videoBitsPerSecond:180000})
   let resolve
   const entry={recorder,reason:'returned-to-fullscreen',sequence:0,queued:0,uploaded:0,failed:false,error:'',finished:new Promise(r=>{resolve=r})}
   const fail=(error,reason)=>{entry.failed=true;entry.error=error.message||String(error);notify({status:'error',message:entry.error});finish(reason)}
   current.current=entry
   const opened=releaseRequest('/student/incidents',{role:'student',method:'POST',body:{clientId:crypto.randomUUID(),triggerType:trigger,mimeType:mime}})
   entry.chain=opened.catch(error=>{fail(error,'recording-start-failed');return null})
   recorder.ondataavailable=event=>{
    if(!event.data.size||entry.failed)return
    if(entry.queued+event.data.size>BUFFER_LIMIT){fail(new Error('Recording buffer is full. Ask your teacher to check the connection.'),'network-buffer-full');return}
    // Background tabs can produce one large WebM Blob. Split bytes without
    // transcoding; concatenation on the server preserves the original stream.
    for(let offset=0;offset<event.data.size;offset+=CHUNK_SIZE){
     const part=event.data.slice(offset,offset+CHUNK_SIZE),sequence=entry.sequence++
     entry.queued+=part.size
     entry.chain=entry.chain.then(async record=>{
      if(!record||entry.failed){entry.queued-=part.size;return record}
      const form=new FormData();form.append('chunk',part,'screen.webm')
      let problem
      for(let retry=0;retry<3;retry++){
       try{await releaseRequest('/student/incidents/'+record.recordingId+'/chunks/'+sequence,{role:'student',method:'POST',body:form});problem=null;break}
       catch(error){problem=error;if(error.status&&error.status<500)break;await new Promise(r=>setTimeout(r,500*(retry+1)))}
      }
      entry.queued-=part.size
      if(problem)fail(problem,'upload-incomplete')
      else entry.uploaded+=part.size
      return record
     }).catch(error=>{fail(error,'upload-incomplete');return null})
    }
   }
   recorder.onstop=async()=>{
    if(!entry.failed)notify({status:'saving',message:'Saving the screen incident…'})
    try {
     const record=await entry.chain
     if(record)await releaseRequest('/student/incidents/'+record.recordingId+'/finish',{role:'student',method:'POST',body:{reason:entry.reason}})
    }catch(error){entry.failed=true;entry.error=error.message}
    if(current.current===entry)current.current=null
    notify(entry.failed?{status:'error',message:entry.error||'The clip upload was interrupted; the activity flag is still saved.'}:entry.uploaded?{status:'saved',message:'Incident saved for your teacher. Recording has stopped.'}:{status:'unavailable',message:'The browser produced no screen frames for this short incident. The activity flag is still saved.'})
    resolve()
   }
   recorder.onerror=()=>fail(new Error('The browser stopped recording. The activity flag is still available to your teacher.'),'browser-recording-error')
   recorder.start(2000)
   notify({status:'recording',message:'Screen incident recording is on. Return to the exam, focus this window and enter fullscreen to stop it.'})
  }catch(error){current.current=null;notify({status:'error',message:error.message||'Could not record this screen incident.'})}
 },[finish])
 useEffect(()=>{if(!active||!screen)finish(active?'screen-sharing-stopped':'exam-ended')},[screen,active,finish])
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;finish('page-left')}},[finish])
 return {...state,report,finish}
}
