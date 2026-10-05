'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {extractSource,chunksFor}=require('../src/services/examSource');
function pdfWithText(text){
 const safe=text.replace(/[\\()]/g,'\\$&');const stream='BT /F1 12 Tf 40 700 Td ('+safe+') Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
 let body='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(body));body+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const xref=Buffer.byteLength(body);body+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('');
 body+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';return Buffer.from(body);
}
test('a real PDF yields page-labelled question and answer text',async()=>{
 const r=await extractSource(pdfWithText('Q1. What is 2 + 2? Answer: 4.'));
 assert.equal(r.totalPages,1);assert.match(r.chunks[0].text,/\[Page 1\]/);assert.match(r.chunks[0].text,/Answer: 4/);assert.deepEqual(r.emptyPages,[]);
});
test('blank scans and malformed PDFs return actionable errors instead of fabricated source',async()=>{
 await assert.rejects(extractSource(pdfWithText('')),e=>e.status===422&&/OCR/.test(e.message));
 await assert.rejects(extractSource(Buffer.from('%PDF-1.4\ninvalid')),e=>e.status===422);
});
test('Unicode sources are split within gateway byte limits without dropping content',()=>{
 const text='प्रश्न के लिए उत्तर '.repeat(1200),chunks=chunksFor([{page:1,text},{page:2,text:'Final answer'}]);
 assert.ok(chunks.length>1);for(const c of chunks){assert.ok(Buffer.byteLength(JSON.stringify(c.text))<=11000);assert.match(c.text,/\[Page [12]\]/);}
 const recovered=chunks.map(c=>c.text.replace(/\[Page \d+\]\n/g,'').replace(/\n/g,'')).join('');
 assert.equal(recovered.replace(/\s/g,''),(text+'Final answer').replace(/\s/g,''));
});
test('unsupported, oversized and invalid text files are rejected',async()=>{
 await assert.rejects(extractSource(Buffer.from('hello'),'photo.png'),e=>e.status===415);
 await assert.rejects(extractSource(Buffer.from([0xff,0xfe]),'paper.txt'),e=>e.status===415);
 await assert.rejects(extractSource(Buffer.alloc(5*1024*1024+1),'paper.txt'),e=>e.status===413);
});
module.exports={pdfWithText};
