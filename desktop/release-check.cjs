'use strict';
if (
  !process.env.CSC_LINK ||
  !process.env.CSC_KEY_PASSWORD ||
  !process.env.PLINTH_UPDATE_URL ||
  !process.env.PLINTH_PLATFORM_URL
) {
  console.error(
    'Signed release requires CSC_LINK, CSC_KEY_PASSWORD, PLINTH_UPDATE_URL and PLINTH_PLATFORM_URL from the secret store. No unsigned installer is published.',
  );
  process.exit(1);
}
const url = new URL(process.env.PLINTH_UPDATE_URL);
if (url.protocol !== 'https:') throw Error('The update feed must use HTTPS.');
const fs = require('fs'),
  config = JSON.parse(fs.readFileSync('package.json', 'utf8'));
config.build.publish.url = url.href;
config.build.win.publisherName = process.env.PLINTH_PUBLISHER_NAME || undefined;
fs.writeFileSync('package.json', JSON.stringify(config, null, 2) + '\n');

fs.writeFileSync(
  'build-config.json',
  JSON.stringify({
    platformOrigin: new URL(process.env.PLINTH_PLATFORM_URL).origin,
    tenantDomain: process.env.PLINTH_TENANT_DOMAIN || null,
  }),
);
