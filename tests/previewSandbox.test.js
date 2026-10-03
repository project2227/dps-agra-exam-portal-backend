'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { previewSandbox } = require('../src/services/previewSandbox');
test('web practice gets an opaque sandbox without permitting inline scripts in the application', () => {
  const headers = {}, res = { set(k,v) { headers[k]=v; return this; }, type() { return this; }, send(value) { this.html=value; } };
  previewSandbox({},res);
  assert.match(headers['Content-Security-Policy'], /sandbox allow-scripts allow-modals/);
  assert.ok(!headers['Content-Security-Policy'].includes('allow-same-origin'));
  assert.match(headers['Content-Security-Policy'], /form-action 'none'/);
  assert.match(res.html, /event.source===parent/);
  assert.match(res.html, /event.source===frame.contentWindow/);
  assert.match(res.html, /sandbox="allow-scripts allow-modals"/);
  const app = require('fs').readFileSync(require('path').join(__dirname,'../src/app.js'),'utf8');
  assert.ok(!app.match(/scriptSrc:\[[^\]]*unsafe-inline/));
});
