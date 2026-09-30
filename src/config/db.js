'use strict';
const { Pool } = require('pg');
const {env} = require('./env');
const pool = new Pool({connectionString:env.DATABASE_URL,
  ssl:env.DATABASE_SSL==='true' ? {rejectUnauthorized: false}:false,
  max:10, connectionTimeoutMillis:10000, idleTimeoutMillis:30000});
async function transaction(fn) {
  const c=await pool.connect();
  try { await c.query('BEGIN'); const result=await fn(c); await c.query('COMMIT'); return result; }
  catch(e){await c.query('ROLLBACK');throw e;} finally {c.release();}
}
module.exports={pool,query:(q,v)=>pool.query(q,v),transaction};
