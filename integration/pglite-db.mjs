// Disposable PostgreSQL engine for local integration runs. No network or production data.
import { PGlite } from '@electric-sql/pglite'
import { citext } from '@electric-sql/pglite/contrib/citext'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
process.env.NODE_ENV='test'
process.env.PLINTH_ENABLED='false'
process.env.MAIL_PROVIDER='smtp'
process.env.SMTP_URL=''
process.env.BREVO_API_KEY=''
process.env.MAIL_FROM=''
process.env.FRONTEND_URL='http://127.0.0.1:5173'
process.env.DATABASE_URL='postgres://disposable-test-only'
process.env.JWT_SECRET='disposable-test-account-secret-32-characters'
process.env.STUDENT_SESSION_SECRET='disposable-test-exam-secret-32-characters'
process.env.FINGERPRINT_PEPPER='disposable-test-fingerprint-pepper'
const pg=new PGlite({extensions:{citext,pgcrypto}})
await pg.waitReady
let tail=Promise.resolve()
const lock=async()=>{let release;const previous=tail;tail=new Promise(resolve=>{release=resolve});await previous;return release}
const direct=async(sql,params)=>{if(!params?.length){const result=await pg.exec(sql);const r=result.at(-1)||{};return {...r,rowCount:r.rows?.length||r.affectedRows||0}}const r=await pg.query(sql,params);return {...r,rowCount:r.rows?.length||r.affectedRows||0}}
const pool={query:async(sql,params)=>{const release=await lock();try{return await direct(sql,params)}finally{release()}},connect:async()=>{const release=await lock();return {query:direct,release}},end:()=>pg.close()}
const transaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const value=await fn(c);await c.query('COMMIT');return value}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
const path=require.resolve('../src/config/db')
require.cache[path]={id:path,filename:path,loaded:true,exports:{pool,query:(...a)=>pool.query(...a),transaction}}
await require('../src/config/migrate').migrate()
await pool.query("INSERT INTO class_groups(class_name,sections) VALUES('IX','[\"A\",\"B\"]'),('X','[\"A\",\"B\"]') ON CONFLICT DO NOTHING")
