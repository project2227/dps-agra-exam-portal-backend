// Free on-device document analysis. No paid API, no remote uploaded handout.
// Uses Chromium's optional built-in language model when supported; transparent
// rule-based extraction is used otherwise. Teachers must verify every result.
const sentences = s => String(s).replace(/\s+/g,' ').match(/[^.!?]{40,270}[.!?]/g) || []
const titleWords = s => [...new Set((String(s).match(/\b[a-zA-Z]{5,}\b/g)||[]).map(w=>w.toLowerCase()))].filter(x=>!['about','these','their','there','which','while','should','because','through','using','being','where','after','before','between','would'].includes(x))
export async function extractPdf(file){
 if(!/\.pdf$/i.test(file.name)||file.size>12*1024*1024)throw Error('Select a PDF under 12 MB. Text-only PDFs are supported; scanned images need OCR outside this tool.')
 const pdfjs=await import(/* @vite-ignore */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs')
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'
 const doc=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise
 if(doc.numPages>30)throw Error('For browser privacy and performance, use a PDF of at most 30 pages.')
 const pages=[];for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i),text=await p.getTextContent();pages.push(text.items.map(x=>x.str||'').join(' '))}
 const combined=pages.join('\n').slice(0,45000)
 if(combined.replace(/\s/g,'').length<120)throw Error('This PDF has too little selectable text. Paste lesson text directly or convert the scanned PDF to text with a tool approved by your school.')
 return combined
}
export function deriveCourseNotes(text){
 const all=sentences(text).filter(s=>s.trim().split(/\s+/).length>7)
 const selected=all.slice(0,Math.min(8,all.length))
 if(selected.length<2)throw Error('Enter at least two complete paragraphs of meaningful handout text first.')
 const lessons=[];for(let i=0;i<selected.length;i+=2)lessons.push({title:`Concept ${Math.floor(i/2)+1}`,body:selected.slice(i,i+2).join(' ').trim()})
 const vocab=titleWords(selected.join(' '));const quiz=[]
 for(const s of selected.slice(0,5)){
  const words=titleWords(s).filter(w=>w.length>=6&&vocab.filter(x=>x===w).length>0)
  const word=words[0]
  if(!word)continue
  const distractors=[...new Set(vocab.filter(w=>w!==word&&w.length>=5&&Math.abs(w.length-word.length)<4))].slice(0,3)
  if(distractors.length<3)continue
  const answerIndex=quiz.length%4,options=[...distractors];options.splice(answerIndex,0,word)
  quiz.push({prompt:`Complete this statement from the handout: ${s.trim().replace(new RegExp('\\b'+word+'\\b','i'),'_____')}`.slice(0,340),options,answerIndex})
 }
 return {summary:selected.slice(0,2).join(' ').slice(0,450),lessons,quiz:quiz.slice(0,5),method:'keyword extraction (not generative AI)'}
}
export async function suggestWithFreeLocalAI(text){
 const lm=globalThis.LanguageModel||globalThis.ai?.languageModel
 if(!lm?.create)return {available:false,reason:'On-device AI is not enabled in this browser. Keyword extraction is available without a model or API key.'}
 const session=await lm.create({temperature:0.2,topK:3})
 try{
  const prompt='You are drafting suggestions for a human teacher, not issuing student grades. Return ONLY valid JSON with keys summary (string up to 450 chars), lessons (array of 2-4 objects {title,body}), quiz (array of 2-4 objects {prompt,options:[4 strings],answerIndex: integer 0-3}). Every fact and correct option must be supported by the source. SOURCE: '+text.slice(0,9500)
  const raw=await session.prompt(prompt)
  const parsed=JSON.parse(raw.replace(/^```(?:json)?/,'').replace(/```$/,'').trim())
  if(!Array.isArray(parsed.lessons)||!Array.isArray(parsed.quiz)||!parsed.summary)throw Error('Invalid local model response; please review handout manually.')
  return {available:true,data:parsed,method:'on-device AI (teacher review required)'}
 }finally{session.destroy?.()}
}
