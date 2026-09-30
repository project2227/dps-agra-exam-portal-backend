'use strict';
const crypto=require('crypto');
const {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand}=require('@aws-sdk/client-s3');
const {getSignedUrl}=require('@aws-sdk/s3-request-presigner');
const {env}=require('../config/env');const {must}=require('../utils/http');
let client;
function storage(){
 must(env.UPLOAD_PROVIDER==='s3'&&env.S3_BUCKET&&env.S3_ACCESS_KEY_ID&&env.S3_SECRET_ACCESS_KEY,503,'File storage is not configured.');
 if(!client)client=new S3Client({region:env.S3_REGION,
  ...(env.S3_ENDPOINT?{endpoint:env.S3_ENDPOINT}:{}),forcePathStyle:env.S3_FORCE_PATH_STYLE==='true',
  credentials:{accessKeyId:env.S3_ACCESS_KEY_ID,secretAccessKey:env.S3_SECRET_ACCESS_KEY}});
 return client;
}
function detectFile(buffer){
 if(buffer.subarray(0,5).toString('latin1')==='%PDF-')return {ext:'pdf',type:'application/pdf'};
 if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {ext:'png',type:'image/png'};
 if(buffer.length>3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return {ext:'jpg',type:'image/jpeg'};
 const head=buffer.subarray(0,8192).toString('utf8');
 if(!head.includes('\ufffd') && !head.includes('\0') && buffer.length<=2*1024*1024)return {ext:'txt',type:'text/plain'};
 return null;
}
async function upload(buffer,prefix){
 must(buffer && buffer.length>0 && buffer.length<=8*1024*1024,400,'Upload size exceeds 8 MB.');
 const kind=detectFile(buffer);must(kind,415,'Only PDF, PNG, JPG or UTF-8 TXT files are accepted.');
 const key=`${prefix}/${crypto.randomUUID()}.${kind.ext}`;
 await storage().send(new PutObjectCommand({Bucket:env.S3_BUCKET,Key:key,Body:buffer,ContentType:kind.type,ServerSideEncryption:'AES256'}));
 return {key,type:kind.type};
}
async function signedRead(key){return getSignedUrl(storage(),new GetObjectCommand({Bucket:env.S3_BUCKET,Key:key}),{expiresIn:300});}
async function remove(key){await storage().send(new DeleteObjectCommand({Bucket:env.S3_BUCKET,Key:key}));}
module.exports={upload,signedRead,remove,detectFile};
