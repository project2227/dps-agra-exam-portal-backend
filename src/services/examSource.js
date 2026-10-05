'use strict';
const {Worker}=require('node:worker_threads');const path=require('node:path');const {must,HttpError}=require('../utils/http');
let parsing=false;
function chunksFor(pages){
 const chunks=[];let text='',numbers=[];
 const push=()=>{if(text.trim())chunks.push({text:text.trim(),pages:[...new Set(numbers)]});text='';numbers=[];};
 for(const page of pages){
  if(!page.text.trim())continue;
  const lines=page.text.match(/.{1,1200}(?:\n|$)|.{1,1200}/g)||[];
  for(const line of lines){
   const label=numbers.includes(page.page)?'':'[Page '+page.page+']\n';
   if(Buffer.byteLength(JSON.stringify(text+label+line+'\n'))>11000){push();}
   if(!numbers.includes(page.page)){text+='[Page '+page.page+']\n';numbers.push(page.page);}
   text+=line+'\n';
  }
 }
 push();return chunks;
}
async function extractSource(buffer,name='source.pdf'){
 must(Buffer.isBuffer(buffer)&&buffer.length>0&&buffer.length<=5*1024*1024,413,'Choose a PDF or TXT file up to 5 MB.');
 let pages;
 if(buffer.subarray(0,5).toString('latin1')==='%PDF-'){
  must(!parsing,429,'Another PDF is being read. Wait a moment and try again.');parsing=true;
  try{pages=await new Promise((resolve,reject)=>{
   const worker=new Worker(path.join(__dirname,'pdfText.worker.js'),{workerData:{bytes:buffer},resourceLimits:{maxOldGenerationSizeMb:128,stackSizeMb:8}});
   let finished=false;const done=(err,value)=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate().catch(()=>{});err?reject(err):resolve(value);};
   const timer=setTimeout(()=>done(new HttpError(422,'This PDF took too long to read. Export a smaller selection of pages.')),20000);
   worker.once('message',v=>{
    const messages={'page-limit':'This PDF has more than 40 pages. Export the relevant pages as a smaller PDF.','text-limit':'This PDF contains too much text. Export the relevant pages as a smaller PDF.',password:'Unlock the PDF before importing it.',invalid:'This PDF could not be read. Export it again or paste its text.'};
    done(v.error?new HttpError(422,messages[v.error]||messages.invalid):null,v.pages);
   });worker.once('error',()=>done(new HttpError(422,'This PDF could not be read. Export a smaller PDF or paste its text.')));
   worker.once('exit',()=>done(new HttpError(422,'This PDF could not be read. Export it again or paste its text.')));
  });}finally{parsing=false;}
 }else{
  const text=buffer.toString('utf8');must(/\.txt$/i.test(name)&&!text.includes('\0')&&!text.includes('\ufffd'),415,'Use a text-based PDF or a UTF-8 TXT file.');
  must(text.length<=120000,413,'The text file is too long. Select a smaller section.');pages=[{page:1,text}];
 }
 const chunks=chunksFor(pages),emptyPages=pages.filter(p=>!p.text.trim()).map(p=>p.page);
 must(chunks.length,422,'No readable text was found. This may be a scanned PDF. Run OCR first, or paste the questions and answers.');
 const warnings=[];
 if(emptyPages.length)warnings.push('Pages '+emptyPages.join(', ')+' have no readable text. They may need OCR; check them against the original.');
 if(chunks.length>1)warnings.push('This source has '+chunks.length+' sections. Generate/import each section separately and check the full paper for omissions.');
 warnings.push('Text extraction may change columns, code indentation or equations. Review the text and every generated answer key.');
 return {chunks,totalPages:pages.length,emptyPages,warnings};
}
module.exports={extractSource,chunksFor};
