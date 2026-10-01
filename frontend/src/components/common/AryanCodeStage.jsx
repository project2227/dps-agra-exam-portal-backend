import {useState} from 'react'
export default function AryanCodeStage(){
 const [ready,setReady]=useState(false)
 return <div className="aryan-code-stage"><span className="sr-only">Aryan.Code circuit-skull logo draws itself, lights its eyes and reacts to your pointer.</span>{!ready&&<div className="absolute inset-0 grid place-items-center text-xs font-mono text-dps-neon">ASSEMBLING IDENTITY…</div>}<iframe tabIndex={-1} onLoad={()=>setReady(true)} src={import.meta.env.BASE_URL+'brand/aryan-code-interactive.html?embed=1'} title="Aryan.Code interactive vector intro" sandbox="allow-scripts" className="h-full w-full border-0"/></div>
}
