import {useState} from 'react'
import {Activity,Camera,ChevronDown,ChevronUp,Eye,MonitorUp,Wifi,WifiOff} from 'lucide-react'
import VideoTile from './VideoTile'

// The initial exam-consent screen explains both live WebRTC and low-bandwidth
// temporary stills. This indicator NEVER initiates a second media permission.
export default function MonitoringIndicator({
 webcamStream,screenStream,activityMonitoring=true,connected=true,
 snapshotRequested=false,snapshotAllowed=false,snapshotStatus='off',
 screenWallRequested=false,screenWallAllowed=false,screenWallStatus='off',
 onEnableScreen,screenOptInBusy=false,screenOptInMessage='',
 optionalScreen=false,onStopScreen
}){
 const [open,setOpen]=useState(false)
 const cameraLive=webcamStream?.getVideoTracks().some(t=>t.readyState==='live')
 const screenLive=screenStream?.getVideoTracks().some(t=>t.readyState==='live')
 const webcamStills=Boolean(snapshotRequested&&snapshotAllowed&&snapshotStatus==='sharing')
 const screenStills=Boolean(screenWallRequested&&screenWallAllowed&&screenWallStatus==='sharing')
 return <aside aria-label="Exam monitoring and sharing status"
  className="fixed bottom-4 left-4 z-40 w-[min(310px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-dps-green/40 bg-navy-900/95 shadow-glow backdrop-blur-xl">
  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-white"
   onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
   <span className="live-dot" aria-hidden="true"/>
   <Eye size={15} className="text-dps-neon"/>
   {cameraLive||screenLive?'Sharing with exam monitoring':'Exam activity monitoring'}
   {open?<ChevronDown size={15} className="ml-auto"/>:<ChevronUp size={15} className="ml-auto"/>}
  </button>
  <div className="flex flex-wrap gap-1 border-t border-white/10 px-3 py-2 text-[11px]">
   {cameraLive&&<span className="chip border-emerald-400/30 text-emerald-200"><Camera size={11}/> Camera on</span>}
   {screenLive&&<span className="chip border-sky-400/30 text-sky-200"><MonitorUp size={11}/> Screen on</span>}
   {activityMonitoring&&<span className="chip"><Activity size={11}/> Exam activity</span>}
   {!connected&&<span className="chip text-orange-300"><WifiOff size={11}/> Reconnecting</span>}
  </div>
  {open&&<div className="space-y-3 border-t border-white/10 p-3 text-xs">
   <p className="leading-relaxed text-slate-300">
    Your camera and screen were authorized before you started. The verified exam teacher can view these feeds while the exam is open; an additional approval window is not required.
   </p>
   {cameraLive&&<VideoTile stream={webcamStream} label="Your local camera preview" icon={Camera} mirror className="aspect-video"/>}
   <div className="space-y-2 rounded-lg border border-white/10 p-2">
    {cameraLive&&<p className="text-emerald-200"><Camera size={12} className="mr-1 inline"/> {webcamStills?'Temporary camera stills are being sent to the teacher.':snapshotRequested?'A camera preview was requested. '+(snapshotStatus==='webcam-unavailable'?'Your camera is unavailable.':'Connecting…'):'Camera permission is active. Live video connects when the teacher opens your details.'}</p>}
    {screenLive&&<p className="text-sky-200"><MonitorUp size={12} className="mr-1 inline"/> {screenStills?'Temporary screen stills are appearing in the teacher’s screen wall.':screenWallRequested?'Your already-shared screen is connecting to the teacher wall…':'Screen permission is active. The teacher can open the screen wall.'}</p>}
    <p className="text-slate-400">A local preview does not prove the teacher's connection is established. Stills are relayed only while an authorized teacher is viewing, not stored in the portal.</p>
   </div>
   {!screenLive&&optionalScreen&&<section className="rounded-lg border border-sky-400/30 p-2">
    <p className="text-slate-300">Optional screen sharing isn't active. Only you can start it using your browser's screen-selection prompt.</p>
    <button type="button" className="btn btn-ghost btn-sm mt-2 w-full" disabled={screenOptInBusy||!connected} onClick={onEnableScreen}>
     <MonitorUp size={14}/> {screenOptInBusy?'Waiting for browser…':'Start optional screen sharing'}
    </button>
    {screenOptInMessage&&<p role="status" className="mt-2 text-sky-200">{screenOptInMessage}</p>}
   </section>}
   {screenLive&&optionalScreen&&<button type="button" className="btn btn-ghost btn-sm w-full" onClick={onStopScreen}>Stop optional screen sharing</button>}
   <p className="flex items-center gap-1 text-slate-400">
    {connected?<Wifi size={13}/>:<WifiOff size={13}/>}
    {connected?'Exam connection online; video connects separately over WebRTC or still-image relay.':'Connection interrupted. Sharing will pause until reconnection.'}
   </p>
   <p className="text-slate-500">You can end capture with your browser's sharing controls. A required feed may need to be restored before the exam can continue.</p>
  </div>}
 </aside>
}
