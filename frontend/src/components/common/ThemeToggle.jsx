import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
const KEY='dps.ui.theme'
export default function ThemeToggle(){
 const [mode,setMode]=useState(()=>{try{return localStorage.getItem(KEY)||'light'}catch{return'light'}})
 useEffect(()=>{document.documentElement.dataset.theme=mode;try{localStorage.setItem(KEY,mode)}catch{}},[mode])
 return <button className="btn btn-ghost btn-sm" type="button" aria-label={mode==='dark'?'Switch to light theme':'Switch to dark theme'} title={mode==='dark'?'Light theme':'Dark theme'} onClick={()=>setMode(mode==='dark'?'light':'dark')}>{mode==='dark'?<Sun size={17}/>:<Moon size={17}/>}<span className="sr-only">Toggle theme</span></button>
}
