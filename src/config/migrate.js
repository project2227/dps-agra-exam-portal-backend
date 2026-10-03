'use strict';
const fs=require('fs'); const path=require('path');
const {pool} = require('./db');
async function migrate(){
 const c=await pool.connect();
 try {
  await c.query('SELECT pg_advisory_lock(73259102)');
  await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(filename text primary key, applied_at timestamptz NOT NULL DEFAULT now())');
  const dir=path.resolve(__dirname,'../../db/migrations');
  const filenames=fs.readdirSync(dir).filter(n=>/^\d{3}_.*\.sql$/.test(n)&&(!/^01\d_/.test(n)||process.env.PLINTH_ENABLED==='true')).sort();
  const applied=new Set((await c.query('SELECT filename FROM schema_migrations')).rows.map(r=>r.filename));
  for(const f of filenames){ if(applied.has(f))continue;await c.query('BEGIN');try {
   await c.query(fs.readFileSync(path.join(dir,f),'utf8'));
   await c.query('INSERT INTO schema_migrations(filename) VALUES($1)',[f]);
   await c.query('COMMIT');console.log('[migration]',f);
  }catch(err){await c.query('ROLLBACK');throw err;}}
 }finally {try{await c.query('SELECT pg_advisory_unlock(73259102)')}finally{c.release();}}
}
if(require.main===module) migrate().then(()=>pool.end()).catch(e=>{console.error(e);process.exitCode=1;pool.end();});
module.exports={migrate};
