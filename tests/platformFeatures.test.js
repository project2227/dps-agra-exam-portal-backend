'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
const { middleware } = require('../src/platform/features');
test('disabled features fail closed while sessions and organisation settings remain available', () => {
  let next = 0,
    status = 0,
    message = '';
  const res = {
    status(n) {
      status = n;
      return this;
    },
    json(body) {
      message = body.error;
    },
  };
  middleware(
    { path: '/api/exams/123/join', tenant: { features: ['chat'] } },
    res,
    () => next++,
  );
  assert.equal(status, 403);
  assert.equal(next, 0);
  assert.match(message, /administrator/);
  middleware(
    { path: '/api/accounts/student/login', tenant: { features: [] } },
    res,
    () => next++,
  );
  middleware(
    { path: '/api/site/features', tenant: { features: [] } },
    res,
    () => next++,
  );
  assert.equal(next, 2);
  middleware(
    { path: '/api/exams/123/join', tenant: { features: ['exams'] } },
    res,
    () => next++,
  );
  assert.equal(next, 3);
});
