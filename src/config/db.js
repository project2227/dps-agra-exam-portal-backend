'use strict';
const { Pool } = require('pg');
const { env } = require('./env');

// The node-postgres connection-string parser replaces explicit ssl settings
// when sslmode appears in DATABASE_URL. Neon supplies sslmode=require, so
// remove that parameter and explicitly enable normal TLS certificate
// verification when DATABASE_SSL=true. Never disable certificate checking
// for a server containing student records.
const connection = new URL(env.DATABASE_URL);
if (env.DATABASE_SSL === 'true') {
  if (connection.searchParams.has('sslcert') || connection.searchParams.has('sslkey') || connection.searchParams.has('sslrootcert')) {
    throw new Error('Configure certificate paths in an explicitly reviewed database adapter; do not override TLS verification.');
  }
  connection.searchParams.delete('sslmode');
}

const pool = new Pool({
  connectionString: connection.toString(),
  ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = require('../platform/scopedDb').wrapDatabase(pool);
