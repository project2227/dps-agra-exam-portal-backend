'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=f=>fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8');
test('bounded Neon file store has quota and no filesystem writes',()=>{
 const s=read('src/services/storage.js'),env=read('src/config/env.js');
 assert.match(env,/UPLOAD_PROVIDER:z\.enum\(\['s3','postgres','disabled'\]\)/);
 assert.match(s,/MAX_DB_FILE_BYTES=5\*1024\*1024/);
 assert.match(s,/MAX_DB_TOTAL_BYTES=64\*1024\*1024/);
 assert.match(s,/pg_advisory_xact_lock/);
 assert.match(s,/DELETE FROM stored_files WHERE storage_key=\$1/);
 assert.doesNotMatch(s,/writeFile|createWriteStream|public\/uploads/);
});
test('file delivery requires expiring signed links, not a public database file key',()=>{
 const s=read('src/services/storage.js');
 const route=read('src/routes/handout.routes.js');
 assert.match(s,/crypto\.timingSafeEqual/);
 assert.match(s,/SIGNED_URL_SECONDS=300/);
 assert.match(route,/\/files\/:token/);
 assert.match(route,/Cache-Control','private, no-store'/);
 assert.match(route,/Content-Disposition/);
 assert.match(route,/\/student\/handouts\/:id\/download',student/);
 assert.match(route,/\/teacher\/handouts\/:id\/download',teacher/);
});
