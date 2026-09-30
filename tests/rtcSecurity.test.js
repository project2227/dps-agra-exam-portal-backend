'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('TURN keys remain on backend and credentials endpoint is authenticated and rate limited',()=>{
 const env=fs.readFileSync('src/config/env.js','utf8');
 const rtc=fs.readFileSync('src/routes/rtc.routes.js','utf8');
 const client=fs.readFileSync('frontend/src/services/turnIce.js','utf8');
 assert.match(env,/TURN_KEY_API_TOKEN/)
 assert.match(rtc,/router\.get\('\/ice',limit,auth/)
 assert.match(rtc,/Cache-Control.*no-store/)
 assert.match(rtc,/ttl:28800/)
 assert.match(rtc,/https:\/\/rtc\.live\.cloudflare\.com/)
 assert.doesNotMatch(client,/TURN_KEY_API_TOKEN/)
 assert.match(client,/Authorization:'Bearer '/)
});
