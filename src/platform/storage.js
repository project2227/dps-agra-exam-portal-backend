'use strict';
const sharp = require('sharp'),
  crypto = require('crypto');
const db = require('../config/db');
const { must } = require('../utils/http');
const { currentTenant } = require('./context');
const MAX_FILE = 8 * 1024 * 1024,
  MAX_CLIP = 12 * 1024 * 1024;
function allowedFile(file) {
  const b = file.buffer,
    name = file.originalname.replace(/[\\/\x00-\x1f]/g, '_').slice(0, 160),
    ext = name.split('.').at(-1).toLowerCase();
  const type =
    ext === 'pdf' && b.subarray(0, 5).toString() === '%PDF-'
      ? 'application/pdf'
      : ext === 'png' &&
          b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'image/png'
        : ['jpg', 'jpeg'].includes(ext) &&
            b[0] === 255 &&
            b[1] === 216 &&
            b[2] === 255
          ? 'image/jpeg'
          : ext === 'webp' &&
              b.subarray(0, 4).toString() === 'RIFF' &&
              b.subarray(8, 12).toString() === 'WEBP'
            ? 'image/webp'
            : ['txt', 'csv'].includes(ext) && !b.includes(0)
              ? 'text/plain'
              : ['docx', 'xlsx', 'pptx'].includes(ext) &&
                  b.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))
                ? 'application/octet-stream'
                : null;
  must(
    type && b.length > 0 && b.length <= MAX_FILE,
    415,
    'Upload a PDF, image, text file or Office document up to 8 MB. Executable and active web files are blocked.',
  );
  return { name, type };
}
async function reserve(c, bytes) {
  const tenant = currentTenant();
  const q = await c.query(
    'SELECT storage_quota,storage_used FROM tenants WHERE id=$1 FOR UPDATE',
    [tenant.id],
  );
  must(
    q.rowCount &&
      Number(q.rows[0].storage_used) + bytes <= Number(q.rows[0].storage_quota),
    507,
    'Your organisation’s storage is full. Ask its administrator to remove older files or recordings.',
  );
}
async function logo(tenant, file) {
  must(
    file && file.buffer.length <= 2 * 1024 * 1024,
    400,
    'Choose a PNG, JPEG or WebP logo up to 2 MB.',
  );
  const meta = await sharp(file.buffer, {
    limitInputPixels: 16000000,
  }).metadata();
  must(
    ['png', 'jpeg', 'webp'].includes(meta.format),
    415,
    'Choose a PNG, JPEG or WebP logo.',
  );
  const icons = await Promise.all(
    [32, 192, 512].map((size) =>
      sharp(file.buffer, { limitInputPixels: 16000000 })
        .rotate()
        .resize(size, size, { fit: 'cover', position: 'attention' })
        .png()
        .toBuffer(),
    ),
  );
  const { withTenant } = require('./context');
  await withTenant(tenant, () =>
    db.transaction(async (c) => {
      const old = (
        await c.query(
          'SELECT octet_length(icon32)+octet_length(icon192)+octet_length(icon512) AS n FROM branding_assets',
        )
      ).rows[0];
      const bytes = icons.reduce((n, b) => n + b.length, 0);
      await reserve(c, Math.max(0, bytes - Number(old?.n || 0)));
      await c.query(
        'INSERT INTO branding_assets(icon32,icon192,icon512) VALUES($1,$2,$3) ON CONFLICT(tenant_id) DO UPDATE SET icon32=excluded.icon32,icon192=excluded.icon192,icon512=excluded.icon512,updated_at=now()',
        icons,
      );
    }),
  );
  await db.platformQuery('UPDATE tenants SET logo_key=$2 WHERE id=$1', [
    tenant.id,
    'uploaded',
  ]);
}
function signature(payload) {
  const value = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return (
    value +
    '.' +
    crypto
      .createHmac('sha256', process.env.JWT_SECRET)
      .update('plinth-download:' + value)
      .digest('base64url')
  );
}
function verifySignature(raw, actor, kind, id) {
  try {
    const [value, mac] = String(raw || '').split('.');
    const expected = crypto
      .createHmac('sha256', process.env.JWT_SECRET)
      .update('plinth-download:' + value)
      .digest('base64url');
    if (
      !mac ||
      mac.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
    )
      return false;
    const p = JSON.parse(Buffer.from(value, 'base64url'));
    return (
      p.exp > Date.now() &&
      p.tenant === currentTenant().id &&
      p.user === actor.id &&
      p.kind === kind &&
      p.id === id
    );
  } catch {
    return false;
  }
}
function downloadToken(actor, kind, id) {
  return signature({
    tenant: currentTenant().id,
    user: actor.id,
    kind,
    id,
    exp: Date.now() + 60000,
  });
}
module.exports = {
  MAX_FILE,
  MAX_CLIP,
  allowedFile,
  reserve,
  logo,
  downloadToken,
  verifySignature,
};
