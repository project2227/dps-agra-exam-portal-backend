'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  http = require('node:http'),
  crypto = require('node:crypto'),
  bcrypt = require('bcryptjs');
const db = require('../src/config/db'),
  { withTenant, DPS_ID } = require('../src/platform/context');
const { Server } = require('socket.io'),
  { io: connect } = require('socket.io-client');
const once = (socket, event) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Missing ' + event)), 5000);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
test(
  'tenant provisioning, Institute preservation and Workplace isolation',
  { timeout: 180000 },
  async (t) => {
    const outbox = [];
    require('nodemailer').createTransport = () => ({
      sendMail: async (mail) => outbox.push(mail),
    });
    process.env.SMTP_URL = 'smtp://disposable-mail-test';
    process.env.MAIL_FROM = 'test@example.invalid';
    const { app } = require('../src/app'),
      server = http.createServer(app),
      io = new Server(server);
    io.use(require('../src/platform/tenancy').socketTenant);
    require('../src/sockets/exam.socket').attachSockets(io);
    require('../src/sockets/workplace.socket').attachWorkplace(io);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const base = 'http://127.0.0.1:' + server.address().port;
    process.env.PLATFORM_URL = base;
    const sockets = [];
    t.after(async () => {
      sockets.forEach((s) => s.disconnect());
      await new Promise((r) => io.close(r));
      await db.pool.end();
    });
    const password = 'SyntheticTenantPassword42!';
    let school,
      work,
      other,
      teacher,
      employee,
      manager,
      team,
      channel,
      file,
      student,
      submission,
      session,
      flag,
      record;
    function jar() {
      return { cookies: new Map(), csrf: null, legacyCsrf: null };
    }
    async function req(path, j, method = 'GET', body, extra = {}) {
      const cookie = j
        ? [...j.cookies].map(([k, v]) => k + '=' + v).join('; ')
        : '';
      const legacy =
        /\/api\/(accounts|auth|teacher|student|learning)\//.test(path) &&
        !path.includes('/api/site/');
      const headers = {
        ...(cookie ? { Cookie: cookie } : {}),
        Origin: base,
        ...(j?.csrf || j?.legacyCsrf
          ? {
              'X-CSRF-Token': legacy
                ? j.legacyCsrf || j.csrf
                : j.csrf || j.legacyCsrf,
            }
          : {}),
        ...extra,
      };
      if (body && !(body instanceof FormData))
        headers['Content-Type'] = 'application/json';
      const res = await fetch(base + path, {
        method,
        headers,
        body:
          body instanceof FormData
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
      });
      for (const raw of res.headers.getSetCookie()) {
        if (!j) continue;
        const first = raw.split(';')[0],
          at = first.indexOf('=');
        if (/Max-Age=0|Expires=Thu, 01 Jan 1970/.test(raw))
          j.cookies.delete(first.slice(0, at));
        else j.cookies.set(first.slice(0, at), first.slice(at + 1));
        j.lastCookie = raw;
      }
      const type = res.headers.get('content-type') || '';
      const data = type.includes('json')
        ? await res.json()
        : Buffer.from(await res.arrayBuffer());
      if (j && data.csrfToken) {
        if (legacy) j.legacyCsrf = data.csrfToken;
        else j.csrf = data.csrfToken;
      }
      if (j && data.instituteCsrf) j.legacyCsrf = data.instituteCsrf;
      return { status: res.status, data, headers: res.headers };
    }
    async function create(slug, path) {
      const r = await req('/api/platform/signup', null, 'POST', {
        path,
        slug,
        name: slug + ' organisation',
        adminName: 'Synthetic Admin',
        email: 'admin@example.invalid',
        password,
        theme: { preset: path === 'institute' ? 'chalk' : 'mint' },
      });
      assert.equal(r.status, 202, JSON.stringify(r.data));
      const mail = outbox.at(-1);
      assert(!mail.text.includes(password));
      const token = new URL(
        mail.text.match(/https?:\/\/\S+/)[0],
      ).searchParams.get('token');
      const verified = await req('/api/platform/verify', null, 'POST', {
        token,
      });
      assert.equal(verified.status, 200);
      assert.equal(
        (await req('/api/platform/verify', null, 'POST', { token })).status,
        400,
      );
      const tenant = (
        await db.platformQuery('SELECT * FROM tenants WHERE slug=$1', [slug])
      ).rows[0];
      for (let i = 0; i < 50; i++) {
        await require('../src/platform/provisioning').provision(tenant.id);
        const job = await req('/api/platform/provisioning/' + slug);
        if (job.data.status === 'complete') break;
        await new Promise((r) => setTimeout(r, 10));
      }
      assert.equal(
        (await req('/api/platform/provisioning/' + slug)).data.status,
        'complete',
      );
      const j = jar();
      const entry = await req('/t/' + slug + '/api/site/entry', j, 'POST', {
        token: verified.data.entryToken,
      });
      assert.equal(entry.status, 200);
      assert.equal(
        (
          await req('/t/' + slug + '/api/site/entry', j, 'POST', {
            token: verified.data.entryToken,
          })
        ).status,
        400,
      );
      return { ...tenant, status: 'ready', base: '/t/' + slug, jar: j };
    }
    await t.test(
      'verified signup provisions each path with one-use entry and idempotent samples',
      async () => {
        school = await create('greenfield-school', 'institute');
        work = await create('clear-workplace', 'workplace');
        other = await create('other-workplace', 'workplace');
        assert.equal(
          (await req(school.base + '/api/site/session', school.jar)).data.user
            .role,
          'admin',
        );
        assert.match(school.jar.lastCookie, /HttpOnly/);
        await withTenant(work, async () => {
          assert.equal(
            (await db.query('SELECT count(*)::int AS n FROM teams')).rows[0].n,
            1,
          );
          assert.equal(
            (await db.query('SELECT count(*)::int AS n FROM work_tasks'))
              .rows[0].n,
            1,
          );
        });
        assert.equal(
          (
            await req('/api/platform/signup', null, 'POST', {
              path: 'workplace',
              slug: 'admin',
              name: 'Reserved',
              adminName: 'Admin',
              email: 'a@example.invalid',
              password,
              theme: { preset: 'mint' },
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      'RLS and composite foreign keys isolate identical natural keys and reject forged context',
      async () => {
        const a = await withTenant(work, () =>
          db.query('SELECT * FROM org_users'),
        );
        const b = await withTenant(other, () =>
          db.query('SELECT * FROM org_users'),
        );
        assert.equal(a.rowCount, 1);
        assert.notEqual(a.rows[0].id, b.rows[0].id);
        assert.equal(
          (await req(other.base + '/api/site/settings', work.jar)).status,
          401,
        );
        assert.equal(
          (
            await req('/api/site/session', work.jar, 'GET', null, {
              'X-Tenant-ID': work.id,
            })
          ).status,
          404,
        );
        await assert.rejects(
          db.query('SELECT * FROM students'),
          /Tenant context/,
        );
        await assert.rejects(
          withTenant(work, () =>
            db.query('INSERT INTO teams(name,manager_id) VALUES($1,$2)', [
              'Foreign user',
              b.rows[0].id,
            ]),
          ),
          /foreign key/,
        );
        assert.equal(
          (
            await req(work.base + '/api/site/settings', work.jar, 'GET', null, {
              'X-Tenant-ID': other.id,
            })
          ).data.tenant.id,
          work.id,
        );
      },
    );
    await t.test(
      'shared login is generic, rate limited, cookie based and CSRF protected',
      async () => {
        const wrong = await req(work.base + '/api/site/login', jar(), 'POST', {
            email: 'admin@example.invalid',
            password: 'wrong',
          }),
          missing = await req(work.base + '/api/site/login', jar(), 'POST', {
            email: 'missing@example.invalid',
            password: 'wrong',
          });
        assert.equal(wrong.status, 401);
        assert.equal(wrong.data.error, missing.data.error);
        for (let i = 0; i < 4; i++)
          await req(work.base + '/api/site/login', jar(), 'POST', {
            email: 'admin@example.invalid',
            password: 'wrong',
          });
        assert.equal(
          (
            await req(work.base + '/api/site/login', jar(), 'POST', {
              email: 'admin@example.invalid',
              password,
            })
          ).status,
          429,
        );
        await withTenant(work, () =>
          db.query(
            "UPDATE account_login_limits SET locked_until=now()-interval '1 second',window_start=now()-interval '16 minutes'",
          ),
        );
        assert.equal(
          (
            await req(work.base + '/api/site/login', work.jar, 'POST', {
              email: 'admin@example.invalid',
              password,
              remember: true,
            })
          ).status,
          200,
        );
        assert.match(work.jar.lastCookie, /Max-Age=604800/);
        assert.equal(
          (
            await req(
              work.base + '/api/site/branding',
              work.jar,
              'PATCH',
              { name: 'Spoof', theme: { preset: 'mint' } },
              { 'X-CSRF-Token': '' },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              work.base + '/api/site/branding',
              work.jar,
              'PATCH',
              { name: 'Spoof', theme: { preset: 'mint' } },
              { Origin: 'https://other.example' },
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      'legacy teacher sign-in synchronises a tenant account without changing the exam cookie',
      async () => {
        const r = await req(
          school.base + '/api/auth/teacher/login',
          school.jar,
          'POST',
          { email: 'admin@example.invalid', password },
        );
        assert.equal(r.status, 200);
        teacher = r.data.teacher;
        assert(school.jar.cookies.has('__Host-dps-account'));
        assert(school.jar.cookies.has('__Host-plinth-org'));
        assert.equal(
          (await req(school.base + '/api/site/session', school.jar)).data.user
            .teacherId,
          teacher.id,
        );
        assert.equal(
          (await req(school.base + '/api/site/settings', school.jar)).status,
          200,
        );
      },
    );
    await t.test(
      'student accounts, forced change and bad CSV rows remain class scoped',
      async () => {
        const r = await req(
          school.base + '/api/accounts/teacher/students',
          school.jar,
          'POST',
          {
            admissionNumber: 'G001',
            name: 'Synthetic Student',
            rollNumber: '1',
            className: 'IX',
            section: 'A',
            schoolEmail: '',
          },
        );
        assert.equal(r.status, 201, JSON.stringify(r.data));
        student = { ...r.data, jar: jar() };
        const csv =
          'admission number,name,roll number,class,section,school email\nCSV001,Synthetic Two,2,IX,A,\nBAD,Synthetic Bad,3,X,A,invalid\n';
        const imported = await req(
          school.base + '/api/accounts/teacher/students/import',
          school.jar,
          'POST',
          { className: 'IX', csv, dryRun: false },
        );
        assert.equal(imported.status, 400);
        assert.equal(imported.data.created.length, 0);
        assert.equal(
          (
            await req(
              school.base + '/api/accounts/student/login',
              student.jar,
              'POST',
              { username: 'G001', password: student.temporaryPassword },
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              school.base + '/api/accounts/student/profile',
              student.jar,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              school.base + '/api/accounts/student/set-password',
              student.jar,
              'POST',
              { newPassword: password },
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              school.base + '/api/accounts/student/profile',
              student.jar,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              other.base + '/api/accounts/student/login',
              jar(),
              'POST',
              { username: 'G001', password },
            )
          ).status,
          401,
        );
        assert.equal(
          (await req(school.base + '/api/site/settings', student.jar)).status,
          401,
        );
        assert.equal(
          (await req(school.base + '/api/teacher/exams', student.jar)).status,
          401,
        );
      },
    );
    await t.test(
      'Institute join, answers, autosave, realtime flags and submissions retain original behaviour',
      async () => {
        let exam, question;
        await withTenant(school, async () => {
          exam = (
            await db.query(
              "INSERT INTO exams(title,class_name,section,teacher_id,exam_type,start_time,end_time,duration_minutes,status,passcode_hash) VALUES('Tenant exam','IX','A',$1,'quiz',now()-interval '1 minute',now()+interval '20 minutes',20,'active',$2) RETURNING *",
              [teacher.id, await bcrypt.hash('GREENEXAM123', 4)],
            )
          ).rows[0];
          question = (
            await db.query(
              "INSERT INTO questions(exam_id,type,title,marks,correct_answer) VALUES($1,'mcq','Choose correct',5,'\"Yes\"') RETURNING *",
              [exam.id],
            )
          ).rows[0];
        });
        const join = await req(
          school.base + '/api/exams/' + exam.id + '/join',
          student.jar,
          'POST',
          {
            passcode: 'GREEN-EXAM-123',
            name: 'Spoof',
            rollNumber: '99',
            className: 'X',
            section: 'B',
          },
        );
        assert.equal(join.status, 201, JSON.stringify(join.data));
        submission = join.data;
        const auth = { Authorization: 'Bearer ' + join.data.token };
        assert.equal(
          (
            await req(
              school.base + '/api/student/exams/' + exam.id + '/answers/save',
              null,
              'POST',
              { questionId: question.id, answerText: 'Yes' },
              auth,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              other.base + '/api/student/exams/' + exam.id + '/questions',
              null,
              'GET',
              null,
              auth,
            )
          ).status,
          401,
        );
        const host = connect(base, {
            forceNew: true,
            transports: ['websocket'],
            extraHeaders: {
              Cookie: [...school.jar.cookies]
                .map(([k, v]) => k + '=' + v)
                .join('; '),
              Origin: base,
            },
            auth: { site: school.slug },
          }),
          pupil = connect(base, {
            forceNew: true,
            transports: ['websocket'],
            auth: { site: school.slug, token: join.data.token },
            extraHeaders: { Origin: base },
          });
        sockets.push(host, pupil);
        await Promise.all([once(host, 'connect'), once(pupil, 'connect')]);
        const ready = once(host, 'teacher:monitorJoined');
        host.emit('teacher:joinMonitorRoom', { examId: exam.id });
        await ready;
        const joined = once(pupil, 'exam:joined');
        pupil.emit('student:joinExamRoom');
        await joined;
        const event = once(host, 'exam:proctorFlag');
        pupil.emit('student:proctorEvent', { eventType: 'TAB_SWITCH' });
        await event;
        assert.equal(
          (
            await req(
              school.base + '/api/student/exams/' + exam.id + '/submit',
              null,
              'POST',
              {},
              auth,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              school.base + '/api/teacher/exams/' + exam.id + '/submissions',
              school.jar,
            )
          ).status,
          200,
        );
        const guest = await req(
          school.base + '/api/exams/' + exam.id + '/join',
          null,
          'POST',
          {
            passcode: 'GREENEXAM123',
            name: 'Synthetic Guest',
            rollNumber: '10',
            className: 'IX',
            section: 'A',
          },
        );
        assert.equal(guest.status, 201);
        host.disconnect();
        pupil.disconnect();
      },
    );
    await t.test(
      'ERP records obey both tenant and student/class ownership',
      async () => {
        const r = await req(
          school.base + '/api/erp/attendance',
          school.jar,
          'POST',
          {
            studentId: student.student.id,
            date: '2026-10-03',
            data: { title: 'Morning register', body: '', status: 'present' },
          },
        );
        assert.equal(r.status, 201, JSON.stringify(r.data));
        assert.equal(
          (await req(school.base + '/api/erp/attendance', student.jar)).data
            .records.length,
          1,
        );
        assert.equal(
          (await req(work.base + '/api/erp/attendance', work.jar)).status,
          403,
        );
        assert.equal(
          (await req(school.base + '/api/erp/students', student.jar)).status,
          401,
        );
      },
    );
    await t.test(
      'invites create password-owned employees; expired/reused links cannot grant a role',
      async () => {
        team = (await req(work.base + '/api/workplace/teams', work.jar)).data
          .teams[0];
        const r = await req(work.base + '/api/site/invites', work.jar, 'POST', {
          email: 'employee@example.invalid',
          role: 'employee',
          teamId: team.id,
        });
        assert.equal(r.status, 202);
        const token = new URL(
          outbox.at(-1).text.match(/https?:\/\/\S+/)[0],
        ).searchParams.get('token');
        const body = { token, name: 'Synthetic Employee', password };
        assert.equal(
          (await req('/api/platform/accept-invite', null, 'POST', body)).status,
          200,
        );
        assert.equal(
          (await req('/api/platform/accept-invite', null, 'POST', body)).status,
          400,
        );
        employee = jar();
        const login = await req(
          work.base + '/api/site/login',
          employee,
          'POST',
          { email: 'employee@example.invalid', password },
        );
        assert.equal(login.status, 200);
        employee.user = login.data.user;
        assert.equal(
          (await req(work.base + '/api/site/users', employee)).status,
          403,
        );
        assert.equal(
          (await req(work.base + '/api/teacher/exams', employee)).status,
          401,
        );
        assert.equal(
          (await req(work.base + '/api/chat/people', employee)).status,
          200,
        );
      },
    );
    await t.test(
      'monitoring requires administrator notice, versioned employee consent and work hours',
      async () => {
        assert.equal(
          (
            await req(work.base + '/api/workplace/sessions', employee, 'POST', {
              teamId: team.id,
            })
          ).status,
          403,
        );
        const policy = {
          enabled: true,
          noticeAccepted: true,
          timezone: 'UTC',
          start: '00:00',
          end: '23:59',
          days: [0, 1, 2, 3, 4, 5, 6],
          allowlist: ['work-app'],
          retentionDays: 7,
        };
        assert.equal(
          (await req(work.base + '/api/site/policy', work.jar, 'PATCH', policy))
            .status,
          200,
        );
        const notice = await req(
          work.base + '/api/workplace/consent',
          employee,
        );
        assert.equal(notice.data.accepted, false);
        assert.equal(
          (
            await req(work.base + '/api/workplace/consent', employee, 'POST', {
              accept: true,
              policyVersion: 1,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await req(work.base + '/api/workplace/consent', employee, 'POST', {
              accept: true,
              policyVersion: notice.data.policyVersion,
            })
          ).status,
          200,
        );
        session = (
          await req(work.base + '/api/workplace/sessions', employee, 'POST', {
            teamId: team.id,
          })
        ).data.session;
        assert.equal(session.status, 'sharing');
        assert.equal(
          (await req(work.base + '/api/workplace/desktop-permit', employee))
            .data.allowed,
          true,
        );
        assert.equal(
          (await req(other.base + '/api/workplace/desktop-permit', other.jar))
            .data.allowed,
          false,
        );
        flag = (
          await req(
            work.base + '/api/workplace/sessions/' + session.id + '/sensor',
            employee,
            'POST',
            { app: 'game-app', title: 'Synthetic Window' },
          )
        ).data.flag;
        assert.equal(flag.severity, 'medium');
        assert.equal(
          (
            await req(
              work.base + '/api/workplace/sessions/' + session.id + '/sensor',
              employee,
              'POST',
              { app: 'game-app', title: 'Synthetic Window' },
            )
          ).data.flag,
          null,
        );
        assert.equal(
          (
            await req(
              other.base + '/api/workplace/sessions/' + session.id + '/sensor',
              other.jar,
              'POST',
              { app: 'game-app', title: 'Synthetic' },
            )
          ).status,
          404,
        );
      },
    );
    await t.test('work activity requires current consent and rejects replay and foreign sessions',async()=>{
      const activity={mode:'reading',source:'browser',inputEvents:0,edits:0,repeats:0,idleSeconds:600};
      const endpoint=work.base+'/api/productivity/sessions/'+session.id+'/activity';
      const first=await req(endpoint,employee,'POST',activity);assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.category,'reading');
      assert.equal((await req(endpoint,employee,'POST',activity)).data.accepted,false);
      assert.equal((await req(endpoint,work.jar,'POST',activity)).status,404);
      assert.equal((await req(other.base+'/api/productivity/sessions/'+session.id+'/activity',other.jar,'POST',activity)).status,404);
    });
    await t.test('work summaries and reports obey assignee, employee and tenant boundaries',async()=>{
      const created=await req(work.base+'/api/workplace/tasks',work.jar,'POST',{teamId:team.id,assigneeId:session.user_id,title:'Synthetic report outcome',description:'Scope a progress report'});
      assert.equal(created.status,201,JSON.stringify(created.data));const taskId=created.data.task.id;
      const summary={taskId,summary:'Completed the report scope checks using synthetic data.',aiConsent:false};
      assert.equal((await req(work.base+'/api/productivity/summaries',employee,'POST',summary)).status,201);
      assert.equal((await req(work.base+'/api/productivity/summaries',work.jar,'POST',summary)).status,404);
      assert.equal((await req(other.base+'/api/productivity/summaries',other.jar,'POST',summary)).status,404);
      const own=await req(work.base+'/api/productivity/report',employee);assert.equal(own.status,200,JSON.stringify(own.data));assert.equal(own.data.rows.length,1);assert.equal(own.data.rows[0].employee_id,session.user_id);assert.equal(own.data.rows[0].summaries,1);
      assert.equal((await req(work.base+'/api/productivity/report',null)).status,401);
      const foreign=await req(other.base+'/api/productivity/report',other.jar);assert(!foreign.data.rows?.some(r=>r.employee_id===session.user_id));
    });
    await t.test(
      'Workplace uses the shared relay with team ownership, optional webcam and pause checks',
      async () => {
        const host = connect(base + '/workplace', {
            forceNew: true,
            transports: ['websocket'],
            extraHeaders: {
              Cookie: [...work.jar.cookies]
                .map(([k, v]) => k + '=' + v)
                .join('; '),
              Origin: base,
            },
            auth: { site: work.slug },
          }),
          pupil = connect(base + '/workplace', {
            forceNew: true,
            transports: ['websocket'],
            extraHeaders: {
              Cookie: [...employee.cookies]
                .map(([k, v]) => k + '=' + v)
                .join('; '),
              Origin: base,
            },
            auth: { site: work.slug },
          });
        sockets.push(host, pupil);
        await Promise.all([once(host, 'connect'), once(pupil, 'connect')]);
        const monitored = once(host, 'work:monitorJoined');
        host.emit('work:joinMonitor', { teamId: team.id });
        await monitored;
        const joined = once(pupil, 'work:joined');
        pupil.emit('work:joinSession', { sessionId: session.id });
        await joined;
        const request = once(pupil, 'teacher:mediaRequest');
        host.emit('teacher:requestMediaPreview', {
          sessionId: session.id,
          mediaType: 'screen',
        });
        assert.equal((await request).mediaType, 'screen');
        const offered = once(host, 'webrtc:offer');
        pupil.emit('webrtc:offer', {
          sessionId: session.id,
          mediaType: 'screen',
          payload: { type: 'offer', sdp: 'synthetic' },
        });
        assert.equal((await offered).sessionId, session.id);
        const ack = once(host, 'teacher:mediaStatus');
        host.emit('teacher:requestMediaPreview', {
          sessionId: session.id,
          mediaType: 'webcam',
        });
        assert.equal((await ack).status, 'not-consented');
        assert.equal(
          (
            await req(
              work.base + '/api/workplace/sessions/' + session.id + '/state',
              employee,
              'PATCH',
              { status: 'paused' },
            )
          ).status,
          200,
        );
        assert.equal(
          (await req(work.base + '/api/workplace/desktop-permit', employee))
            .data.allowed,
          false,
        );
        assert.equal(
          (
            await req(work.base + '/api/workplace/sessions', employee, 'POST', {
              teamId: team.id,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await req(work.base + '/api/workplace/sessions', employee, 'POST', {
              teamId: team.id,
              resume: true,
            })
          ).status,
          200,
        );
        host.disconnect();
        pupil.disconnect();
      },
    );
    await t.test(
      'flag chunks are ordered, bounded, quota accounted and signed only for authorised viewers',
      async () => {
        await req(work.base + '/api/workplace/sessions', employee, 'POST', {
          teamId: team.id,
          resume: true,
        });
        const r = await req(
          work.base + '/api/workplace/incidents',
          employee,
          'POST',
          {
            sessionId: session.id,
            flagId: flag.id,
            clientId: crypto.randomUUID(),
            mimeType: 'video/webm',
          },
        );
        assert.equal(r.status, 201);
        record = r.data.recordingId;
        const part = () => {
          const f = new FormData();
          f.append(
            'chunk',
            new Blob([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3])]),
            'screen.webm',
          );
          return f;
        };
        assert.equal(
          (
            await req(
              work.base + '/api/workplace/incidents/' + record + '/chunks/1',
              employee,
              'POST',
              part(),
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await req(
              work.base + '/api/workplace/incidents/' + record + '/chunks/0',
              employee,
              'POST',
              part(),
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              work.base + '/api/workplace/incidents/' + record + '/chunks/0',
              employee,
              'POST',
              part(),
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              work.base + '/api/workplace/incidents/' + record + '/finish',
              employee,
              'POST',
              { reason: 'test-complete' },
            )
          ).status,
          200,
        );
        const link = await req(
          work.base + '/api/workplace/incidents/' + record + '/link',
          work.jar,
        );
        assert.equal(link.status, 200);
        assert.equal(
          (await req(work.base + link.data.url, work.jar)).data.length,
          7,
        );
        assert.equal(
          (await req(work.base + link.data.url, employee)).status,
          403,
        );
        assert.equal(
          (await req(other.base + link.data.url, other.jar)).status,
          404,
        );
        assert.equal(
          Number(
            (
              await db.platformQuery(
                'SELECT storage_used FROM tenants WHERE id=$1',
                [work.id],
              )
            ).rows[0].storage_used,
          ),
          7,
        );
      },
    );
    await t.test(
      'chat persists unread, search, mentions, member files and pins without cross-tenant leakage',
      async () => {
        const a = (await req(work.base + '/api/site/session', work.jar)).data
          .user;
        channel = (
          await req(work.base + '/api/chat/channels', work.jar, 'POST', {
            name: 'Project room',
            kind: 'channel',
            memberIds: [employee.user.id],
          })
        ).data.channel;
        assert(channel.id);
        assert.equal(
          (
            await req(
              work.base + '/api/chat/channels/' + channel.id + '/messages',
              other.jar,
            )
          ).status,
          401,
        );
        const sent = await req(
          work.base + '/api/chat/channels/' + channel.id + '/messages',
          work.jar,
          'POST',
          { body: 'A useful brief', mentions: [employee.user.id] },
        );
        assert.equal(sent.status, 201);
        const unread = (
          await req(work.base + '/api/chat/channels', employee)
        ).data.channels.find((c) => c.id === channel.id);
        assert.equal(unread.unread, 1);
        assert.equal(
          (
            await req(
              work.base +
                '/api/chat/channels/' +
                channel.id +
                '/messages?search=brief',
              employee,
            )
          ).data.messages.length,
          1,
        );
        assert.equal(
          (
            await req(
              work.base + '/api/chat/messages/' + sent.data.message.id + '/pin',
              employee,
              'PATCH',
              { pinned: true },
            )
          ).status,
          200,
        );
        const form = new FormData();
        form.append(
          'file',
          new Blob(['%PDF-1.4\nSynthetic document']),
          'brief.pdf',
        );
        const upload = await req(
          work.base + '/api/chat/channels/' + channel.id + '/files',
          employee,
          'POST',
          form,
        );
        assert.equal(upload.status, 201, JSON.stringify(upload.data));
        file = upload.data.message.files[0];
        const link = (
          await req(
            work.base + '/api/chat/files/' + file.id + '/link',
            employee,
          )
        ).data.url;
        assert.equal((await req(work.base + link, employee)).status, 200);
        assert.equal((await req(work.base + link, work.jar)).status, 403);
        assert.equal((await req(other.base + link, other.jar)).status, 404);
        await withTenant(work, () =>
          db.query(
            'DELETE FROM chat_members WHERE channel_id=$1 AND user_id=$2',
            [channel.id, employee.user.id],
          ),
        );
        assert.equal((await req(work.base + link, employee)).status, 404);
        await withTenant(work, () =>
          db.query(
            'INSERT INTO chat_members(channel_id,user_id) VALUES($1,$2)',
            [channel.id, employee.user.id],
          ),
        );
        assert.equal(
          (
            await req(
              work.base + '/api/chat/channels/' + channel.id + '/read',
              employee,
              'POST',
              {},
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(work.base + '/api/chat/channels', employee)
          ).data.channels.find((c) => c.id === channel.id).unread,
          0,
        );
      },
    );
    await t.test(
      'data export includes file bytes, deletion releases quota and consent withdrawal blocks capture',
      async () => {
        const exported = await req(work.base + '/api/site/export', work.jar);
        assert.equal(exported.status, 200);
        assert.equal(
          exported.data.tenant_files[0].file_bytes.encoding,
          'base64',
        );
        assert(!JSON.stringify(exported.data).includes('password_hash'));
        const before = Number(
          (
            await db.platformQuery(
              'SELECT storage_used FROM tenants WHERE id=$1',
              [work.id],
            )
          ).rows[0].storage_used,
        );
        await withTenant(work, () =>
          db.query('DELETE FROM tenant_files WHERE id=$1', [file.id]),
        );
        const after = Number(
          (
            await db.platformQuery(
              'SELECT storage_used FROM tenants WHERE id=$1',
              [work.id],
            )
          ).rows[0].storage_used,
        );
        assert.equal(before - after, file.sizeBytes);
        assert.equal(
          (await req(work.base + '/api/workplace/consent', employee, 'DELETE'))
            .status,
          200,
        );
        assert.equal(
          (await req(work.base + '/api/workplace/desktop-permit', employee))
            .data.allowed,
          false,
        );
        assert.equal(
          (await req(work.base + '/api/workplace/capture-permit', employee))
            .data.allowed,
          false,
        );
      },
    );
    await t.test(
      'owner controls are separate, suspension blocks the site, and deletion stays tenant scoped',
      async () => {
        await db.platformQuery(
          "INSERT INTO platform_owners(name,email,password_hash) VALUES('Synthetic Owner','owner@example.invalid',$1)",
          [await bcrypt.hash(password, 4)],
        );
        const owner = jar();
        assert.equal(
          (await req('/api/platform/owner/tenants', work.jar)).status,
          401,
        );
        assert.equal(
          (
            await req('/api/platform/owner/login', owner, 'POST', {
              email: 'owner@example.invalid',
              password,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              '/api/platform/owner/tenants/' + other.id,
              owner,
              'PATCH',
              { status: 'suspended' },
            )
          ).status,
          200,
        );
        assert.equal(
          (await req(other.base + '/api/site/session', other.jar)).status,
          403,
        );
        assert.equal(
          (
            await req(
              '/api/platform/owner/tenants/' + other.id,
              owner,
              'DELETE',
              { confirmName: other.name },
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await db.platformQuery('SELECT 1 FROM tenants WHERE id=$1', [
              other.id,
            ])
          ).rowCount,
          0,
        );
        assert.equal(
          (await req(work.base + '/api/site/session', work.jar)).status,
          200,
        );
        assert.equal(
          (
            await db.platformQuery('SELECT 1 FROM tenants WHERE id=$1', [
              DPS_ID,
            ])
          ).rowCount,
          1,
        );
      },
    );
  },
);
