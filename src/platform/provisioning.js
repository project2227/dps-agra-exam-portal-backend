'use strict';
const crypto = require('crypto'),
  bcrypt = require('bcryptjs');
const { emailReady, sendEmail } = require('../services/email');
const db = require('../config/db');
const { withTenant } = require('./context');
const { siteUrl } = require('./tenancy');
const { resolveTheme } = require('./themes');
const { hash } = require('./auth');
const FEATURES = {
  institute: [
    'exams',
    'monitoring',
    'students',
    'classes',
    'handouts',
    'learning',
    'ide',
    'community',
    'attendance',
    'timetable',
    'announcements',
    'fees',
    'profiles',
  ],
  workplace: ['teams', 'tasks', 'attendance', 'monitoring', 'chat', 'profiles'],
};
const STAGES = [
  'verified',
  'features',
  'sample-data',
  'branding',
  'routing',
  'ready',
];
async function mail({ to, subject, text, tenant }) {
  if (!emailReady())
    throw Object.assign(
      new Error(
        'Email delivery is not configured. The platform owner needs to connect it before sign-ups open.',
      ),
      { status: 503 },
    );
  await sendEmail({
    name: tenant?.name || 'Plinth',
    to,
    subject,
    text,
  });
}
async function emailLink(tenant, email, kind, payload = {}) {
  const token = crypto.randomBytes(32).toString('base64url');
  const link =
    (process.env.PLATFORM_URL || 'http://localhost:5000') +
    '/verify?token=' +
    encodeURIComponent(token);
  const q = await db.platformQuery(
    "INSERT INTO platform_email_links(tenant_id,token_hash,kind,email,payload,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '24 hours') RETURNING id",
    [tenant.id, hash(token), kind, email, JSON.stringify(payload)],
  );
  try {
    await mail({
      tenant,
      to: email,
      subject:
        kind === 'verify'
          ? 'Verify your ' + tenant.name + ' site'
          : 'Join ' + tenant.name,
      text:
        kind === 'verify'
          ? `Verify your email to create your ${tenant.name} site on Plinth. This link expires in 24 hours.\n\n${link}\n\nIf you did not request this, ignore this email.`
          : `You have been invited to ${tenant.name}. Set your own password using this link; it expires in 24 hours.\n\n${link}`,
    });
  } catch (error) {
    await db.platformQuery(
      'UPDATE platform_email_links SET used_at=now() WHERE id=$1',
      [q.rows[0].id],
    );
    throw error;
  }
  return q.rows[0].id;
}
async function signup(v) {
  if (!emailReady())
    throw Object.assign(
      new Error(
        'Site creation will open when email verification is connected. Existing organisation sites remain available.',
      ),
      { status: 503 },
    );
  const theme = resolveTheme(v.theme, v.path),
    passwordHash = await bcrypt.hash(v.password, 12);
  const q = await db.platformQuery(
    'INSERT INTO tenants(slug,name,path,theme) VALUES($1,$2,$3,$4) RETURNING *',
    [v.slug, v.name, v.path, JSON.stringify(theme)],
  );
  const tenant = q.rows[0];
  await withTenant(tenant, () =>
    db.query(
      "INSERT INTO org_users(name,email,password_hash,role) VALUES($1,$2,$3,'admin')",
      [v.adminName, v.email, passwordHash],
    ),
  );
  try {
    await emailLink(tenant, v.email, 'verify');
  } catch (error) {
    await db.platformQuery("UPDATE tenants SET status='failed' WHERE id=$1", [
      tenant.id,
    ]);
    throw error;
  }
  return { slug: tenant.slug, verificationRequired: true };
}
async function sampleData(tenant) {
  return withTenant(tenant, () =>
    db.transaction(async (c) => {
      const admin = (
        await c.query(
          "SELECT * FROM org_users WHERE role='admin' ORDER BY created_at LIMIT 1",
        )
      ).rows[0];
      if (tenant.path === 'institute') {
        if (!admin.teacher_id) {
          const teacher = (
            await c.query(
              "INSERT INTO teachers(name,email,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO UPDATE SET email=excluded.email RETURNING id",
              [admin.name, admin.email, admin.password_hash],
            )
          ).rows[0];
          await c.query('UPDATE org_users SET teacher_id=$2 WHERE id=$1', [
            admin.id,
            teacher.id,
          ]);
          admin.teacher_id = teacher.id;
        }
        await c.query(
          "INSERT INTO class_groups(class_name,sections) VALUES('IX','[\"A\"]'),('X','[\"A\"]'),('XI','[\"A\"]'),('XII','[\"A\"]') ON CONFLICT(class_name) DO NOTHING",
        );
        if (
          !(await c.query('SELECT 1 FROM erp_records WHERE is_sample=true'))
            .rowCount
        )
          await c.query(
            "INSERT INTO erp_records(kind,data,created_by,is_sample) VALUES('announcements',$1,$2,true)",
            [
              JSON.stringify({
                title: 'Your institute site is ready',
                body: 'Create your classes, add students, then schedule your first exam. You can delete this sample announcement.',
              }),
              admin.teacher_id,
            ],
          );
      } else {
        const team = (
          await c.query(
            "INSERT INTO teams(name,manager_id,is_sample) VALUES('General', $1,true) ON CONFLICT(tenant_id,name) DO UPDATE SET name=excluded.name RETURNING id",
            [admin.id],
          )
        ).rows[0];
        await c.query(
          'INSERT INTO team_members(team_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [team.id, admin.id],
        );
        if (
          !(await c.query('SELECT 1 FROM work_tasks WHERE is_sample=true'))
            .rowCount
        )
          await c.query(
            "INSERT INTO work_tasks(team_id,created_by,title,description,is_sample) VALUES($1,$2,'Invite your team','This is a sample task. Delete it when you are ready.',true)",
            [team.id, admin.id],
          );
        let channel = (
          await c.query(
            "SELECT id FROM chat_channels WHERE name='general' AND kind='channel'",
          )
        ).rows[0];
        if (!channel)
          channel = (
            await c.query(
              "INSERT INTO chat_channels(name,is_sample) VALUES('general',true) RETURNING id",
            )
          ).rows[0];
        await c.query(
          'INSERT INTO chat_members(channel_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [channel.id, admin.id],
        );
      }
    }),
  );
}
const running = new Set();
async function provision(tenantId) {
  if (running.has(tenantId)) return;
  running.add(tenantId);
  try {
    const tenant = (
      await db.platformQuery(
        'SELECT * FROM tenants WHERE id=$1 AND verified_at IS NOT NULL',
        [tenantId],
      )
    ).rows[0];
    if (!tenant || tenant.status === 'suspended') return;
    const job = (
      await db.platformQuery(
        'SELECT * FROM provisioning_jobs WHERE tenant_id=$1',
        [tenantId],
      )
    ).rows[0];
    if (!job || job.status === 'complete' || job.attempts >= 5) return;
    await db.platformQuery(
      "UPDATE provisioning_jobs SET status='running',attempts=attempts+1,updated_at=now(),error_code=NULL WHERE tenant_id=$1",
      [tenantId],
    );
    for (const stage of STAGES) {
      await db.platformQuery(
        'UPDATE provisioning_jobs SET stage=$2,updated_at=now() WHERE tenant_id=$1',
        [tenantId, stage],
      );
      if (stage === 'features')
        await db.platformQuery('UPDATE tenants SET features=$2 WHERE id=$1', [
          tenantId,
          JSON.stringify(FEATURES[tenant.path]),
        ]);
      if (stage === 'sample-data') await sampleData(tenant);
      if (stage === 'branding') resolveTheme(tenant.theme, tenant.path);
      if (stage === 'routing' && !siteUrl(tenant))
        throw Error('routing-unavailable');
    }
    await db.platformQuery(
      "UPDATE tenants SET status='ready',updated_at=now() WHERE id=$1",
      [tenantId],
    );
    await db.platformQuery(
      "UPDATE provisioning_jobs SET status='complete',stage='ready',updated_at=now() WHERE tenant_id=$1",
      [tenantId],
    );
  } catch (error) {
    await db.platformQuery(
      "UPDATE provisioning_jobs SET status='failed',error_code=$2,updated_at=now() WHERE tenant_id=$1",
      [tenantId, String(error.code || 'provisioning-failed').slice(0, 60)],
    );
  } finally {
    running.delete(tenantId);
  }
}
async function verify(raw) {
  const q = await db.platformQuery(
    "UPDATE platform_email_links SET used_at=now() WHERE token_hash=$1 AND kind='verify' AND used_at IS NULL AND expires_at>now() RETURNING *",
    [hash(raw)],
  );
  if (!q.rowCount)
    throw Object.assign(
      new Error(
        'This verification link has expired or was already used. Request a new link.',
      ),
      { status: 400 },
    );
  const link = q.rows[0];
  const tenant = (
    await db.platformQuery(
      "UPDATE tenants SET verified_at=now(),status='provisioning' WHERE id=$1 AND status IN('unverified','failed') RETURNING *",
      [link.tenant_id],
    )
  ).rows[0];
  if (!tenant)
    throw Object.assign(
      new Error('This site cannot be verified. Contact the platform owner.'),
      { status: 409 },
    );
  await withTenant(tenant, () =>
    db.query('UPDATE org_users SET verified_at=now() WHERE email=$1', [
      link.email,
    ]),
  );
  await db.platformQuery(
    'INSERT INTO provisioning_jobs(tenant_id) VALUES($1) ON CONFLICT DO NOTHING',
    [tenant.id],
  );
  const entry = crypto.randomBytes(32).toString('base64url');
  await db.platformQuery(
    "INSERT INTO platform_email_links(tenant_id,token_hash,kind,email,expires_at) VALUES($1,$2,'entry',$3,now()+interval '10 minutes')",
    [tenant.id, hash(entry), link.email],
  );
  void provision(tenant.id);
  return { slug: tenant.slug, siteUrl: siteUrl(tenant), entryToken: entry };
}
async function recover() {
  const jobs = await db.platformQuery(
    "SELECT tenant_id FROM provisioning_jobs WHERE status<>'complete' AND attempts<5",
  );
  for (const job of jobs.rows) await provision(job.tenant_id);
}
module.exports = {
  FEATURES,
  STAGES,
  emailReady,
  mail,
  emailLink,
  signup,
  verify,
  provision,
  recover,
  sampleData,
};
