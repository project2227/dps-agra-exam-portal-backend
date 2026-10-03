'use strict';
const express = require('express'),
  multer = require('multer'),
  rateLimit = require('express-rate-limit'),
  bcrypt = require('bcryptjs'),
  crypto = require('crypto');
const { z } = require('zod');
const db = require('../config/db');
const { asyncWrap, must } = require('../utils/http');
const { validSlug, siteUrl, trustedOrigin } = require('../platform/tenancy');
const { withTenant, DPS_ID } = require('../platform/context');
const auth = require('../platform/auth'),
  provision = require('../platform/provisioning'),
  storage = require('../platform/storage');
const { PRESETS } = require('../platform/themes');
const router = express.Router();
const limited = rateLimit({
  windowMs: 900000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 10, fieldSize: 8192 },
});
const password = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(72)
  .refine((x) => Buffer.byteLength(x) <= 72);
const signupSchema = z
  .object({
    path: z.enum(['institute', 'workplace']),
    name: z.string().trim().min(2).max(120),
    slug: z.string().refine(validSlug, 'Choose a different site name.'),
    theme: z
      .object({
        preset: z.string(),
        primary: z.string().optional(),
        accent: z.string().optional(),
      })
      .strict(),
    adminName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    password,
  })
  .strict();
const publicTenant = (t) => ({
  id: t.id,
  slug: t.slug,
  name: t.name,
  path: t.path,
  status: t.status,
  theme: t.theme,
  features: t.features,
  logoUrl: t.logo_key ? '/api/platform/logo/' + t.slug + '/192' : null,
  siteUrl: siteUrl(t),
});
router.get('/config', (req, res) =>
  res.json({
    name: 'Plinth',
    free: true,
    signupAvailable: provision.emailReady(),
    tenantDomain: process.env.TENANT_DOMAIN || null,
    themes: PRESETS,
    logoMaxBytes: 2097152,
    retentionMaximum: Math.min(
      30,
      Number(process.env.PLATFORM_MAX_RETENTION_DAYS) || 30,
    ),
  }),
);
router.get(
  '/availability',
  limited,
  asyncWrap(async (req, res) => {
    const slug = String(req.query.slug || '').toLowerCase();
    if (!validSlug(slug))
      return res.json({
        available: false,
        reason:
          'Use 3–48 letters, numbers or hyphens. Start with a letter; reserved names are unavailable.',
      });
    const q = await db.platformQuery(
      'SELECT slug,status FROM tenants WHERE slug=$1',
      [slug],
    );
    res.json({
      available: !q.rowCount,
      siteUrl: q.rows[0]?.status === 'ready' ? siteUrl(q.rows[0]) : null,
      reason: q.rowCount
        ? 'This site name is already in use. Choose another.'
        : '',
    });
  }),
);
router.post(
  '/signup',
  limited,
  upload.single('logo'),
  asyncWrap(async (req, res) => {
    must(trustedOrigin(req.headers.origin), 403, 'Open Plinth and try again.');
    let body = req.body;
    if (req.is('multipart/form-data')) {
      body = { ...body, theme: JSON.parse(body.theme || '{}') };
    }
    const v = signupSchema.parse(body);
    const key = auth.hash(
      'signup:' + req.ip + ':' + new Date().toISOString().slice(0, 10),
    );
    const lim = await db.platformQuery(
      'INSERT INTO platform_limits(key_hash,failures) VALUES($1,1) ON CONFLICT(key_hash) DO UPDATE SET failures=platform_limits.failures+1 RETURNING failures',
      [key],
    );
    must(
      lim.rows[0].failures <= 5,
      429,
      'You have created several sites today. Try again tomorrow.',
    );
    const result = await provision.signup(v);
    if (req.file) {
      const tenant = (
        await db.platformQuery('SELECT * FROM tenants WHERE slug=$1', [v.slug])
      ).rows[0];
      await storage.logo(tenant, req.file);
    }
    res.status(202).json({
      ...result,
      message: 'Check your email to verify your account and build your site.',
    });
  }),
);
router.post(
  '/resend',
  limited,
  asyncWrap(async (req, res) => {
    const v = z
      .object({ slug: z.string().refine(validSlug), email: z.string().email() })
      .parse(req.body);
    const t = (
      await db.platformQuery(
        "SELECT * FROM tenants WHERE slug=$1 AND status IN('unverified','failed')",
        [v.slug],
      )
    ).rows[0];
    if (t) {
      const u = await withTenant(t, () =>
        db.query(
          "SELECT email FROM org_users WHERE email=$1 AND role='admin'",
          [v.email],
        ),
      );
      if (u.rowCount) await provision.emailLink(t, v.email, 'verify');
    }
    res.json({
      message:
        'If this site is awaiting verification, a new link has been sent.',
    });
  }),
);
router.get(
  '/link',
  limited,
  asyncWrap(async (req, res) => {
    const token = z.string().min(32).max(80).parse(req.query.token);
    const link = (
      await db.platformQuery(
        'SELECT l.kind,t.name,t.path FROM platform_email_links l JOIN tenants t ON t.id=l.tenant_id WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()',
        [auth.hash(token)],
      )
    ).rows[0];
    must(
      link,
      400,
      'This link has expired or was already used. Ask for a new link.',
    );
    res.json(link);
  }),
);
router.post(
  '/verify',
  limited,
  asyncWrap(async (req, res) => {
    must(trustedOrigin(req.headers.origin), 403, 'Open Plinth and try again.');
    const raw = z.string().min(32).max(80).parse(req.body.token);
    res.json(await provision.verify(raw));
  }),
);
router.post(
  '/accept-invite',
  limited,
  asyncWrap(async (req, res) => {
    const v = z
      .object({
        token: z.string().min(32).max(80),
        name: z.string().trim().min(2).max(120),
        password,
      })
      .strict()
      .parse(req.body);
    must(trustedOrigin(req.headers.origin), 403, 'Open Plinth and try again.');
    const link = (
      await db.platformQuery(
        "UPDATE platform_email_links SET used_at=now() WHERE token_hash=$1 AND kind='invite' AND used_at IS NULL AND expires_at>now() RETURNING *",
        [auth.hash(v.token)],
      )
    ).rows[0];
    must(
      link,
      400,
      'This invitation has expired or was already used. Ask your administrator to resend it.',
    );
    const tenant = (
      await db.platformQuery(
        "SELECT * FROM tenants WHERE id=$1 AND status='ready'",
        [link.tenant_id],
      )
    ).rows[0];
    must(tenant, 403, 'This organisation is unavailable.');
    const pw = await bcrypt.hash(v.password, 12);
    await withTenant(tenant, () =>
      db.transaction(async (c) => {
        let teacherId = null;
        if (tenant.path === 'institute') {
          const t = await c.query(
            'INSERT INTO teachers(name,email,password_hash,role,assigned_classes) VALUES($1,$2,$3,$4,$5) RETURNING id',
            [
              v.name,
              link.email,
              pw,
              link.payload.role === 'admin' ? 'admin' : 'teacher',
              JSON.stringify(link.payload.classes || []),
            ],
          );
          teacherId = t.rows[0].id;
        }
        const u = (
          await c.query(
            'INSERT INTO org_users(name,email,password_hash,role,teacher_id,verified_at) VALUES($1,$2,$3,$4,$5,now()) RETURNING id',
            [v.name, link.email, pw, link.payload.role, teacherId],
          )
        ).rows[0];
        if (link.payload.teamId) {
          await c.query(
            'INSERT INTO team_members(team_id,user_id) VALUES($1,$2)',
            [link.payload.teamId, u.id],
          );
        }
        const general = await c.query(
          "SELECT id FROM chat_channels WHERE name='general' AND kind='channel' LIMIT 1",
        );
        if (general.rowCount)
          await c.query(
            'INSERT INTO chat_members(channel_id,user_id) VALUES($1,$2)',
            [general.rows[0].id, u.id],
          );
      }),
    );
    await db.platformQuery(
      'UPDATE platform_email_links SET used_at=now() WHERE id=$1',
      [link.id],
    );
    res.json({
      siteUrl: siteUrl(tenant),
      message: 'Your account is ready. Sign in to your organisation.',
    });
  }),
);
router.get(
  '/provisioning/:slug',
  limited,
  asyncWrap(async (req, res) => {
    const slug = z.string().refine(validSlug).parse(req.params.slug);
    const r = (
      await db.platformQuery(
        'SELECT j.stage,j.status,t.slug,t.name,t.path FROM provisioning_jobs j JOIN tenants t ON t.id=j.tenant_id WHERE t.slug=$1',
        [slug],
      )
    ).rows[0];
    must(r, 404, 'Site creation has not started. Verify your email first.');
    res.json({
      ...r,
      stages: provision.STAGES,
      siteUrl: r.status === 'complete' ? siteUrl(r) : null,
    });
  }),
);
router.get(
  '/logo/:slug/:size',
  asyncWrap(async (req, res) => {
    const size = z.enum(['32', '192', '512']).parse(req.params.size);
    const t = (
      await db.platformQuery('SELECT * FROM tenants WHERE slug=$1', [
        req.params.slug,
      ])
    ).rows[0];
    must(t && t.logo_key && t.status !== 'suspended', 404, 'Logo unavailable.');
    const q = await withTenant(t, () =>
      db.query('SELECT icon' + size + ' AS bytes FROM branding_assets'),
    );
    must(q.rowCount, 404, 'Logo unavailable.');
    res
      .type('png')
      .set('Cache-Control', 'public, max-age=300')
      .send(q.rows[0].bytes);
  }),
);
router.post(
  '/owner/login',
  limited,
  asyncWrap(async (req, res) => {
    const v = z
      .object({
        email: z.string().trim().email(),
        password: z.string().max(72),
      })
      .parse(req.body);
    must(trustedOrigin(req.headers.origin), 403, 'Open Plinth and try again.');
    const keys = [
      auth.hash('owner:ip:' + req.ip),
      auth.hash('owner:email:' + v.email.toLowerCase()),
    ];
    const locked = (
      await db.platformQuery(
        'SELECT 1 FROM platform_limits WHERE key_hash=ANY($1::text[]) AND locked_until>now()',
        [keys],
      )
    ).rowCount;
    must(!locked, 429, 'Too many attempts. Wait 15 minutes and try again.');
    const u = (
      await db.platformQuery('SELECT * FROM platform_owners WHERE email=$1', [
        v.email,
      ])
    ).rows[0];
    const ok = await bcrypt.compare(
      v.password,
      u?.password_hash ||
        '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36nYkJxb1ylKwJ6/hZJWh2i',
    );
    if (!u || !ok) {
      for (const key of keys)
        await db.platformQuery(
          "INSERT INTO platform_limits(key_hash,failures) VALUES($1,1) ON CONFLICT(key_hash) DO UPDATE SET failures=CASE WHEN platform_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE platform_limits.failures+1 END,window_start=CASE WHEN platform_limits.window_start<now()-interval '15 minutes' THEN now() ELSE platform_limits.window_start END,locked_until=CASE WHEN platform_limits.window_start>=now()-interval '15 minutes' AND platform_limits.failures+1>=5 THEN now()+interval '15 minutes' ELSE NULL END",
          [key],
        );
      must(false, 401, 'Email or password is incorrect.');
    }
    await db.platformQuery('DELETE FROM platform_limits WHERE key_hash=$1', [
      keys[1],
    ]);
    const token = crypto.randomBytes(32).toString('base64url'),
      csrfToken = auth.csrfValue(token);
    await db.platformQuery(
      "INSERT INTO platform_sessions(owner_id,token_hash,csrf_hash,expires_at) VALUES($1,$2,$3,now()+interval '2 hours')",
      [u.id, auth.hash(token), auth.hash(csrfToken)],
    );
    res.cookie(auth.OWNER_COOKIE, token, auth.options(false));
    res.json({ user: { name: u.name, role: 'owner' }, csrfToken });
  }),
);
router.get('/owner/session', auth.requireOwner, (req, res) =>
  res.json({
    user: { name: req.owner.name, role: 'owner' },
    csrfToken: req.owner.csrfToken,
  }),
);
router.post(
  '/owner/logout',
  auth.requireOwner,
  asyncWrap(async (req, res) => {
    await db.platformQuery(
      'UPDATE platform_sessions SET revoked_at=now() WHERE id=$1',
      [req.owner.session_id],
    );
    res.clearCookie(auth.OWNER_COOKIE, auth.options(false));
    res.json({ ok: true });
  }),
);
router.get(
  '/owner/tenants',
  auth.requireOwner,
  asyncWrap(async (req, res) => {
    const q = await db.platformQuery(
      'SELECT id,slug,name,path,status,storage_used,storage_quota,created_at,last_active_at FROM tenants ORDER BY created_at DESC LIMIT 1000',
    );
    res.json({ tenants: q.rows });
  }),
);
router.patch(
  '/owner/tenants/:id',
  auth.requireOwner,
  asyncWrap(async (req, res) => {
    const status = z.enum(['ready', 'suspended']).parse(req.body.status);
    const id = z.string().uuid().parse(req.params.id);
    must(
      id !== DPS_ID || status !== 'suspended',
      409,
      'The DPS migration tenant cannot be suspended while it is the legacy production site.',
    );
    const q = await db.platformQuery(
      'UPDATE tenants SET status=$2 WHERE id=$1 AND verified_at IS NOT NULL RETURNING id',
      [id, status],
    );
    must(q.rowCount, 404, 'Organisation not found.');
    require('../platform/workplace').disconnectTenant(id);
    res.json({ updated: true });
  }),
);
router.delete(
  '/owner/tenants/:id',
  auth.requireOwner,
  asyncWrap(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    must(
      id !== DPS_ID,
      409,
      'DPS Agra deletion is protected during migration.',
    );
    const t = (
      await db.platformQuery('SELECT * FROM tenants WHERE id=$1', [id])
    ).rows[0];
    must(
      t && req.body.confirmName === t.name,
      400,
      'Enter the organisation name to confirm deletion.',
    );
    await require('../platform/cleanup').deleteTenant(t);
    res.json({ deleted: true });
  }),
);
module.exports = router;
module.exports.signupSchema = signupSchema;
module.exports.publicTenant = publicTenant;
