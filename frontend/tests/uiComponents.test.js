import test,{after,afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,mkdir,rm} from 'node:fs/promises'
import {fileURLToPath,pathToFileURL} from 'node:url'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {build} from 'esbuild'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://example.test',pretendToBeVisual:true})
for(const key of ['window','document','HTMLElement','SVGElement','Element','Node','MutationObserver','localStorage','sessionStorage','getComputedStyle'])globalThis[key]=key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key]
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true})
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.IS_REACT_ACT_ENVIRONMENT=true
window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}})
window.scrollTo=()=>{}
const cache=path.join(root,'.test-cache',String(process.pid));await mkdir(cache,{recursive:true})
await build({stdin:{contents:`export {default as Button} from './src/components/common/Button';export {default as Input} from './src/components/common/Input';export {default as Modal} from './src/components/common/Modal';export {default as Loader} from './src/components/common/Loader';export {default as Skeleton} from './src/components/common/Skeleton';export {default as StatusBadge} from './src/components/common/StatusBadge';export {default as MotionProvider} from './src/components/common/Motion';export {ToastProvider,useToast} from './src/components/common/Toast';export {default as PageTransition} from './src/components/common/PageTransition';`,resolveDir:root,loader:'jsx'},outfile:path.join(cache,'ui.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',define:{'import.meta.env.BASE_URL':'"/"'}})
const React=await import('react'),{MemoryRouter,Link}=await import('react-router-dom')
const {render,screen,cleanup,waitFor}=await import('@testing-library/react'),{default:userEvent}=await import('@testing-library/user-event')
const ui=await import(pathToFileURL(path.join(cache,'ui.mjs')))
const h=React.createElement
const wrap=child=>h(ui.MotionProvider,null,h(MemoryRouter,{future:{v7_startTransition:true,v7_relativeSplatPath:true}},child))
afterEach(()=>{cleanup();document.documentElement.removeAttribute('data-reduce-motion')})
after(async()=>{dom.window.close();await rm(cache,{recursive:true,force:true})})
test('button is a labelled keyboard control and does not accidentally submit',async()=>{
 let submitted=0,pressed=0;render(wrap(h('form',{onSubmit:e=>{e.preventDefault();submitted++}},h(ui.Button,{onClick:()=>pressed++},'Refresh exam list'))))
 const button=screen.getByRole('button',{name:'Refresh exam list'});button.focus();await userEvent.setup().keyboard('{Enter}');assert.equal(pressed,1);assert.equal(submitted,0)
})
test('input label, inline error and invalid state are associated',()=>{
 render(wrap(h(ui.Input,{label:'Admission number',error:'Enter your admission number.',required:true})))
 const input=screen.getByLabelText('Admission number',{exact:false});assert.equal(input.getAttribute('aria-invalid'),'true');assert.equal(document.getElementById(input.getAttribute('aria-describedby')).textContent,'Enter your admission number.');assert.ok(input.required)
})
test('input hint remains accessible without marking the control invalid',()=>{
 render(wrap(h(ui.Input,{label:'Passcode',hint:'Ask your teacher for this exam’s passcode.'})))
 const input=screen.getByLabelText('Passcode');assert.ok(!input.getAttribute('aria-invalid'));assert.match(document.getElementById(input.getAttribute('aria-describedby')).textContent,/teacher/)
})
test('all key exam statuses communicate an icon and readable text',()=>{
 const statuses=['live','upcoming','ended','flagged','passed','failed'];render(wrap(h('div',null,statuses.map(status=>h(ui.StatusBadge,{key:status,status})))))
 for(const status of statuses){const badge=screen.getByText(status[0].toUpperCase()+status.slice(1));assert.ok(badge.querySelector('svg,[aria-hidden="true"]'))}
})
test('dialog traps keyboard focus, closes with Escape and restores its trigger',async()=>{
 function Demo(){const [open,setOpen]=React.useState(false);return h('div',null,h(ui.Button,{onClick:()=>setOpen(true)},'Open review'),h(ui.Modal,{open,onClose:()=>setOpen(false),title:'Review answers'},h(ui.Input,{label:'Comment'}),h(ui.Button,null,'Submit answers')))}
 render(wrap(h(Demo)));const user=userEvent.setup(),trigger=screen.getByRole('button',{name:'Open review'});await user.click(trigger);const dialog=screen.getByRole('dialog',{name:'Review answers'});assert.ok(document.activeElement===dialog,'Dialog receives focus')
 await user.tab({shift:true});assert.ok(document.activeElement===screen.getByRole('button',{name:'Submit answers'}),'Shift+Tab reaches last control');await user.tab();assert.ok(document.activeElement===screen.getByRole('button',{name:'Close'}),'Tab wraps to first control');await user.keyboard('{Escape}');await waitFor(()=>assert.ok(screen.queryByRole('dialog')===null,'Dialog closes'));assert.ok(document.activeElement===trigger,'Trigger receives focus')
})
test('required consent dialog cannot be dismissed by Escape',async()=>{
 let closed=0;render(wrap(h(ui.Modal,{open:true,dismissible:false,onClose:()=>closed++,title:'Before you start'},h(ui.Button,null,'Start exam'))));await userEvent.setup().keyboard('{Escape}');assert.equal(closed,0);assert.ok(screen.getByRole('dialog'));assert.equal(screen.queryByRole('button',{name:'Close'}),null)
})
test('toast announces feedback and exposes a dismissal control',async()=>{
 function Demo(){const toast=ui.useToast();return h(ui.Button,{onClick:()=>toast('Profile saved.')},'Save profile')}
 render(wrap(h(ui.ToastProvider,null,h(Demo))));const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Save profile'}));assert.ok(screen.getByText('Profile saved.').closest('[aria-live="polite"]'));await user.click(screen.getByRole('button',{name:'Dismiss notification'}));await waitFor(()=>assert.ok(screen.queryByText('Profile saved.')===null,'Toast dismisses'))
})
test('loader explains a cold start and skeleton has an accessible loading label',()=>{
 render(wrap(h('div',null,h(ui.Loader,{server:true}),h(ui.Skeleton,{label:'Loading exam cards'}))));assert.ok(screen.getByText('Waking up the server — this can take up to a minute on first visit.'));assert.ok(screen.getByRole('status',{name:'Loading exam cards'}))
})
test('route presentation preserves mounted state, including with reduced motion',async()=>{
 document.documentElement.dataset.reduceMotion='true';let mounts=0
 function Stateful(){const [value,setValue]=React.useState('');React.useEffect(()=>{mounts++},[]);return h('input',{'aria-label':'Unsaved draft',value,onChange:e=>setValue(e.target.value)})}
 render(wrap(h(ui.PageTransition,null,h(Stateful),h(Link,{to:'/student/exam/fixture'},'Open exam'))));const user=userEvent.setup();await user.type(screen.getByLabelText('Unsaved draft'),'Keep this answer');await user.click(screen.getByRole('link',{name:'Open exam'}));assert.equal(mounts,1);assert.equal(screen.getByLabelText('Unsaved draft').value,'Keep this answer')
})
test('light and dark text, semantic status and focus colours meet AA contrast',async()=>{
 const css=await readFile(path.join(root,'src/styles/globals.css'),'utf8')
 const blocks=[css.slice(css.indexOf(':root {'),css.indexOf("html[data-theme='dark']")),css.slice(css.indexOf("html[data-theme='dark']"),css.indexOf('  html {'))]
 const luminance=rgb=>rgb.map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)
 const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
 for(const block of blocks){const tokens=Object.fromEntries([...block.matchAll(/--([a-z-]+): (\d+) (\d+) (\d+)/g)].map(m=>[m[1],m.slice(2).map(Number)]));for(const text of ['ink','muted','green'])for(const bg of ['paper','surface'])assert.ok(ratio(tokens[text],tokens[bg])>=4.5,`${text} on ${bg}`);for(const tone of ['success','warning','danger','info'])assert.ok(ratio(tokens[tone],tokens[tone+'-soft'])>=4.5,tone);assert.ok(ratio(tokens['control-line'],tokens.surface)>=3,'Input border');assert.ok(ratio(tokens.green,tokens.inverse)>=4.5,'Primary button')}
})
