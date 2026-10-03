'use strict';
const express = require('express'),
  multer = require('multer');
const { z } = require('zod');
const db = require('../config/db');
const { asyncWrap, must } = require('../utils/http');
const auth = require('../platform/auth');
const { currentTenant, DPS_ID } = require('../platform/context');
const { siteUrl } = require('../platform/tenancy');
const { publicTenant } = require('./platform.routes');
const { resolveTheme } = require('../platform/themes');
const { emailLink, FEATURES } = require('../platform/provisioning');
const storage = require('../platform/storage');
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2097152, files: 1, fields: 1 },
});
router.get('/public', (req, res) =>
  res.json({ tenant: publicTenant(currentTenant()) }),
);
router.post(
  '/login',
  asyncWrap(async (req, res) => res.json(await auth.login(req, res))),
);
router.get(
  '/session',
  asyncWrap(async (req, res) => {
    const actor = await auth.resolve(req.headers);
    res.set('Cache-Control', 'no-store').json({
      user: actor ? auth.publicUser(actor) : null,
      csrfToken:
        actor?.source === 'teacher'
          ? actor.legacySession.csrfToken
          : actor?.csrfToken || null,
      tenant: publicTenant(currentTenant()),
    });
  }),
);
router.post(
  '/entry',
  asyncWrap(async (req, res) => {
    const token = z.string().min(32).max(80).parse(req.body.token);
    const link = (
      await db.platformQuery(
        "UPDATE platform_email_links SET used_at=now() WHERE token_hash=$1 AND kind='entry' AND tenant_id=$2 AND used_at IS NULL AND expires_at>now() RETURNING email",
        [auth.hash(token), currentTenant().id],
      )
    ).rows[0];
    must(
      link,
      400,
      'This sign-in link has expired. Sign in with your password.',
    );
    const user = (
      await db.query(
        'SELECT * FROM org_users WHERE email=$1 AND active=true AND verified_at IS NOT NULL',
        [link.email],
      )
    ).rows[0];
    must(user, 401, 'Sign in with your password.');
    const s = await auth.create(req, res, user);
    let instituteCsrf = null;
    if (user.teacher_id)
      instituteCsrf = (
        await require('../services/accountSessions').createSession(req, res, {
          teacherId: user.teacher_id,
          syncOrg: false,
        })
      ).csrfToken;
    res.json({ user: auth.publicUser(user), ...s, instituteCsrf });
  }),
);
router.post(
  '/logout',
  auth.requireUser(),
  asyncWrap(async (req, res) => {
    if (req.actor.source === 'org')
      await db.query('UPDATE org_sessions SET revoked_at=now() WHERE id=$1', [
        req.actor.session_id,
      ]);
    const legacy = require('../services/accountSessions');
    const a = await legacy.resolveSession(req.headers);
    if (a)
      await db.query(
        'UPDATE account_sessions SET revoked_at=now() WHERE id=$1',
        [a.id],
      );
    res.clearCookie(auth.COOKIE, auth.options(false));
    legacy.clearCookie(res);
    require('../platform/workplace').disconnectUser(
      currentTenant().id,
      req.actor.id,
    );
    res.json({ ok: true });
  }),
);
router.get('/settings', auth.requireAdmin, (req, res) => {
  const t = currentTenant();
  res.json({
    tenant: publicTenant(t),
    storage: { used: Number(t.storage_used), quota: Number(t.storage_quota) },
    retentionDays: t.retention_days,
    monitoringPolicy: t.monitoring_policy,
    availableFeatures: FEATURES[t.path],
    maximumRetention: Math.min(
      30,
      Number(process.env.PLATFORM_MAX_RETENTION_DAYS) || 30,
    ),
  });
});
router.patch(
  '/branding',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const v = z
      .object({
        name: z.string().trim().min(2).max(120),
        theme: z
          .object({
            preset: z.string(),
            primary: z.string().optional(),
            accent: z.string().optional(),
          })
          .strict(),
      })
      .strict()
      .parse(req.body);
    const t = currentTenant(),
      theme = resolveTheme(v.theme, t.path);
    await db.platformQuery(
      'UPDATE tenants SET name=$2,theme=$3,updated_at=now() WHERE id=$1',
      [t.id, v.name, JSON.stringify(theme)],
    );
    res.json({ tenant: publicTenant({ ...t, name: v.name, theme }) });
  }),
);
router.post(
  '/logo',
  auth.requireAdmin,
  upload.single('logo'),
  asyncWrap(async (req, res) => {
    await storage.logo(currentTenant(), req.file);
    res.json({ uploaded: true });
  }),
);
router.patch(
  '/retention',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const retentionDays = z
      .number()
      .int()
      .min(1)
      .max(Math.min(30, Number(process.env.PLATFORM_MAX_RETENTION_DAYS) || 30))
      .parse(req.body.retentionDays);
    await db.platformQuery('UPDATE tenants SET retention_days=$2 WHERE id=$1', [
      currentTenant().id,
      retentionDays,
    ]);
    res.json({ updated: true });
  }),
);
router.patch(
  '/features',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const v = z
        .object({ features: z.array(z.string()).max(20) })
        .strict()
        .parse(req.body),
      t = currentTenant();
    must(
      v.features.every((x) => FEATURES[t.path].includes(x)),
      400,
      'Choose available features.',
    );
    if (t.path === 'institute') {
      const active = await db.query(
        "SELECT 1 FROM exams WHERE status IN('active','scheduled') AND end_time>now() AND start_time<now()+interval '3 hours'",
      );
      must(
        !active.rowCount,
        409,
        'Change exam features after the current exam window ends.',
      );
    }
    await db.platformQuery('UPDATE tenants SET features=$2 WHERE id=$1', [
      t.id,
      JSON.stringify([...new Set(v.features)]),
    ]);
    if(t.path==='workplace'&&!v.features.includes('monitoring')){
      await db.query("UPDATE work_sessions SET status='paused',webcam_on=false WHERE ended_at IS NULL");
      require('../platform/workplace').disconnectTenant(t.id);
    }
    res.json({ updated: true });
  }),
);
router.patch(
  '/policy',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
    const v = z
      .object({
        enabled: z.boolean(),
        noticeAccepted: z.boolean(),
        timezone: z.string().max(80),
        start: time,
        end: time,
        days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
        allowlist: z.array(z.string().trim().min(1).max(80)).max(50),
        retentionDays: z
          .number()
          .int()
          .min(1)
          .max(
            Math.min(30, Number(process.env.PLATFORM_MAX_RETENTION_DAYS) || 30),
          ),
      })
      .strict()
      .parse(req.body);
    must(
      currentTenant().path === 'workplace',
      400,
      'Workplace policy is only available on workplace sites.',
    );
    try {
      new Intl.DateTimeFormat('en', { timeZone: v.timezone }).format(
        new Date(),
      );
    } catch {
      must(false, 400, 'Choose a valid timezone.');
    }
    must(v.start !== v.end, 400, 'Start and end times must be different.');
    must(
      !v.enabled || v.noticeAccepted,
      400,
      'Accept the monitoring notice before enabling monitoring.',
    );
    const { retentionDays, ...p } = v;
    const policy = {
      ...p,
      version: Number(currentTenant().monitoring_policy.version || 0) + 1,
      acceptedBy: req.actor.id,
      acceptedAt: new Date().toISOString(),
    };
    await db.platformQuery(
      'UPDATE tenants SET monitoring_policy=$2,retention_days=$3 WHERE id=$1',
      [currentTenant().id, JSON.stringify(policy), retentionDays],
    );
    await db.query(
      "UPDATE work_sessions SET status='paused',webcam_on=false WHERE ended_at IS NULL",
    );
    require('../platform/workplace').disconnectTenant(currentTenant().id);
    res.json({ updated: true, policyVersion: policy.version });
  }),
);
router.get(
  '/users',
  auth.requireUser(['admin', 'manager', 'teacher']),
  asyncWrap(async (req, res) => {
    const q = await db.query(
      'SELECT id,name,email,role,active,created_at FROM org_users ORDER BY name',
    );
    res.json({ users: q.rows });
  }),
);
router.post(
  '/invites',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const v = z
        .object({
          email: z.string().trim().email().max(200),
          role: z.enum(['admin', 'manager', 'employee', 'teacher']),
          teamId: z.string().uuid().optional(),
          classes: z.array(z.string().max(40)).max(30).optional(),
        })
        .strict()
        .parse(req.body),
      t = currentTenant();
    must(
      t.path === 'institute'
        ? ['admin', 'teacher'].includes(v.role)
        : ['admin', 'manager', 'employee'].includes(v.role),
      400,
      'Choose a role for this site.',
    );
    must(
      !(await db.query('SELECT 1 FROM org_users WHERE email=$1', [v.email]))
        .rowCount,
      409,
      'This person already has an account in your organisation.',
    );
    if (v.teamId)
      must(
        (await db.query('SELECT 1 FROM teams WHERE id=$1', [v.teamId]))
          .rowCount,
        400,
        'Choose a team in your organisation.',
      );
    await emailLink(t, v.email, 'invite', v);
    res.status(202).json({ sent: true });
  }),
);
router.patch(
  '/users/:id',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const v = z.object({ active: z.boolean() }).strict().parse(req.body);
    const id = z.string().uuid().parse(req.params.id);
    must(id !== req.actor.id, 400, 'You cannot deactivate your own account.');
    const q = await db.query(
      'UPDATE org_users SET active=$2 WHERE id=$1 RETURNING teacher_id',
      [id, v.active],
    );
    must(q.rowCount, 404, 'User not found.');
    await db.query(
      'UPDATE org_sessions SET revoked_at=now() WHERE user_id=$1',
      [id],
    );
    if (q.rows[0].teacher_id)
      await db.query('UPDATE teachers SET active=$2 WHERE id=$1', [
        q.rows[0].teacher_id,
        v.active,
      ]);
    res.json({ updated: true });
  }),
);
router.delete(
  '/sample-data',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    await db.transaction(async (c) => {
      await c.query('DELETE FROM erp_records WHERE is_sample=true');
      await c.query('DELETE FROM work_tasks WHERE is_sample=true');
    });
    res.json({
      deleted: true,
      message:
        'Sample announcements and tasks removed. Teams and channels with members are retained.',
    });
  }),
);
router.get(
  '/export',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const { once } = require('node:events');
    res
      .type('json')
      .set(
        'Content-Disposition',
        'attachment; filename="' + currentTenant().slug + '-export.json"',
      );
    const write = async (s) => {
      if (!res.write(s)) await once(res, 'drain');
    };
    await write(
      '{"organisation":' +
        JSON.stringify(publicTenant(currentTenant())) +
        ',"exportedAt":' +
        JSON.stringify(new Date().toISOString()),
    );
    for (const table of require('../platform/cleanup').OWNED_DELETE_ORDER) {
      await write(',' + JSON.stringify(table) + ':[');
      let first = true;
      for (let offset = 0; ; offset += 100) {
        const q = await db.query(
          'SELECT * FROM ' + table + ' LIMIT 100 OFFSET $1',
          [offset],
        );
        for (const row of q.rows) {
          const safe = {};
          for (const [k, v] of Object.entries(row)) {
            if (/password|token|csrf|fingerprint|ip_address|passcode/i.test(k))
              continue;
            safe[k] = ArrayBuffer.isView(v)
              ? { encoding: 'base64', data: Buffer.from(v).toString('base64') }
              : v;
          }
          await write((first ? '' : ',') + JSON.stringify(safe));
          first = false;
        }
        if (q.rowCount < 100) break;
      }
      await write(']');
    }
    await write('}');
    res.end();
  }),
);
router.delete(
  '/data',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const t = currentTenant();
    must(
      t.id !== DPS_ID,
      409,
      'DPS Agra data deletion is protected during migration.',
    );
    must(
      req.body.confirmName === t.name,
      400,
      'Enter your organisation name to confirm deletion.',
    );
    const pw = z.string().max(72).parse(req.body.password);
    must(
      await bcryptCompare(pw, req.actor),
      403,
      'Your current password is incorrect.',
    );
    require('../platform/workplace').disconnectTenant(t.id);
    await require('../platform/cleanup').deleteTenant(t);
    res.clearCookie(auth.COOKIE, auth.options(false));
    res.json({ deleted: true });
  }),
);
async function bcryptCompare(pw, actor) {
  return require('bcryptjs').compare(pw, actor.password_hash);
}
module.exports = router;
