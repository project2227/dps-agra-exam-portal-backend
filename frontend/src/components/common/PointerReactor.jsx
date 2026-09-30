import {useEffect} from 'react'
export default function PointerReactor(){
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||matchMedia('(pointer: coarse)').matches)return
  let frame=0
  const move=e=>{
   const el=e.target instanceof Element?e.target.closest('.glass,.btn,.motion-surface'):null
   if(!el)return
   cancelAnimationFrame(frame)
   frame=requestAnimationFrame(()=>{
    const r=el.getBoundingClientRect()
    el.style.setProperty('--px',e.clientX-r.left+'px')
    el.style.setProperty('--py',e.clientY-r.top+'px')
   })
  }
  document.addEventListener('pointermove',move,{passive:true})
  return()=>{document.removeEventListener('pointermove',move);cancelAnimationFrame(frame)}
 },[])
 return null
}
