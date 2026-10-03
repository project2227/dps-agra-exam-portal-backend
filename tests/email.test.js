'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { configuration, sendEmail } = require('../src/services/email');

test('email is disabled without a server credential and sender address', () => {
  assert.equal(configuration({}).ready, false);
  assert.equal(configuration({ BREVO_API_KEY: 'test', MAIL_FROM: 'Sender <sender@example.invalid>' }).ready, false);
  assert.equal(configuration({ BREVO_API_KEY: 'test', MAIL_FROM: 'sender@example.invalid' }).provider, 'brevo');
  assert.equal(configuration({ MAIL_PROVIDER: 'smtp', SMTP_URL: 'smtp://test', MAIL_FROM: 'sender@example.invalid' }).ready, true);
});
test('Brevo sends verification content over HTTPS with credentials outside the message body', async () => {
  const saved = { ...process.env }, originalFetch = global.fetch;
  try {
    process.env.MAIL_PROVIDER = 'brevo'; process.env.BREVO_API_KEY = 'private-test-key'; process.env.MAIL_FROM = 'sender@example.invalid';
    let request;
    global.fetch = async (url, options) => { request = { url, options }; return { ok: true, body: { cancel: async () => {} } }; };
    assert.equal(await sendEmail({ to: 'recipient@example.invalid', name: 'School', subject: 'Verify your email', text: 'One-time link' }), true);
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.options.headers['api-key'], 'private-test-key');
    const body = JSON.parse(request.options.body);
    assert.equal(body.textContent, 'One-time link'); assert.equal(body.sender.name, 'School');
    assert.ok(!request.options.body.includes('private-test-key'));
  } finally { global.fetch = originalFetch; for (const key of ['MAIL_PROVIDER','BREVO_API_KEY','MAIL_FROM']) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } }
});
test('mail provider failures return a plain error without exposing its response or credentials', async () => {
  const saved = { ...process.env }, originalFetch = global.fetch;
  try {
    process.env.MAIL_PROVIDER = 'brevo'; process.env.BREVO_API_KEY = 'private-test-key'; process.env.MAIL_FROM = 'sender@example.invalid';
    global.fetch = async () => ({ ok: false, status: 401, text: async () => 'private-test-key' });
    await assert.rejects(sendEmail({ to: 'recipient@example.invalid', subject: 'Reset', text: 'Link' }), error => error.status === 503 && !error.message.includes('private-test-key'));
    await assert.rejects(sendEmail({ to: 'recipient@example.invalid', subject: 'Reset\r\nBcc: other@example.invalid', text: 'Link' }), { code: 'EMAIL_UNAVAILABLE' });
  } finally { global.fetch = originalFetch; for (const key of ['MAIL_PROVIDER','BREVO_API_KEY','MAIL_FROM']) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } }
});
