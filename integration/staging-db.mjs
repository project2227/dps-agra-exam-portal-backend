// Disposable, synthetic PostgreSQL-compatible stage. No connection to production.
import {createRequire} from 'node:module'
import crypto from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {spawn} from 'node:child_process'
const require=createRequire(import.meta.url)
if(process.env.DPS_DISPOSABLE_STAGE!=='true'||process.env.DATABASE_URL!=='postgres://disposable-ai-stage-only')throw Error('This stage must not use a real database.')
// Avoid PostgreSQL WASM's large optimizing-compiler memory peak on this stage.
// These flags must be set before V8 starts, rather than changed at runtime.
if(!process.execArgv.includes('--liftoff-only')){
 const child=spawn(process.execPath,['--max-old-space-size=128','--liftoff-only',...process.execArgv,...process.argv.slice(1)],{stdio:'inherit'})
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
 const code=await new Promise(resolve=>{child.on('error',()=>resolve(1));child.on('exit',c=>resolve(c??1))})
 process.exit(code)
}
const {PGlite}=await import('@electric-sql/pglite')
const {citext}=await import('@electric-sql/pglite/contrib/citext')
const {pgcrypto}=await import('@electric-sql/pglite/contrib/pgcrypto')
process.env.DPS_AI_GATEWAY_KEY=crypto.randomBytes(32).toString('base64url')
process.env.DPS_AI_GATEWAY_URL=await require('../scripts/staging-ai-gateway').startStagingGateway(process.env.DPS_AI_GATEWAY_KEY)
// Pre-warming avoids a second database engine during runtime initialization.
// This tiny, disposable data set shares a 512 MB free instance with Node.
const prepared=new Blob([await readFile(new URL('../.disposable-ai-stage.tgz',import.meta.url))])
const pg=new PGlite({extensions:{citext,pgcrypto},initialMemory:128*1024*1024,
 loadDataDir:prepared,postgresqlconf:['shared_buffers=16MB','work_mem=1MB','maintenance_work_mem=8MB']});await pg.waitReady
let tail=Promise.resolve()
const lock=async()=>{let release;const previous=tail;tail=new Promise(r=>{release=r});await previous;return release}
const direct=async(sql,params)=>{if(!params?.length){const rs=await pg.exec(sql),r=rs.at(-1)||{};return {...r,rowCount:r.rows?.length||r.affectedRows||0}}const r=await pg.query(sql,params);return {...r,rowCount:r.rows?.length||r.affectedRows||0}}
const pool={query:async(sql,params)=>{const done=await lock();try{return await direct(sql,params)}finally{done()}},connect:async()=>{const done=await lock();return {query:direct,release:done}},end:()=>pg.close()}
const transaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const value=await fn(c);await c.query('COMMIT');return value}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
const target=require.resolve('../src/config/db');require.cache[target]={id:target,filename:target,loaded:true,exports:{pool,query:(...p)=>pool.query(...p),transaction}}
await require('../src/config/migrate').migrate()
for(const cls of ['VI','VII','VIII','IX','X','XI','XII'])await pool.query('INSERT INTO class_groups(class_name,sections) VALUES($1,$2) ON CONFLICT DO NOTHING',[cls,JSON.stringify(['A','B','C','D','E','F'])])
console.log('[staging] Disposable database and synthetic AI protocol fixture. No production data or real AI model.')
