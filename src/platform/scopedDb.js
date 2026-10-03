'use strict';
const { currentTenant, enabled } = require('./context');
function tenantConflict(sql) {
  return sql.replace(
    /ON CONFLICT\s*\(\s*(email|handle|class_name|key_hash)\s*\)/gi,
    'ON CONFLICT(tenant_id,$1)',
  );
}
function wrapDatabase(pool) {
  async function configure(client) {
    if (!enabled()) return;
    const tenant = currentTenant();
    if (!tenant?.id || !/^[a-f0-9-]{36}$/i.test(tenant.id))
      throw Object.assign(new Error('Tenant context required.'), {
        status: 403,
      });
    await client.query('SET LOCAL ROLE plinth_runtime');
    await client.query("SELECT set_config('app.tenant_id',$1,true)", [
      tenant.id,
    ]);
  }
  async function transaction(fn) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await configure(c);
      const facade = {
        query: (sql, values) =>
          c.query(enabled() ? tenantConflict(sql) : sql, values),
      };
      const value = await fn(facade);
      await c.query('COMMIT');
      return value;
    } catch (error) {
      await c.query('ROLLBACK');
      throw error;
    } finally {
      c.release();
    }
  }
  const query = (sql, values) =>
    enabled()
      ? transaction((c) => c.query(sql, values))
      : pool.query(sql, values);
  // Only internal platform modules use this explicit capability; it is never
  // selected by a request parameter and grants no tenant-table RLS bypass.
  const platformQuery = (sql, values) => pool.query(sql, values);
  return { pool, query, transaction, platformQuery };
}
module.exports = { wrapDatabase, tenantConflict };
