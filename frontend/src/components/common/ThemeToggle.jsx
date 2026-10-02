import { useAccount } from './AccountBootstrap'
import { accountApi } from '../../services/accountApi'
import { updateAccount } from '../../services/session'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
const KEY='dps.ui.theme'
export default function ThemeToggle(){
 const account=useAccount()
 const [mode,setMode]=useState(()=>{try{return localStorage.getItem(KEY)||'light'}catch{return'light'}})
 useEffect(()=>{document.documentElement.dataset.theme=mode;try{localStorage.setItem(KEY,mode)}catch{}},[mode])
 useEffect(()=>{if(account.student?.theme){const t=account.student.theme;setMode(t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t)}},[account.student?.theme])
 const toggle=()=>{const next=mode==='dark'?'light':'dark';setMode(next);if(account.student&&!account.student.mustChangePassword)accountApi('/student/profile',{method:'PUT',body:{displayName:account.student.displayName,avatar:account.student.avatar,theme:next}}).then(r=>updateAccount({student:r.student})).catch(()=>{})}
 return <button className="btn btn-ghost btn-sm" type="button" aria-label={mode==='dark'?'Switch to light theme':'Switch to dark theme'} title={mode==='dark'?'Light theme':'Dark theme'} onClick={toggle}>{mode==='dark'?<Sun size={17}/>:<Moon size={17}/>}<span className="sr-only">Toggle theme</span></button>
}
