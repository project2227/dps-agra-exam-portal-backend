// This entry exists only in the separately built staging visual bundle.
import React,{useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import App from '../App'
import {installFixtures} from './fixtures'
import '../styles/globals.css'
import '../styles/animations.css'
import '../styles/learning-remake.css'
import '../styles/exam-portal.css'
import '../styles/student-accounts.css'
const routes=['/','/about','/student','/student/login','/student/set-password','/student/forgot-password','/student/reset-password','/student/profile','/student/join','/student/dashboard','/student/exam/visual-exam','/student/practice','/student/practice/python','/student/practice/java','/student/practice/cpp','/student/practice/c','/student/practice/sql','/student/practice/web','/student/practice/blocks','/learn','/learn/profile','/learn/profile?guest=1','/learn/games','/learn/mock-exam','/learn/custom-test','/learn/arcade','/learn/course/python','/learn/course/java','/learn/course/cpp','/learn/course/c','/learn/course/sql','/learn/course/web','/learn/course/blocks','/learn/teacher-course/visual-course','/teacher/login','/teacher/request-access','/teacher','/teacher/dashboard','/teacher/classes','/teacher/students/visual-student','/teacher/exams/create','/teacher/exams/manage','/teacher/exams/visual-exam/monitor','/teacher/exams/visual-exam/monitor?view=cards','/teacher/submissions','/teacher/grades','/teacher/handouts','/teacher/exam-dates','/teacher/courses','/teacher/community','/teacher/manage-teachers','/teacher/test-data','/teacher/account','/page-not-found']
const listRoutes=['/student/join','/student/profile','/student/dashboard','/learn','/learn/profile','/teacher/dashboard','/teacher/classes','/teacher/students/visual-student','/teacher/exams/manage','/teacher/exams/visual-exam/monitor','/teacher/submissions','/teacher/grades','/teacher/handouts','/teacher/exam-dates','/teacher/courses','/teacher/community','/teacher/manage-teachers','/teacher/test-data']
const params=new URLSearchParams(location.search)
routes.push('/teacher/exams/create?edit=visual-draft','/teacher/exams/create?edit=visual-upcoming')
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
function measure(){
 const width=document.documentElement.clientWidth
 const fields=[...document.querySelectorAll('input,textarea,select')].filter(e=>!['hidden','button','submit','reset'].includes(e.type) && e.getClientRects().length && !e.closest('[inert],.monaco-editor'))
 const unlabelled=fields.filter(e=>!e.labels?.length && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).map(e=>e.placeholder || e.type || e.tagName).slice(0,12)
 const parse=value=>{const values=value.match(/[\d.]+/g)?.map(Number);return values?.length>=3?[...values.slice(0,3).map(n=>value.startsWith('color(srgb ')?n*255:n),values[3]??1]:null}
 const blend=(front,back)=>front.slice(0,3).map((x,i)=>x*front[3]+back[i]*(1-front[3]))
 const lum=rgb=>rgb.map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)
 const background=element=>{const chain=[];for(let node=element;node;node=node.parentElement)chain.unshift(node);let result=[244,245,239];for(const node of chain){const colour=parse(getComputedStyle(node).backgroundColor);if(colour)result=blend(colour,result)}return result}
 const contrast=[]
 for(const element of document.querySelectorAll('h1,h2,h3,h4,p,span,a,button,label,td,th,dt,dd,small,summary,legend')){
  if(!element.getClientRects().length || element.closest('.sr-only,[aria-hidden="true"],[inert],pre,code,.monaco-editor,[disabled]') || ![...element.childNodes].some(n=>n.nodeType===3 && n.textContent.trim()))continue
  const style=getComputedStyle(element);if(style.visibility==='hidden' || Number(style.opacity)===0)continue
  const fg=parse(style.color),bg=background(element);if(!fg)continue
  const text=blend(fg,bg),a=lum(text),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),size=parseFloat(style.fontSize),large=size>=24 || size>=18.66 && Number(style.fontWeight)>=700
  if(ratio<(large?3:4.5)-.02)contrast.push({text:element.textContent.trim().slice(0,75),ratio:Math.round(ratio*100)/100,className:element.className})
 }
 return {route:params.get('route'),width:window.innerWidth,contentWidth:width,theme:params.get('theme'),motion:params.get('motion'),state:params.get('state')||'populated',overflow:Math.max(0,document.documentElement.scrollWidth-width),unlabelled,contrast:contrast.slice(0,12),heading:document.querySelector('#main h1, [role="dialog"] h2, h1')?.textContent || '',errors:[...document.querySelectorAll('[data-qa-error]')].map(e=>e.textContent)}
}
if(params.get('frame')==='1'){
 installFixtures(params)
 window.addEventListener('error',event=>{const note=document.createElement('p');note.dataset.qaError='true';note.textContent=event.message;document.body.append(note)})
 window.addEventListener('message',async event=>{
  if(event.origin!==location.origin || event.data?.type!=='qa:inspect')return
  let ready=false
  for(let i=0;i<80;i++){if(document.querySelector('#main h1,[role="dialog"] h2,#main [role="alert"]')){ready=true;break}await pause(75)}
  await pause(450)
  // A disposable, local fixture action checks the active exam layout. Its transport
  // is synthetic, fullscreen is represented in the fixture, and media is absent.
  if(params.get('route')?.startsWith('/student/exam/') && params.get('state')!=='error'){
    const start=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Start exam')
    start?.click();await pause(300)
  }
  if(params.get('state')==='postpone'){
    [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Postpone exam')?.click();await pause(300)
  }
  if(params.get('state')==='ai-grade'){
    [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Review')?.click();await pause(300);
    [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Suggest marks with AI')?.click();await pause(300);
  }
  const report=measure();if(!ready)report.errors.push('Page did not finish opening within 6 seconds')
  parent.postMessage({type:'qa:report',id:event.data.id,report},location.origin)
 })
 createRoot(document.getElementById('root')).render(<App/> )
}else{
 function Gallery(){
  const [route,setRoute]=useState('/'),[width,setWidth]=useState(360),[theme,setTheme]=useState('light'),[motion,setMotion]=useState('normal'),[state,setState]=useState('populated'),[running,setRunning]=useState(false),[reports,setReports]=useState([]),[status,setStatus]=useState('Choose a page or run the complete route matrix.'),[source,setSource]=useState('')
  const frame=useRef(null),pending=useRef(null),serial=useRef(0)
  const srcFor=(r,w,t,m,s)=>`visual.html?frame=1&route=${encodeURIComponent(r)}&screen=${w}&theme=${t}&motion=${m}&state=${s}#${r}`
  const inspect=async(r,w,t,m,s)=>{
   setRoute(r);setWidth(w);setTheme(t);setMotion(m);setState(s)
   const id=++serial.current
   return new Promise(resolve=>{
    const onMessage=event=>{if(event.origin===location.origin && event.data?.type==='qa:report' && event.data.id===id){clearTimeout(timer);window.removeEventListener('message',onMessage);resolve(event.data.report)}}
    const timer=setTimeout(()=>{window.removeEventListener('message',onMessage);resolve({route:r,width:w,theme:t,motion:m,state:s,overflow:0,contrast:[],unlabelled:[],errors:['Visual fixture timed out']})},16000)
    window.addEventListener('message',onMessage)
    pending.current=()=>frame.current?.contentWindow?.postMessage({type:'qa:inspect',id},location.origin)
    setSource(srcFor(r,w,t,m,s).replace('#','&run='+id+'#'))
   })
  }
  const run=async()=>{
   setRunning(true);setReports([]);const output=[]
   for(const r of routes)for(const w of [360,768,1440])for(const t of ['light','dark'])for(const m of ['normal','reduced']){
    setStatus(`${output.length+1} of ${routes.length*12+listRoutes.length*2}: ${r} · ${w}px · ${t} · ${m}`)
    output.push(await inspect(r,w,t,m,'populated'));setReports([...output])
   }
   for(const r of listRoutes)for(const s of ['empty','error']){setStatus(`Checking ${s} state: ${r}`);output.push(await inspect(r,360,'dark','reduced',s));setReports([...output])}
   const failed=output.filter(x=>x.overflow>2 || x.unlabelled.length || x.contrast.length || x.errors.length)
   setStatus(`Complete: ${output.length} page checks, ${failed.length} need attention.`);setRunning(false)
  }
  const runPageMatrix=async()=>{
   const selectedRoute=route,selectedState=state,output=[];setRunning(true);setReports([])
   for(const w of [360,768,1440])for(const t of ['light','dark'])for(const m of ['normal','reduced']){
    setStatus(`${output.length+1} of 12: ${selectedRoute} · ${w}px · ${t} · ${m}`)
    output.push(await inspect(selectedRoute,w,t,m,selectedState));setReports([...output])
   }
   const failed=output.filter(x=>x.overflow>2 || x.unlabelled.length || x.contrast.length || x.errors.length)
   setStatus(`Complete: ${output.length} page checks, ${failed.length} need attention.`);setRunning(false)
  }
  const failed=reports.filter(x=>x.overflow>2 || x.unlabelled.length || x.contrast.length || x.errors.length)
  return <main className="p-5"><h1 className="text-2xl font-semibold">DPS portal visual checks</h1><p className="mt-2 text-sm text-muted">Staging-only fixtures. These pages use synthetic data, synthetic transport and no production credentials.</p><div className="mt-5 flex flex-wrap items-end gap-3"><label className="text-sm">Page<select aria-label="Preview page" className="input mt-1 max-w-sm" value={route} disabled={running} onChange={e=>{setRoute(e.target.value);setSource('')}}>{routes.map(r=><option key={r}>{r}</option>)}</select></label><label className="text-sm">Viewport<select className="input mt-1" value={width} disabled={running} onChange={e=>{setWidth(Number(e.target.value));setSource('')}}>{[360,768,1440].map(w=><option key={w} value={w}>{w}px</option>)}</select></label><label className="text-sm">Theme<select className="input mt-1" value={theme} disabled={running} onChange={e=>{setTheme(e.target.value);setSource('')}}><option>light</option><option>dark</option></select></label><label className="text-sm">Motion<select className="input mt-1" value={motion} disabled={running} onChange={e=>{setMotion(e.target.value);setSource('')}}><option>normal</option><option>reduced</option></select></label><label className="text-sm">Data state<select className="input mt-1" value={state} disabled={running} onChange={e=>{setState(e.target.value);setSource('')}}>{['populated','empty','error','postpone','ai-grade','ai-preview'].map(s=><option key={s}>{s}</option>)}</select></label><button className="btn btn-primary" type="button" disabled={running} onClick={run}>Run all page checks</button><button className="btn btn-ghost" type="button" disabled={running} onClick={runPageMatrix}>Check this page in all themes and sizes</button><button className="btn btn-ghost" type="button" disabled={running} onClick={async()=>{const r=await inspect(route,width,theme,motion,state);setReports([r]);setStatus('Current page checked.')}}>Check this page</button></div><p className="my-4 text-sm" role="status">{status}</p><details className="mb-5 rounded-xl border border-line p-4" open={failed.length>0}><summary className="font-semibold">Check report · {reports.length} completed · {failed.length} need attention</summary><pre id="qa-report" className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({completed:reports.length,failed,all:reports},null,2)}</pre></details><div className="overflow-x-auto rounded-xl border border-line"><iframe ref={frame} title="Portal page preview" onLoad={()=>pending.current?.()} src={source || srcFor(route,width,theme,motion,state)} style={{display:'block',width,height:900,border:0}}/></div></main>
 }
 createRoot(document.getElementById('root')).render(<Gallery/> )
}
