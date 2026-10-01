'use strict';
require('dotenv').config();
const { z } = require('zod');
const schema = z.object({
  NODE_ENV:z.enum(['development','test','production']).default('development'),
  PORT:z.coerce.number().int().min(1).max(65535).default(5000),
  FRONTEND_URL:z.string().min(8),
  DATABASE_URL:z.string().min(1),
  DATABASE_SSL:z.enum(['true','false']).default('false'),
  JWT_SECRET:z.string().min(32),
  STUDENT_SESSION_SECRET:z.string().min(32),
  BOOTSTRAP_ADMIN_EMAIL:z.string().default(''),
  BOOTSTRAP_ADMIN_PASSWORD:z.string().default(''),
  BOOTSTRAP_ADMIN_NAME:z.string().default('School Administrator'),
  STORE_IP:z.enum(['true','false']).default('false'),
  FINGERPRINT_PEPPER:z.string().min(16),
  UPLOAD_PROVIDER:z.enum(['s3','postgres','disabled']).default('disabled'),
  API_PUBLIC_URL:z.string().url().or(z.literal('')).default(''),
  S3_BUCKET:z.string().default(''), S3_REGION:z.string().default('ap-south-1'),
  S3_ENDPOINT:z.string().default(''), S3_ACCESS_KEY_ID:z.string().default(''),
  S3_SECRET_ACCESS_KEY:z.string().default(''), S3_FORCE_PATH_STYLE:z.enum(['true','false']).default('false'),
  TURN_KEY_ID:z.string().default(''), TURN_KEY_API_TOKEN:z.string().default(''),
  EXAM_PASSCODE_KEY:z.string().regex(/^(?:[a-f0-9]{64})?$/i).default(''),
  JUDGE0_API_URL:z.string().default(''), JUDGE0_API_KEY:z.string().default(''),
  JUDGE0_API_HOST:z.string().default(''), JUDGE0_AUTH_TOKEN:z.string().default('')
});
const env = schema.parse(process.env);
if (env.NODE_ENV === 'production' && /replace-with/i.test(env.JWT_SECRET+env.STUDENT_SESSION_SECRET)) throw new Error('Replace example authentication secrets.');
module.exports = {env, origins:env.FRONTEND_URL.split(',').map(s=>s.trim().replace(/\/$/,'')).filter(Boolean)};
