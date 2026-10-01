'use strict';
const crypto=require('node:crypto');
const {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand}=require('@aws-sdk/client-s3');
const {getSignedUrl}=require('@aws-sdk/s3-request-presigner');
const {env}=require('../config/env');
const db=require('../config/db');
const {must}=require('../utils/http');

const MAX_DB_FILE_BYTES=5*1024*1024;
const MAX_DB_TOTAL_BYTES=64*1024*1024;
const MAX_DB_FILES=100;
const DB_STORAGE_LOCK=73460135;
const SIGNED_URL_SECONDS=300;
let client;

function storage(){
 must(env.UPLOAD_PROVIDER==='s3'&&env.S3_BUCKET&&env.S3_ACCESS_KEY_ID&&env.S3_SECRET_ACCESS_KEY,503,
  'S3 file storage is not configured.');
 if(!client)client=new S3Client({region:env.S3_REGION,
  ...(env.S3_ENDPOINT?{endpoint:env.S3_ENDPOINT}:{}),forcePathStyle:env.S3_FORCE_PATH_STYLE==='true',
  credentials:{accessKeyId:env.S3_ACCESS_KEY_ID,secretAccessKey:env.S3_SECRET_ACCESS_KEY}});
 return client;
}
function detectFile(buffer,originalName=''){
 const name=String(originalName||'').toLowerCase();
 if(buffer.subarray(0,5).toString('latin1')==='%PDF-')return {ext:'pdf',type:'application/pdf'};
 if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
  return {ext:'png',type:'image/png'};
 if(buffer.length>3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)
  return {ext:'jpg',type:'image/jpeg'};
 // Modern Office files are ZIP-based. They always download as attachments.
 // This lightweight check is not full Office document malware scanning.
 if(buffer.subarray(0,4).equals(Buffer.from([80,75,3,4]))){
  if(name.endsWith('.docx'))return {ext:'docx',type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
  if(name.endsWith('.pptx'))return {ext:'pptx',type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
  return null;
 }
 if(buffer.length<=2*1024*1024){
  const head=buffer.subarray(0,8192).toString('utf8');
  if(!head.includes('\ufffd')&&!head.includes('\0')&&
     (!name||name.endsWith('.txt')||buffer.subarray(0,8192).every(b=>b===9||b===10||b===13||b>=32)))
   return {ext:'txt',type:'text/plain; charset=utf-8'};
 }
 return null;
}
function cleanName(name,ext){
 const n=String(name||'handout.'+ext).split(/[\\/]/).pop()
  .replace(/[\r\n"<>:|?*\x00-\x1f]/g,'_').slice(0,155).trim();
 return n||'handout.'+ext;
}
async function upload(buffer,prefix,originalName=''){
 const limit=env.UPLOAD_PROVIDER==='postgres'?MAX_DB_FILE_BYTES:8*1024*1024;
 must(Buffer.isBuffer(buffer)&&buffer.length>0&&buffer.length<=limit,413,
  'File too large. Neon handouts allow up to 5 MB per file.');
 const kind=detectFile(buffer,originalName);
 must(kind,415,'Accepted formats: PDF, PNG, JPG, TXT (up to 2 MB), DOCX and PPTX.');
 must(['handouts','student-answers'].includes(prefix),400,'Invalid upload destination.');
 const key=`${prefix}/${crypto.randomUUID()}.${kind.ext}`;
 if(env.UPLOAD_PROVIDER==='postgres'){
  await db.transaction(async c=>{
   // Database-scoped lock prevents concurrent requests from bypassing quotas.
   await c.query('SELECT pg_advisory_xact_lock($1)',[DB_STORAGE_LOCK]);
   const q=await c.query('SELECT COUNT(*)::integer AS count, COALESCE(SUM(size_bytes),0)::bigint AS bytes FROM stored_files');
   const total=Number(q.rows[0].bytes);
   must(q.rows[0].count<MAX_DB_FILES && total+buffer.length<=MAX_DB_TOTAL_BYTES,507,
    'Small-file storage is full. Delete unused handouts or configure private S3 storage.');
   await c.query(`INSERT INTO stored_files(storage_key,file_bytes,mime_type,original_name,size_bytes)
     VALUES($1,$2,$3,$4,$5)`,
    [key,buffer,kind.type,cleanName(originalName,kind.ext),buffer.length]);
  });
  return {key,type:kind.type,size:buffer.length,name:cleanName(originalName,kind.ext)};
 }
 await storage().send(new PutObjectCommand({
  Bucket:env.S3_BUCKET,Key:key,Body:buffer,ContentType:kind.type,ServerSideEncryption:'AES256'
 }));
 return {key,type:kind.type,size:buffer.length,name:cleanName(originalName,kind.ext)};
}
const signature=body=>crypto.createHmac('sha256',env.STUDENT_SESSION_SECRET).update(body).digest('base64url');
async function signedRead(key){
 if(env.UPLOAD_PROVIDER==='postgres'){
  must(env.API_PUBLIC_URL,503,'Public API URL missing from Render configuration.');
  must(typeof key==='string'&&/^(handouts|student-answers)\/[\w-]+\.(pdf|png|jpg|txt|docx|pptx)$/.test(key),400,'Invalid file reference.');
  const body=Buffer.from(JSON.stringify({key,exp:Date.now()+SIGNED_URL_SECONDS*1000})).toString('base64url');
  const token=body+'.'+signature(body);
  return env.API_PUBLIC_URL.replace(/\/$/,'')+'/api/files/'+token;
 }
 return getSignedUrl(storage(),new GetObjectCommand({Bucket:env.S3_BUCKET,Key:key}),{expiresIn:SIGNED_URL_SECONDS});
}
async function readSignedFile(token){
 must(env.UPLOAD_PROVIDER==='postgres',404,'File link unavailable.');
 must(typeof token==='string'&&token.length<800,403,'Invalid or expired download link.');
 const m=token.match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
 must(m,403,'Invalid or expired download link.');
 const expected=Buffer.from(signature(m[1]));
 const provided=Buffer.from(m[2]);
 must(provided.length===expected.length&&crypto.timingSafeEqual(provided,expected),403,
  'Invalid or expired download link.');
 let payload;
 try{payload=JSON.parse(Buffer.from(m[1],'base64url').toString('utf8'))}catch{
  must(false,403,'Invalid or expired download link.');
 }
 must(Number.isSafeInteger(payload.exp)&&payload.exp>Date.now()&&
  typeof payload.key==='string'&&/^(handouts|student-answers)\/[\w-]+\.(pdf|png|jpg|txt|docx|pptx)$/.test(payload.key),403,
 'Invalid or expired download link.');
 const q=await db.query('SELECT file_bytes,mime_type,original_name,size_bytes FROM stored_files WHERE storage_key=$1',[payload.key]);
 must(q.rowCount,404,'This file has been deleted.');
 return {buffer:q.rows[0].file_bytes,type:q.rows[0].mime_type,name:q.rows[0].original_name,size:q.rows[0].size_bytes};
}
async function remove(key){
 if(env.UPLOAD_PROVIDER==='postgres'){
  await db.query('DELETE FROM stored_files WHERE storage_key=$1',[key]);
  return;
 }
 await storage().send(new DeleteObjectCommand({Bucket:env.S3_BUCKET,Key:key}));
}
module.exports={upload,signedRead,readSignedFile,remove,detectFile,
 MAX_DB_FILE_BYTES,MAX_DB_TOTAL_BYTES,MAX_DB_FILES};
