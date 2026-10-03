// Independent tenant integration database: no production network or credentials.
import {PGlite} from '@electric-sql/pglite'
import {citext} from '@electric-sql/pglite/contrib/citext'
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
process.env.NODE_ENV='test';process.env.PLINTH_ENABLED='true';process.env.PLATFORM_URL='http://127.0.0.1:5000';process.env.FRONTEND_URL='http://127.0.0.1:5000';process.env.DATABASE_URL='postgres://disposable-test-only';process.env.JWT_SECRET='disposable-plinth-account-secret-32-characters';process.env.STUDENT_SESSION_SECRET='disposable-plinth-exam-secret-32-characters';process.env.FINGERPRINT_PEPPER='disposable-plinth-fingerprint-pepper'
const pg=new PGlite({extensions:{citext,pgcrypto}});await pg.waitReady
let tail=Promise.resolve();const lock=async()=>{let release;const previous=tail;tail=new Promise(r=>release=r);await previous;return release}
const direct=async(sql,params)=>{if(!params?.length){const results=await pg.exec(sql),r=results.at(-1)||{};return {...r,rowCount:r.rows?.length||r.affectedRows||0}}const r=await pg.query(sql,params);return {...r,rowCount:r.rows?.length||r.affectedRows||0}}
const pool={query:async(...args)=>{const release=await lock();try{return await direct(...args)}finally{release()}},connect:async()=>{const release=await lock();return {query:direct,release}},end:()=>pg.close()}
const path=require.resolve('../src/config/db');require.cache[path]={id:path,filename:path,loaded:true,exports:require('../src/platform/scopedDb').wrapDatabase(pool)}
await require('../src/config/migrate').migrate()
