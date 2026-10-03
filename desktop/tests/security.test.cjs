'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
const {
  tenantSite,
  permitted,
  captureAllowed,
  badgeText,
} = require('../security.cjs');
test('navigation stays inside the chosen tenant, including path-based staging', () => {
  const t = tenantSite('https://app.example.com/t/greenfield');
  assert(permitted(t.home + '/sharing', t));
  assert(!permitted('https://app.example.com/t/other/sharing', t));
  assert(!permitted('https://evil.example.com/t/greenfield', t));
  assert(!permitted('javascript:alert(1)', t));
  assert.throws(() => tenantSite('https://user:pass@app.example.com'));
  assert.throws(() => tenantSite('http://app.example.com'));
});
test('pickerless access fails closed without current consent and a prepared request', () => {
  const site = tenantSite('https://greenfield.example.com');
  const base = {
    site,
    url: site.home + '/sharing',
    userGesture: true,
    resumeAllowed: false,
    permit: { allowed: true },
  };
  assert(captureAllowed(base));
  assert(!captureAllowed({ ...base, permit: { allowed: false } }));
  assert(!captureAllowed({ ...base, userGesture: false }));
  assert(!captureAllowed({ ...base, url: 'https://other.example.com' }));
});
test('badge text follows screen and optional webcam state', () => {
  assert.equal(
    badgeText({ screen: true, webcam: false }),
    'Screen is being shared',
  );
  assert.equal(
    badgeText({ screen: true, webcam: true }),
    'Screen and webcam are being shared',
  );
  assert.equal(badgeText({ screen: false, webcam: true }), 'Sharing paused');
});
