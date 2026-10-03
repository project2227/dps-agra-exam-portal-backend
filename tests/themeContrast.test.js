'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  themes = require('../shared/themes.json');
const luminance = (hex) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    .reduce((n, x, i) => n + x * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const [lo, hi] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (hi + 0.05) / (lo + 0.05);
};
test('all ten tenant themes meet AA for body text and visible control borders in both modes', () => {
  assert.equal(Object.keys(themes).length, 10);
  for (const [name, t] of Object.entries(themes))
    for (const prefix of ['', 'dark']) {
      const key = (k) =>
        prefix ? prefix + k[0].toUpperCase() + k.slice(1) : k;
      for (const background of ['canvas', 'surface']) {
        for (const text of ['ink', 'muted'])
          assert.ok(
            contrast(t[key(text)], t[key(background)]) >= 4.5,
            name + ' ' + prefix + ' ' + text,
          );
        assert.ok(
          contrast(t[key('line')], t[key(background)]) >= 3,
          name + ' ' + prefix + ' control border',
        );
      }
    }
});
