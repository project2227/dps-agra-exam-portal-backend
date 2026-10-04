'use strict';
// Public-edge staging checks. Fixtures are random, synthetic and deleted in
// finally. Email delivery, OS capture and Windows reboot are separate gates.
const crypto = require('crypto'),
  bcrypt = require('bcryptjs'),
  assert = require('node:assert/strict');
const db = require('../src/config/db'),
  { withTenant } = require('../src/platform/context');
const { io } = require('socket.io-client');
const fixtureVideo = Buffer.from(
  'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAJiEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggJM7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiECfQAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYgiojZ8QWZn85yBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhB3NZQDgibCBoLqBWpqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYgiojZ8QWZn82fIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDIuMDAwMDAwMDAwAB9DtnVAp+eBAKPUgQAAgPAFAJ0BKqAAWgAARwiFhYiFhIgCAgJ1qgP4AgaaGHffnr0ZeI569GXiOevRl4jnr0ZeI569GXh6AP7xcg/8zRMcx+1f/9+IvvxF9+Iv++0wo5iBAfQAEQIAARAQABgAGFgv9AAIgIEAAACjmIED6AARAgABEBAAGAAYWC/0AAiAgQAAAKOYgQXcABECAAEQEAAYABhYL/QACICBAAAAHFO7a5G7j7OBALeK94EB8YIBn/CBAw==',
  'base64',
);
async function stageSmoke() {
  const root = process.env.API_PUBLIC_URL;
  const staging=process.env.PLINTH_STAGE_SMOKE==='true' && /^https:\/\/plinth-stage-[a-z0-9-]+\.onrender\.com$/.test(root||'');
  const production=process.env.PLINTH_RELEASE_SMOKE==='true' && root==='https://plinth-pk84.onrender.com';
  if(!staging&&!production)throw Error('Explicit named-service release smoke opt-in required.');
  let checks = 0,
    tenant;
  const sockets = [],
    slug = 'smoke-' + crypto.randomBytes(6).toString('hex'),
    password = crypto.randomBytes(28).toString('base64url'),
    email = slug + '@example.invalid';
  const jar = () => ({ cookies: new Map(), csrf: null });
  const cookie = (j) => [...j.cookies].map(([k, v]) => k + '=' + v).join('; ');
  const once = (s, e) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error('Socket event missing: ' + e)),
        18000,
      );
      s.once(e, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
      s.once('connect_error', () => {
        clearTimeout(timer);
        reject(Error('Socket sign-in failed'));
      });
    });
  async function request(path, j, method = 'GET', body) {
    const form = body instanceof FormData;
    const response = await fetch(root + path, {
      method,
      headers: {
        Origin: root,
        ...(j ? { Cookie: cookie(j), 'X-CSRF-Token': j.csrf || '' } : {}),
        ...(body && !form ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    for (const raw of response.headers.getSetCookie())
      if (j) {
        const first = raw.split(';')[0],
          at = first.indexOf('=');
        j.cookies.set(first.slice(0, at), first.slice(at + 1));
        assert.match(raw, /HttpOnly/);
        assert.match(raw, /Secure/);
      }
    const data = (response.headers.get('content-type') || '').includes('json')
      ? await response.json()
      : Buffer.from(await response.arrayBuffer());
    if (j && data.csrfToken) j.csrf = data.csrfToken;
    return { status: response.status, data };
  }
  const ok = (response, status = 200) => {
    assert.equal(response.status, status);
    checks++;
    return response.data;
  };
  try {
    const health = ok(await request('/api/health'));
    assert.equal(health.release, 'plinth-v1');
    const institute = await require('./release-smoke').releaseSmoke();
    checks += institute.checks;
    tenant = (
      await db.platformQuery(
        "INSERT INTO tenants(slug,name,path,theme) VALUES($1,'Disposable release workplace','workplace',$2) RETURNING *",
        [slug, JSON.stringify({ preset: 'mint' })],
      )
    ).rows[0];
    const user = await withTenant(
      tenant,
      async () =>
        (
          await db.query(
            "INSERT INTO org_users(name,email,password_hash,role) VALUES('Synthetic release admin',$1,$2,'admin') RETURNING *",
            [email, await bcrypt.hash(password, 12)],
          )
        ).rows[0],
    );
    const token = crypto.randomBytes(32).toString('base64url');
    await db.platformQuery(
      "INSERT INTO platform_email_links(tenant_id,token_hash,kind,email,expires_at) VALUES($1,$2,'verify',$3,now()+interval '5 minutes')",
      [tenant.id, require('../src/platform/auth').hash(token), email],
    );
    const verified = ok(
      await request('/api/platform/verify', null, 'POST', { token }),
    );
    for (let i = 0; i < 40; i++) {
      const r = await request('/api/platform/provisioning/' + slug);
      if (r.data.status === 'complete') break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.equal(
      ok(await request('/api/platform/provisioning/' + slug)).status,
      'complete',
    );
    const base = '/t/' + slug,
      admin = jar(),
      employee = jar();
    ok(
      await request(base + '/api/site/entry', admin, 'POST', {
        token: verified.entryToken,
      }),
    );
    ok(
      await request(base + '/api/site/entry', jar(), 'POST', {
        token: verified.entryToken,
      }),
      400,
    );
    ok(
      await request(base + '/api/site/login', admin, 'POST', {
        email,
        password,
      }),
    );
    ok(
      await request(base + '/api/site/policy', admin, 'PATCH', {
        enabled: true,
        noticeAccepted: true,
        timezone: 'UTC',
        start: '00:00',
        end: '23:59',
        days: [0, 1, 2, 3, 4, 5, 6],
        allowlist: ['work-app'],
        retentionDays: 1,
      }),
    );
    const team = ok(await request(base + '/api/workplace/teams', admin))
      .teams[0];
    await withTenant(tenant, async () => {
      const e = (
        await db.query(
          "INSERT INTO org_users(name,email,password_hash,role,verified_at) VALUES('Synthetic employee',$1,$2,'employee',now()) RETURNING id",
          ['employee-' + email, await bcrypt.hash(password, 12)],
        )
      ).rows[0];
      await db.query(
        'INSERT INTO team_members(team_id,user_id) VALUES($1,$2)',
        [team.id, e.id],
      );
      await db.query(
        "INSERT INTO chat_members(channel_id,user_id) SELECT id,$1 FROM chat_channels WHERE name='general'",
        [e.id],
      );
    });
    ok(
      await request(base + '/api/site/login', employee, 'POST', {
        email: 'employee-' + email,
        password,
      }),
    );
    ok(
      await request(base + '/api/workplace/sessions', employee, 'POST', {
        teamId: team.id,
      }),
      403,
    );
    const notice = ok(await request(base + '/api/workplace/consent', employee));
    ok(
      await request(base + '/api/workplace/consent', employee, 'POST', {
        accept: true,
        policyVersion: notice.policyVersion,
      }),
    );
    const session = ok(
      await request(base + '/api/workplace/sessions', employee, 'POST', {
        teamId: team.id,
      }),
      201,
    ).session;
    const activity={mode:'reading',source:'browser',inputEvents:0,edits:0,repeats:0,idleSeconds:600};
    const observed=ok(await request(base+'/api/productivity/sessions/'+session.id+'/activity',employee,'POST',activity));assert.equal(observed.category,'reading');
    assert.equal(ok(await request(base+'/api/productivity/sessions/'+session.id+'/activity',employee,'POST',activity)).accepted,false);
    ok(await request(base+'/api/productivity/sessions/'+session.id+'/activity',admin,'POST',activity),404);
    const report=ok(await request(base+'/api/productivity/report',employee));assert.equal(report.rows.length,1);
    assert.ok(!report.rows.some(r=>r.name==='Synthetic admin'));
    const exported=ok(await request(base+'/api/productivity/export.csv',admin));assert.ok(exported.toString().includes('estimated_engaged_hours'));
    const task=ok(await request(base+'/api/workplace/tasks',admin)).tasks.find(t=>t.assignee_id===null);
    if(task){
      ok(await request(base+'/api/productivity/summaries',employee,'POST',{taskId:task.id,summary:'Cannot claim someone else’s task',aiConsent:false}),404);
    }
    const assigned=ok(await request(base+'/api/workplace/tasks',admin,'POST',{teamId:team.id,assigneeId:session.user_id,title:'Release report task',description:'Complete a synthetic work summary'}),201).task;
    const note=ok(await request(base+'/api/productivity/summaries',employee,'POST',{taskId:assigned.id,summary:'Completed the synthetic report and checked its employee scope.',aiConsent:false}),201);assert.ok(note.note.id);
    assert.equal(ok(await request(base+'/api/productivity/report',employee)).rows[0].summaries,1);
    const opts = (j) => ({
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: { site: slug },
      extraHeaders: { Cookie: cookie(j), Origin: root },
    });
    const observer = io(root + '/workplace', opts(admin)),
      pupil = io(root + '/workplace', opts(employee));
    sockets.push(observer, pupil);
    await Promise.all([once(observer, 'connect'), once(pupil, 'connect')]);
    checks++;
    let event = once(observer, 'work:monitorJoined');
    observer.emit('work:joinMonitor', { teamId: team.id });
    await event;
    checks++;
    event = once(pupil, 'work:joined');
    pupil.emit('work:joinSession', { sessionId: session.id });
    await event;
    checks++;
    event = once(pupil, 'teacher:mediaRequest');
    observer.emit('teacher:requestMediaPreview', {
      sessionId: session.id,
      mediaType: 'screen',
    });
    assert.equal((await event).mediaType, 'screen');
    checks++;
    event = once(observer, 'webrtc:offer');
    pupil.emit('webrtc:offer', {
      sessionId: session.id,
      mediaType: 'screen',
      payload: { type: 'offer', sdp: 'synthetic-transport-check' },
    });
    assert.equal((await event).sessionId, session.id);
    checks++;
    const flag = ok(
      await request(
        base + '/api/workplace/sessions/' + session.id + '/sensor',
        employee,
        'POST',
        { app: 'game-app', title: 'Synthetic release window' },
      ),
      201,
    ).flag;
    assert.equal(flag.severity, 'medium');
    assert.ok(
      ok(await request(base + '/api/workplace/dashboard', admin)).flags.some(
        (f) => f.id === flag.id,
      ),
    );
    const record = ok(
      await request(base + '/api/workplace/incidents', employee, 'POST', {
        sessionId: session.id,
        flagId: flag.id,
        clientId: crypto.randomUUID(),
        mimeType: 'video/webm',
      }),
      201,
    ).recordingId;
    const videoForm = new FormData();
    videoForm.append(
      'chunk',
      new Blob([fixtureVideo], { type: 'video/webm' }),
      'release.webm',
    );
    ok(
      await request(
        base + '/api/workplace/incidents/' + record + '/chunks/0',
        employee,
        'POST',
        videoForm,
      ),
    );
    ok(
      await request(
        base + '/api/workplace/incidents/' + record + '/finish',
        employee,
        'POST',
        { reason: 'synthetic-release-complete' },
      ),
    );
    const videoLink = ok(
      await request(
        base + '/api/workplace/incidents/' + record + '/link',
        admin,
      ),
    ).url;
    assert.deepEqual(ok(await request(base + videoLink, admin)), fixtureVideo);
    ok(await request(base + videoLink, employee), 403);
    const channel = ok(await request(base + '/api/chat/channels', employee))
      .channels[0];
    ok(
      await request(
        base + '/api/chat/channels/' + channel.id + '/messages',
        employee,
        'POST',
        { body: 'Synthetic release message' },
      ),
      201,
    );
    const upload = new FormData();
    upload.append(
      'file',
      new Blob(['Synthetic file'], { type: 'text/plain' }),
      'release.txt',
    );
    const message = ok(
      await request(
        base + '/api/chat/channels/' + channel.id + '/files',
        employee,
        'POST',
        upload,
      ),
      201,
    ).message;
    assert.ok(
      ok(
        await request(
          base + '/api/chat/channels/' + channel.id + '/messages',
          admin,
        ),
      ).messages.some((m) => m.id === message.id),
    );
    const download = ok(
      await request(
        base + '/api/chat/files/' + message.files[0].id + '/link',
        admin,
      ),
    ).url;
    assert.equal(
      ok(await request(base + download, admin)).toString(),
      'Synthetic file',
    );
    ok(
      await request(
        base + '/api/workplace/sessions/' + session.id + '/state',
        employee,
        'PATCH',
        { status: 'paused' },
      ),
    );
    assert.equal(
      ok(await request(base + '/api/workplace/desktop-permit', employee))
        .allowed,
      false,
    );
    ok(await request(base+'/api/productivity/sessions/'+session.id+'/activity',employee,'POST',activity),403);
    ok(await request(base + '/api/site/logout', employee, 'POST', {}));
    ok(await request(base + '/api/workplace/dashboard', employee), 401);
    return {
      checks,
      emailConfigured: require('../src/services/email').emailReady(),
      realBrowserCaptureTested: false,
      windowsTested: false,
    };
  } catch (error) {
    error.releaseChecks = checks;
    throw error;
  } finally {
    sockets.forEach((s) => s.disconnect());
    if (tenant) {
      const owned = (
        await db.platformQuery(
          "SELECT * FROM tenants WHERE id=$1 AND slug=$2 AND name='Disposable release workplace'",
          [tenant.id, slug],
        )
      ).rows[0];
      if (owned) await require('../src/platform/cleanup').deleteTenant(owned);
    }
  }
}
module.exports = { stageSmoke };
