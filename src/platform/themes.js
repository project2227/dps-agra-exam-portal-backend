'use strict';
const PRESETS = require('../../shared/themes.json');
const rgb = (hex) =>
  hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((x) => parseInt(x, 16) / 255);
function luminance(hex) {
  return rgb(hex)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    .reduce((n, x, i) => n + x * [0.2126, 0.7152, 0.0722][i], 0);
}
function foreground(hex) {
  const l = luminance(hex);
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#000000' : '#ffffff';
}
function resolveTheme(theme, path) {
  const preset = PRESETS[theme?.preset];
  if (!preset || preset.path !== path)
    throw Object.assign(
      new Error('Choose a theme for your organisation type.'),
      { status: 400 },
    );
  const primary = /^#[a-f0-9]{6}$/i.test(theme?.primary || '')
      ? theme.primary
      : preset.primary,
    accent = /^#[a-f0-9]{6}$/i.test(theme?.accent || '')
      ? theme.accent
      : preset.accent;
  return {
    ...preset,
    preset: theme.preset,
    primary,
    accent,
    onPrimary: foreground(primary),
    onAccent: foreground(accent),
  };
}
module.exports = { PRESETS, luminance, foreground, resolveTheme };
