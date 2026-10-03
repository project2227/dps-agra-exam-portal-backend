'use strict';
function tenantSite(raw, config) {
  const u = new URL(raw);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    (u.port && u.port !== '443') ||
    u.hash ||
    u.search
  )
    throw Error('Use your organisation’s HTTPS site address.');
  const match = u.pathname.match(/^\/t\/([a-z][a-z0-9-]{2,47})\/?$/);
  if (u.pathname !== '/' && !match)
    throw Error('Use the organisation home address, without a page path.');
  if (config) {
    const sub =
      config.tenantDomain &&
      u.hostname.endsWith('.' + config.tenantDomain) &&
      /^[a-z][a-z0-9-]{2,47}$/.test(
        u.hostname.slice(0, -config.tenantDomain.length - 1),
      );
    const staged = config.platformOrigin === u.origin && !!match;
    if (!sub && !staged)
      throw Error(
        'Use a Workplace address on your organisation’s Plinth platform.',
      );
  }
  return {
    origin: u.origin,
    base: match ? '/t/' + match[1] : '',
    home: u.origin + (match ? '/t/' + match[1] : ''),
    partition:
      'persist:plinth-' +
      require('crypto')
        .createHash('sha256')
        .update(u.origin + u.pathname.replace(/\/$/, ''))
        .digest('hex')
        .slice(0, 20),
  };
}
function permitted(url, site) {
  try {
    const u = new URL(url);
    return (
      u.origin === site.origin &&
      !u.username &&
      !u.password &&
      (!site.base ||
        u.pathname === site.base ||
        u.pathname.startsWith(site.base + '/'))
    );
  } catch {
    return false;
  }
}
function captureAllowed({
  site,
  url,
  userGesture = false,
  resumeAllowed = false,
  permit,
}) {
  return (
    permitted(url, site) &&
    (userGesture || resumeAllowed) &&
    permit?.allowed === true
  );
}
function badgeText(state) {
  return state.screen
    ? state.webcam
      ? 'Screen and webcam are being shared'
      : 'Screen is being shared'
    : 'Sharing paused';
}
module.exports = { tenantSite, permitted, captureAllowed, badgeText };
