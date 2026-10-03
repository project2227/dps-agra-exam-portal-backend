'use strict';
const nodemailer = require('nodemailer');

// Credentials are read only by the server. Provider responses can contain tokens
// and personal data, so neither responses nor transport exceptions are logged.
const address = (value) => /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(value || '');
function configuration(env = process.env) {
  const provider = env.MAIL_PROVIDER || (env.BREVO_API_KEY ? 'brevo' : 'smtp');
  const ready = address(env.MAIL_FROM) && (provider === 'brevo' ? !!env.BREVO_API_KEY : provider === 'smtp' && !!env.SMTP_URL);
  return { provider, ready, from: env.MAIL_FROM };
}
const emailReady = () => configuration().ready;
const unavailable = () => Object.assign(new Error('Email delivery is unavailable. Try again later or ask your administrator.'), { status: 503, code: 'EMAIL_UNAVAILABLE' });
async function sendEmail({ to, subject, text, name = 'Plinth' }) {
  const config = configuration();
  if (!config.ready || !address(to) || /[\r\n]/.test(subject || '')) throw unavailable();
  try {
    if (config.provider === 'brevo') {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
        body: JSON.stringify({ sender: { email: config.from, name: name.replace(/[\r\n]/g, ' ').slice(0, 100) }, to: [{ email: to }], subject, textContent: text }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw unavailable();
      await response.body?.cancel();
    } else {
      const transport = nodemailer.createTransport(process.env.SMTP_URL, {
        requireTLS: true, connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000,
      });
      try { await transport.sendMail({ from: { name, address: config.from }, to, subject, text }); }
      finally { transport.close?.(); }
    }
    return true;
  } catch { throw unavailable(); }
}
module.exports = { configuration, emailReady, sendEmail };
