'use strict';
const {parentPort,workerData}=require('node:worker_threads');
(async()=>{
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:new Uint8Array(workerData.bytes),isEvalSupported:false,enableXfa:false,disableFontFace:true,useWorkerFetch:false,verbosity:0});
 let doc;
 try{
  doc=await task.promise;
  if(doc.numPages>40)throw Error('page-limit');
  const pages=[];let chars=0;
  for(let n=1;n<=doc.numPages;n++){
   const page=await doc.getPage(n),content=await page.getTextContent();
   const text=content.items.map(x=>typeof x.str==='string'?x.str+(x.hasEOL?'\n':' '):'').join('').trim();
   chars+=text.length;if(chars>120000)throw Error('text-limit');pages.push({page:n,text});page.cleanup();
  }
  parentPort.postMessage({pages});
 }finally{if(doc)await doc.destroy();else await task.destroy();}
})().catch(e=>{parentPort.postMessage({error:e.message==='page-limit'?'page-limit':e.message==='text-limit'?'text-limit':e.name==='PasswordException'?'password':'invalid'});});
