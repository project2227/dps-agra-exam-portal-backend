'use strict';
const db = require('../config/db');
const { withTenant, currentTenant, DPS_ID, enabled } = require('./context');
const { must, asyncWrap } = require('../utils/http');
const RESERVED = new Set([
  'www',
  'api',
  'admin',
  'owner',
  'help',
  'mail',
  'smtp',
  'assets',
  'static',
  'support',
  'status',
  'login',
  'signup',
  'new',
  'plinth',
  'rollcall',
  'app',
  'auth',
  'accounts',
  'cdn',
  'files',
  'docs',
  't',
  'localhost',
  'stage',
  'staging',
  'test',
  'demo',
  'dpslab',
  'student',
  'teacher',
  'workplace',
  'institute',
  'billing',
  'root',
]);
const validSlug = (slug) =>
  typeof slug === 'string' &&
  /^[a-z][a-z0-9-]{2,47}$/.test(slug) &&
  !slug.endsWith('-') &&
  !slug.includes('--') &&
  !RESERVED.has(slug);
function hostOf(value) {
  try {
    return new URL(
      value.includes('://') ? value : 'https://' + value,
    ).hostname.toLowerCase();
  } catch {
    return '';
  }
}
const rootHost = () =>
  hostOf(process.env.PLATFORM_URL || 'http://localhost:5000');
const tenantRoot = () => String(process.env.TENANT_DOMAIN || '').toLowerCase();
const legacyHosts = () =>
  String(
    process.env.LEGACY_DPS_HOSTS ||
      'dpslab.onrender.com,dps-agra-exam-api.onrender.com,dps-agra-exam-frontend.onrender.com',
  )
    .split(',')
    .map((x) => x.trim());
function requestedSlug(host, path = '', socketSite) {
  if (legacyHosts().includes(host)) return 'dps-agra';
  const domain = tenantRoot();
  if (domain && host.endsWith('.' + domain)) {
    const slug = host.slice(0, -domain.length - 1);
    return validSlug(slug) ? slug : null;
  }
  if (host !== rootHost() && !['localhost', '127.0.0.1'].includes(host))
    return null;
  const match = path.match(/^\/t\/([a-z0-9-]+)(?:\/|$)/);
  const slug = match?.[1] || socketSite;
  return slug && validSlug(slug) ? slug : null;
}
async function resolveTenant(host, path, site) {
  const slug = requestedSlug(host, path, site);
  if (!slug) return null;
  const q = await db.platformQuery('SELECT * FROM tenants WHERE slug=$1', [
    slug,
  ]);
  return q.rows[0] || null;
}
function siteUrl(tenant) {
  const domain = tenantRoot();
  return domain
    ? 'https://' + tenant.slug + '.' + domain
    : String(process.env.PLATFORM_URL || 'http://localhost:5000').replace(
        /\/$/,
        '',
      ) +
        '/t/' +
        tenant.slug;
}
function trustedOrigin(origin, tenant = currentTenant()) {
  if (!origin) return true;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  const root = new URL(process.env.PLATFORM_URL || 'http://localhost:5000');
  if (url.origin === root.origin) return true;
  if (
    tenant &&
    url.hostname === tenant.slug + '.' + tenantRoot() &&
    url.protocol === 'https:'
  )
    return true;
  return (
    tenant?.id === DPS_ID &&
    legacyHosts().includes(url.hostname) &&
    url.protocol === 'https:'
  );
}
function corsOrigin(origin) {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return (
      trustedOrigin(origin, { id: DPS_ID }) ||
      (u.protocol === 'https:' &&
        tenantRoot() &&
        u.hostname.endsWith('.' + tenantRoot()) &&
        validSlug(u.hostname.slice(0, -tenantRoot().length - 1)))
    );
  } catch {
    return false;
  }
}
const middleware = asyncWrap(async (req, res, next) => {
  if (!enabled()) return next();
  // Host is never taken from a client tenant-id or forwarded-host header.
  const host = String(req.headers.host || '')
    .split(':')[0]
    .toLowerCase();
  const tenant = await resolveTenant(host, req.path);
  req.tenant = tenant;
  req.siteBase = '';
  if (tenant && tenant.id !== DPS_ID)
    res.on('finish', () => {
      if (
        res.statusCode < 400 &&
        (req.actor || req.teacher || req.studentAccount || req.student) &&
        Date.now() - new Date(tenant.last_active_at).getTime() > 300000
      )
        db.platformQuery(
          'UPDATE tenants SET last_active_at=now() WHERE id=$1',
          [tenant.id],
        ).catch(() => {});
    });
  const match = req.url.match(/^\/t\/([a-z0-9-]+)(\/.*|$)/);
  if (match) {
    must(tenant, 404, 'Organisation site not found.');
    req.siteBase = '/t/' + tenant.slug;
    req.url = match[2] || '/';
  }
  if (
    req.path.startsWith('/api/platform/') ||
    req.path === '/api/platform' ||
    req.path === '/api/health'
  )
    return next();
  if (req.path.startsWith('/api/') || tenant) {
    must(tenant, 404, 'Open your organisation’s site to continue.');
    must(
      tenant.status === 'ready',
      tenant.status === 'suspended' ? 403 : 409,
      tenant.status === 'suspended'
        ? 'This organisation is suspended. Contact its administrator.'
        : 'This site is still being provisioned.',
    );
  }
  return tenant ? withTenant(tenant, next) : next();
});
function bindSocket(socket, tenant) {
  socket.data.tenant = tenant;
  const original = socket.on.bind(socket);
  socket.on = (name, handler) =>
    original(name, (...args) => withTenant(tenant, () => handler(...args)));
}
async function socketTenant(socket, next) {
  if (!enabled()) return next();
  try {
    const host = String(socket.handshake.headers.host || '')
      .split(':')[0]
      .toLowerCase();
    const tenant = await resolveTenant(host, '', socket.handshake.auth?.site);
    must(tenant?.status === 'ready', 403, 'Organisation access unavailable.');
    must(
      trustedOrigin(socket.handshake.headers.origin, tenant),
      403,
      'Untrusted origin.',
    );
    bindSocket(socket, tenant);
    withTenant(tenant, next);
  } catch {
    next(new Error('Organisation access unavailable.'));
  }
}
module.exports = {
  RESERVED,
  validSlug,
  rootHost,
  tenantRoot,
  hostOf,
  requestedSlug,
  resolveTenant,
  siteUrl,
  trustedOrigin,
  corsOrigin,
  middleware,
  socketTenant,
  bindSocket,
};
