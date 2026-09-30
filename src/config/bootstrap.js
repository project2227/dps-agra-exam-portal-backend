'use strict';
const bcrypt=require('bcryptjs');const {env}=require('./env');const db=require('./db');
async function bootstrap(){
 if(!env.BOOTSTRAP_ADMIN_EMAIL||!env.BOOTSTRAP_ADMIN_PASSWORD)return;
 if(env.BOOTSTRAP_ADMIN_PASSWORD.length<12)throw new Error('BOOTSTRAP_ADMIN_PASSWORD must have at least 12 characters.');
 const count=await db.query('SELECT count(*)::int AS n FROM teachers');
 if(count.rows[0].n>0){console.log('[bootstrap] teacher accounts already exist; bootstrap skipped');return;}
 const hash=await bcrypt.hash(env.BOOTSTRAP_ADMIN_PASSWORD,12);
 await db.query(`INSERT INTO teachers(name,email,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO NOTHING`,
 [env.BOOTSTRAP_ADMIN_NAME,env.BOOTSTRAP_ADMIN_EMAIL,hash]);
 console.log('[bootstrap] first admin provisioned; remove bootstrap secrets from Render environment');
}
module.exports={bootstrap};
