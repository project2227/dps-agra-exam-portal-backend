'use strict';
const crypto = require('crypto'),
  bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../config/db');
const { must, asyncWrap } = require('../utils/http');
const { trustedOrigin } = require('./tenancy');
const { currentTenant } = require('./context');
const accounts = require('../services/studentAccounts');
const legacy = require('../services/accountSessions');
const COOKIE = '__Host-plinth-org',
  OWNER_COOKIE = '__Host-plinth-owner';
const hash = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');
const csrfValue = (raw) =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update('plinth-csrf:' + raw)
    .digest('hex');
const options = (remember) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'test',
  sameSite: 'lax',
  path: '/',
  ...(remember ? { maxAge: 7 * 86400000 } : {}),
});
function cookie(headers, name = COOKIE) {
  return String(headers.cookie || '')
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + '='))
    ?.slice(name.length + 1);
}
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  teacherId: u.teacher_id || null,
});
async function create(req, res, user, remember = false) {
  const previous = cookie(req.headers);
  if (previous)
    await db.query(
      'UPDATE org_sessions SET revoked_at=now() WHERE token_hash=$1',
      [hash(previous)],
    );
  const raw = crypto.randomBytes(32).toString('base64url'),
    csrf = csrfValue(raw);
  const expires = new Date(
    Date.now() + (remember ? 7 * 86400000 : 2 * 3600000),
  );
  const q = await db.query(
    'INSERT INTO org_sessions(user_id,token_hash,csrf_hash,device_label,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING id',
    [
      user.id,
      hash(raw),
      hash(csrf),
      legacy.deviceLabel(req.headers['user-agent']),
      expires,
    ],
  );
  res.cookie(COOKIE, raw, options(remember));
  return { csrfToken: csrf, expiresAt: expires, sessionId: q.rows[0].id };
}
async function resolve(headers) {
  const raw = cookie(headers);
  if (raw) {
    const q = await db.query(
      `SELECT u.*,s.id AS session_id,s.csrf_hash FROM org_sessions s JOIN org_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active=true`,
      [hash(raw)],
    );
    if (q.rowCount) {
      const user = q.rows[0];
      if (user.teacher_id) {
        const teacher = (
          await db.query('SELECT * FROM teachers WHERE id=$1 AND active=true', [
            user.teacher_id,
          ])
        ).rows[0];
        if (!teacher) return null;
        if (user.password_hash !== teacher.password_hash) {
          await db.query(
            'UPDATE org_sessions SET revoked_at=now() WHERE user_id=$1',
            [user.id],
          );
          await db.query('UPDATE org_users SET password_hash=$2 WHERE id=$1', [
            user.id,
            teacher.password_hash,
          ]);
        } else
          return {
            ...user,
            name: teacher.name,
            password_hash: teacher.password_hash,
            role: teacher.role,
            source: 'org',
            csrfToken: csrfValue(raw),
          };
      } else return { ...user, source: 'org', csrfToken: csrfValue(raw) };
    }
  }
  const session = await legacy.resolveSession(headers);
  if (session?.teacher_id) {
    const q = await db.query(
      'SELECT * FROM teachers WHERE id=$1 AND active=true',
      [session.teacher_id],
    );
    const teacher = q.rows[0];
    if (teacher) {
      const u = await db.query(
        'SELECT * FROM org_users WHERE teacher_id=$1 AND active=true',
        [teacher.id],
      );
      return {
        ...(u.rows[0] || {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          role: teacher.role === 'admin' ? 'admin' : 'teacher',
          teacher_id: teacher.id,
        }),
        name: teacher.name,
        password_hash: teacher.password_hash,
        role: teacher.role,
        session_id: session.id,
        csrf_hash: session.csrf_hash,
        source: 'teacher',
        legacySession: session,
      };
    }
  }
  return null;
}
function csrf(req, actor) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  must(
    trustedOrigin(req.headers.origin),
    403,
    'Refresh your organisation’s page and try again.',
  );
  must(
    typeof req.headers['x-csrf-token'] === 'string' &&
      hash(req.headers['x-csrf-token']) === actor.csrf_hash,
    403,
    'Refresh this page and try again.',
  );
}
const requireUser = (roles = null) =>
  asyncWrap(async (req, res, next) => {
    must(currentTenant(), 403, 'Organisation context required.');
    const actor = await resolve(req.headers);
    must(actor, 401, 'Sign in to your organisation.');
    must(
      !roles || roles.includes(actor.role),
      403,
      'You do not have access to this page.',
    );
    csrf(req, actor);
    req.actor = actor;
    res.set('Cache-Control', 'no-store');
    next();
  });
const requireAdmin = requireUser(['admin']);
const requireManager = requireUser(['admin', 'manager']);
const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(200),
    password: z.string().min(1).max(72),
    remember: z.boolean().default(false),
  })
  .strict();
async function login(req, res) {
  must(
    trustedOrigin(req.headers.origin),
    403,
    'Open your organisation’s site and try again.',
  );
  const v = loginSchema.parse(req.body);
  const keys = accounts.loginKeys(req, 'org', v.email);
  must(
    !(await accounts.locked(keys)),
    429,
    'Too many attempts. Wait 15 minutes and try again.',
  );
  const q = await db.query('SELECT * FROM org_users WHERE email=$1', [v.email]);
  let user = q.rows[0];
  // Existing teacher passwords remain authoritative when changed in the old account page.
  if (user?.teacher_id) {
    const teacher = await db.query(
      'SELECT password_hash,active FROM teachers WHERE id=$1',
      [user.teacher_id],
    );
    user = {
      ...user,
      password_hash: teacher.rows[0]?.password_hash || '!',
      active: teacher.rows[0]?.active === true,
    };
  }
  const ok = await bcrypt.compare(
    v.password,
    user?.password_hash ||
      '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36nYkJxb1ylKwJ6/hZJWh2i',
  );
  if (!user?.active || !user?.verified_at || !ok) {
    await accounts.failure(keys);
    must(
      false,
      401,
      'Email or password is incorrect. Check both and try again.',
    );
  }
  await db.query('DELETE FROM account_login_limits WHERE key_hash=$1', [
    keys[1],
  ]);
  const session = await create(req, res, user, v.remember);
  let instituteCsrf = null;
  if (user.teacher_id)
    instituteCsrf = (
      await legacy.createSession(req, res, {
        teacherId: user.teacher_id,
        remember: v.remember,
        syncOrg: false,
      })
    ).csrfToken;
  return { user: publicUser(user), ...session, instituteCsrf };
}
async function ownerSession(headers) {
  const raw = cookie(headers, OWNER_COOKIE);
  if (!raw) return null;
  const q = await db.platformQuery(
    'SELECT p.*,s.id AS session_id,s.csrf_hash FROM platform_sessions s JOIN platform_owners p ON p.id=s.owner_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()',
    [hash(raw)],
  );
  return q.rowCount ? { ...q.rows[0], csrfToken: csrfValue(raw) } : null;
}
const requireOwner = asyncWrap(async (req, res, next) => {
  const actor = await ownerSession(req.headers);
  must(actor, 401, 'Platform owner sign in required.');
  csrf(req, actor);
  req.owner = actor;
  res.set('Cache-Control', 'no-store');
  next();
});
async function revoke(req, res) {
  const raw = cookie(req.headers);
  if (raw) {
    const q = await db.query(
      'UPDATE org_sessions SET revoked_at=now() WHERE token_hash=$1 RETURNING user_id',
      [hash(raw)],
    );
    if (q.rowCount)
      require('./workplace').disconnectUser(
        currentTenant().id,
        q.rows[0].user_id,
      );
  }
  res.clearCookie(COOKIE, options(false));
}
module.exports = {
  revoke,
  COOKIE,
  OWNER_COOKIE,
  hash,
  csrfValue,
  cookie,
  options,
  publicUser,
  create,
  resolve,
  csrf,
  requireUser,
  requireAdmin,
  requireManager,
  login,
  requireOwner,
  ownerSession,
};
