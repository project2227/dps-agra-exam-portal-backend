'use strict';
const bcrypt = require('bcryptjs');
const db = require('../config/db');
async function bootstrapPlatform() {
  const email =
    process.env.PLATFORM_OWNER_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) return;
  let hash;
  if (process.env.PLATFORM_OWNER_PASSWORD)
    hash = await bcrypt.hash(process.env.PLATFORM_OWNER_PASSWORD, 12);
  else
    hash = (
      await db.platformQuery(
        "SELECT password_hash FROM teachers WHERE tenant_id='00000000-0000-4000-8000-000000000001' AND email=$1 AND role='admin' AND active=true",
        [email],
      )
    ).rows[0]?.password_hash;
  if (hash)
    await db.platformQuery(
      'INSERT INTO platform_owners(email,password_hash,name) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING',
      [email, hash, process.env.BOOTSTRAP_ADMIN_NAME || 'Platform owner'],
    );
}
module.exports = { bootstrapPlatform };
