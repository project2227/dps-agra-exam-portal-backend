'use strict';
// Uses disposable GitHub Actions PostgreSQL, never the real Neon classroom DB.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {app}=require('../../src/app');
const {pool}=require('../../src/config/db');
const {env}=require('../../src/config/env');
const {teacherToken}=require('../../src/middleware/auth');
const {upload,signedRead,readSignedFile,remove,detectFile,MAX_DB_FILE_BYTES}=require('../../src/services/storage');

test('authorized teacher can upload, list, securely download and delete a Neon handout', {timeout:25000},async t=>{
 assert.equal(env.UPLOAD_PROVIDER,'postgres','Run this only in ephemeral Postgres CI.');
 const id=crypto.randomUUID();
 await pool.query(`INSERT INTO teachers(id,name,email,password_hash,role)
  VALUES($1,'Integration Staff',$2,'not-a-real-password','admin')`,[id,'upload-test-'+id+'@example.invalid']);
 await pool.query(`INSERT INTO class_groups(class_name,sections,computer_teacher_id)
  VALUES('IX','["A"]'::jsonb,$1) ON CONFLICT(class_name) DO NOTHING`,[id]);
 const server=app.listen(0,'127.0.0.1');
 await new Promise((resolve,reject)=>{if(server.listening)resolve();else{server.once('listening',resolve);server.once('error',reject)}});
 const base='http://127.0.0.1:'+server.address().port;
 env.API_PUBLIC_URL=base; // CI only: never mutate a real Render service.
 t.after(async()=>{
  await new Promise(resolve=>server.close(resolve));
  await pool.end();
 });
 const auth='Bearer '+teacherToken({id,role:'admin'});
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
 const form=new FormData();
 form.append('file',new Blob([pdf],{type:'application/pdf'}),'sample-guide.pdf');
 form.append('title','Sample Practice Guide');
 form.append('className','IX');form.append('section','A');
 const created=await fetch(base+'/api/teacher/handouts/upload',{
  method:'POST',headers:{Authorization:auth},body:form
 });
 if(created.status!==201)assert.fail('Handout upload failed: '+created.status+' '+(await created.text()).slice(0,350));
 const uploaded=await created.json();
 const handoutId=uploaded.handout.id;
 const rows=await fetch(base+'/api/teacher/handouts',{headers:{Authorization:auth}});
 assert.equal(rows.status,200);
 const list=(await rows.json()).handouts;
 assert.equal(list.find(x=>x.id===handoutId).file_name,'sample-guide.pdf');
 assert.equal(list.find(x=>x.id===handoutId).file_size,pdf.length);
 const withoutAuth=await fetch(base+'/api/teacher/handouts/'+handoutId+'/download');
 assert.equal(withoutAuth.status,401);
 const signed=await fetch(base+'/api/teacher/handouts/'+handoutId+'/download',{headers:{Authorization:auth}});
 assert.equal(signed.status,200);
 const url=(await signed.json()).url;
 assert.ok(url.startsWith(base+'/api/files/'));
 const actual=await fetch(url);
 assert.equal(actual.status,200);
 assert.equal(actual.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(Buffer.from(await actual.arrayBuffer()),pdf);
 const tampered=await fetch(url.slice(0,-1)+(url.endsWith('A')?'B':'A'));
 assert.equal(tampered.status,403);
 const deleted=await fetch(base+'/api/teacher/handouts/'+handoutId,{
  method:'DELETE',headers:{Authorization:auth}
 });
 assert.equal(deleted.status,200);
 assert.equal((await fetch(url)).status,404);
});
test('bounded classification rejects oversized files and unsupported archives',()=>{
 const bad=Buffer.concat([Buffer.from('PK\x03\x04'),Buffer.alloc(40)]);
 assert.equal(detectFile(bad,'unknown.zip'),null);
 assert.equal(detectFile(bad,'slides.pptx').ext,'pptx');
 assert.equal(MAX_DB_FILE_BYTES,5*1024*1024);
});
