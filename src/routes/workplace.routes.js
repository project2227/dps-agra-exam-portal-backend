'use strict';
const express = require('express'),
  multer = require('multer'),
  rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../config/db');
const { asyncWrap, must } = require('../utils/http');
const auth = require('../platform/auth'),
  work = require('../platform/workplace'),
  storage = require('../platform/storage');
const { currentTenant } = require('../platform/context');
const router = express.Router();
const id = z.string().uuid();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1048576, files: 1, fields: 1 },
});
const eventLimit = rateLimit({
  windowMs: 60000,
  limit: 90,
  keyGenerator: (req) => req.actor.id,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
router.use(auth.requireUser());
router.use((req, res, next) => {
  if (currentTenant().path !== 'workplace')
    return res.status(403).json({ error: 'Open your workplace site.' });
  next();
});
router.get(
  '/teams',
  asyncWrap(async (req, res) => {
    const q = await db.query(
      `SELECT t.*,count(m.user_id)::int AS members FROM teams t LEFT JOIN team_members m ON m.team_id=t.id WHERE $1='admin' OR t.manager_id=$2 OR EXISTS(SELECT 1 FROM team_members own WHERE own.team_id=t.id AND own.user_id=$2) GROUP BY t.id ORDER BY t.name`,
      [req.actor.role, req.actor.id],
    );
    res.json({ teams: q.rows });
  }),
);
router.get(
  '/team-members',
  asyncWrap(async (req, res) => {
    const q = await db.query(
      `SELECT m.team_id,m.user_id,u.name FROM team_members m JOIN teams t ON t.id=m.team_id JOIN org_users u ON u.id=m.user_id WHERE $1='admin' OR t.manager_id=$2 OR EXISTS(SELECT 1 FROM team_members own WHERE own.team_id=t.id AND own.user_id=$2)`,
      [req.actor.role, req.actor.id],
    );
    res.json({ members: q.rows });
  }),
);
router.post(
  '/teams',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const v = z
      .object({ name: z.string().trim().min(2).max(90), managerId: id })
      .strict()
      .parse(req.body);
    must(
      (
        await db.query(
          "SELECT 1 FROM org_users WHERE id=$1 AND role IN('admin','manager') AND active=true",
          [v.managerId],
        )
      ).rowCount,
      400,
      'Select an active manager in your organisation.',
    );
    const t = (
      await db.query(
        'INSERT INTO teams(name,manager_id) VALUES($1,$2) RETURNING *',
        [v.name, v.managerId],
      )
    ).rows[0];
    await db.query('INSERT INTO team_members(team_id,user_id) VALUES($1,$2)', [
      t.id,
      v.managerId,
    ]);
    res.status(201).json({ team: t });
  }),
);
router.post(
  '/teams/:id/members',
  auth.requireAdmin,
  asyncWrap(async (req, res) => {
    const userId = id.parse(req.body.userId),
      teamId = id.parse(req.params.id);
    must(
      (await db.query('SELECT 1 FROM teams WHERE id=$1', [teamId])).rowCount &&
        (
          await db.query(
            'SELECT 1 FROM org_users WHERE id=$1 AND active=true',
            [userId],
          )
        ).rowCount,
      404,
      'Team or user not found.',
    );
    await db.query(
      'INSERT INTO team_members(team_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [teamId, userId],
    );
    res.json({ added: true });
  }),
);
router.get(
  '/dashboard',
  asyncWrap(async (req, res) => {
    const manager = ['admin', 'manager'].includes(req.actor.role);
    const sessions = await db.query(
      `SELECT s.*,u.name FROM work_sessions s JOIN org_users u ON u.id=s.user_id JOIN teams t ON t.id=s.team_id WHERE s.started_at>now()-interval '1 day' AND ($1='admin' OR $1='manager' AND t.manager_id=$2 OR s.user_id=$2) ORDER BY s.status,s.started_at DESC LIMIT 150`,
      [req.actor.role, req.actor.id],
    );
    const flags = await db.query(
      `SELECT f.*,u.name,s.team_id FROM work_events f JOIN work_sessions s ON s.id=f.session_id JOIN teams t ON t.id=s.team_id JOIN org_users u ON u.id=f.user_id WHERE f.created_at>now()-interval '1 day' AND ($1='admin' OR $1='manager' AND t.manager_id=$2 OR f.user_id=$2) ORDER BY CASE f.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,f.created_at DESC LIMIT 100`,
      [req.actor.role, req.actor.id],
    );
    res.json({
      sessions: sessions.rows,
      flags: flags.rows,
      manager,
      policy: currentTenant().monitoring_policy,
    });
  }),
);
router.get(
  '/consent',
  asyncWrap(async (req, res) => {
    const t = currentTenant(),
      q = await db.query(
        'SELECT accepted_at,revoked_at,notice FROM monitoring_consents WHERE user_id=$1 AND policy_version=$2',
        [req.actor.id, t.monitoring_policy.version],
      );
    res.json({
      notice: work.notice(t),
      accepted: !!q.rows[0] && !q.rows[0].revoked_at && q.rows[0].notice?.activityVersion === 1,
      canShare: work.workHours(t.monitoring_policy),
      policyVersion: t.monitoring_policy.version,
    });
  }),
);
router.post(
  '/consent',
  asyncWrap(async (req, res) => {
    const v = z
        .object({ accept: z.literal(true), policyVersion: z.number().int() })
        .strict()
        .parse(req.body),
      t = currentTenant();
    must(
      v.policyVersion === t.monitoring_policy.version,
      409,
      'The monitoring notice changed. Read the new notice before continuing.',
    );
    must(
      t.monitoring_policy.enabled && t.monitoring_policy.noticeAccepted,
      403,
      'Your administrator has not enabled monitoring.',
    );
    await db.query(
      'INSERT INTO monitoring_consents(user_id,policy_version,notice) VALUES($1,$2,$3) ON CONFLICT(tenant_id,user_id,policy_version) DO UPDATE SET revoked_at=NULL,accepted_at=now(),notice=excluded.notice',
      [req.actor.id, v.policyVersion, JSON.stringify(work.notice(t))],
    );
    res.json({ accepted: true });
  }),
);
router.delete(
  '/consent',
  asyncWrap(async (req, res) => {
    await db.query(
      'UPDATE monitoring_consents SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
      [req.actor.id],
    );
    await db.query(
      "UPDATE work_sessions SET status='ended',ended_at=now(),webcam_on=false WHERE user_id=$1 AND ended_at IS NULL",
      [req.actor.id],
    );
    res.json({ revoked: true });
  }),
);
router.post(
  '/sessions',
  asyncWrap(async (req, res) => {
    const teamId = id.parse(req.body.teamId);
    await work.teamAccess(req.actor, teamId);
    const { consent } = await work.sharingAllowed(req.actor.id);
    const old = (
      await db.query(
        'SELECT * FROM work_sessions WHERE user_id=$1 AND ended_at IS NULL',
        [req.actor.id],
      )
    ).rows[0];
    if (old) {
      must(
        old.team_id === teamId,
        409,
        'Stop your current sharing session before changing team.',
      );
      must(
        old.status !== 'paused' || req.body.resume === true,
        409,
        'Sharing is paused. Choose Resume sharing to continue.',
      );
      await db.query(
        "UPDATE work_sessions SET status='sharing',last_seen_at=now(),consent_id=$2 WHERE id=$1",
        [old.id, consent.id],
      );
      return res.json({ session: { ...old, status: 'sharing' } });
    }
    const s = (
      await db.query(
        'INSERT INTO work_sessions(user_id,team_id,consent_id) VALUES($1,$2,$3) RETURNING *',
        [req.actor.id, teamId, consent.id],
      )
    ).rows[0];
    await work.flag(s, 'SHARING_STARTED', {}, 'Employee started sharing.');
    res.status(201).json({ session: s });
  }),
);
router.get(
  '/sessions/current',
  asyncWrap(async (req, res) => {
    const s = (
      await db.query(
        'SELECT * FROM work_sessions WHERE user_id=$1 AND ended_at IS NULL',
        [req.actor.id],
      )
    ).rows[0];
    res.json({
      session: s || null,
      canShare: work.workHours(currentTenant().monitoring_policy),
    });
  }),
);
router.get(
  '/desktop-permit',
  asyncWrap(async (req, res) => {
    try {
      const { consent, policy } = await work.sharingAllowed(req.actor.id);
      const s = (
        await db.query(
          'SELECT * FROM work_sessions WHERE user_id=$1 AND ended_at IS NULL',
          [req.actor.id],
        )
      ).rows[0];
      const allowed =
        !!s &&
        ['sharing', 'offline'].includes(s.status) &&
        s.consent_id === consent.id;
      res.json({
        allowed,
        sessionId: allowed ? s.id : null,
        policyVersion: policy.version,
        tenantId: currentTenant().id,
        name: currentTenant().name,
        logo: currentTenant().logo_key
          ? '/api/platform/logo/' + currentTenant().slug + '/192'
          : null,
      });
    } catch {
      res.json({
        allowed: false,
        reason:
          'Consent, work hours and an active unpaused session are required.',
      });
    }
  }),
);
router.get(
  '/capture-permit',
  asyncWrap(async (req, res) => {
    try {
      const { policy } = await work.sharingAllowed(req.actor.id);
      res.json({
        allowed: true,
        policyVersion: policy.version,
        tenantId: currentTenant().id,
        name: currentTenant().name,
      });
    } catch {
      res.json({ allowed: false });
    }
  }),
);
router.patch(
  '/sessions/:id/state',
  asyncWrap(async (req, res) => {
    const v = z
      .object({
        status: z.enum(['sharing', 'paused', 'ended']),
        webcamOn: z.boolean().optional(),
        reason: z.string().max(100).optional(),
      })
      .strict()
      .parse(req.body);
    const s = await work.ownedSession(req.actor, id.parse(req.params.id));
    must(!s.ended_at, 409, 'Sharing session has ended.');
    if (v.status === 'sharing') await work.sharingAllowed(req.actor.id);
    const q = await db.query(
      `UPDATE work_sessions SET status=$2::varchar,webcam_on=$3,ended_at=CASE WHEN $2::varchar='ended' THEN now() ELSE NULL END,
 active_seconds=active_seconds+CASE WHEN status='sharing' THEN least(60,greatest(0,extract(epoch FROM now()-last_seen_at)::int)) ELSE 0 END,
 break_seconds=break_seconds+CASE WHEN status='paused' THEN least(86400,greatest(0,extract(epoch FROM now()-last_seen_at)::int)) ELSE 0 END,last_seen_at=now() WHERE id=$1 RETURNING *`,
      [s.id, v.status, v.status === 'sharing' && v.webcamOn === true],
    );
    work.publish(s.team_id, 'work:status', { session: q.rows[0] });
    if (v.status !== 'sharing')
      await work.flag(
        s,
        v.status === 'paused' ? 'SHARING_PAUSED' : 'SHARING_STOPPED',
        { reason: v.reason || 'Employee chose to stop or pause.' },
      );
    res.json({ session: q.rows[0] });
  }),
);
router.post(
  '/sessions/:id/sensor',
  eventLimit,
  asyncWrap(async (req, res) => {
    const v = z
      .object({
        app: z.string().trim().min(1).max(100),
        title: z.string().max(160),
      })
      .strict()
      .parse(req.body);
    const s = await work.ownedSession(req.actor, id.parse(req.params.id), {
      sharing: true,
    });
    const allowed = currentTenant().monitoring_policy.allowlist || [];
    if (
      !allowed.length ||
      allowed.some((app) => app.toLowerCase() === v.app.toLowerCase())
    )
      return res.json({ flag: null });
    const duplicate = (
      await db.query(
        "SELECT 1 FROM work_events WHERE session_id=$1 AND event_type='NON_WORK_APP' AND metadata->>'app'=$2 AND created_at>now()-interval '1 minute'",
        [s.id, v.app],
      )
    ).rowCount;
    if (duplicate) return res.json({ flag: null });
    const flag = await work.flag(
      s,
      'NON_WORK_APP',
      v,
      'An app outside the allowlist was reported. Review required.',
    );
    res.status(201).json({ flag });
  }),
);
router.post(
  '/sessions/:id/events',
  eventLimit,
  asyncWrap(async (req, res) => {
    const v = z
        .object({ eventType: z.enum(['TAB_SWITCH', 'WINDOW_BLUR']) })
        .strict()
        .parse(req.body),
      s = await work.ownedSession(req.actor, id.parse(req.params.id), {
        sharing: true,
      });
    const duplicate = (
      await db.query(
        "SELECT 1 FROM work_events WHERE session_id=$1 AND event_type=$2 AND created_at>now()-interval '10 seconds'",
        [s.id, v.eventType],
      )
    ).rowCount;
    if (duplicate) return res.json({ flag: null });
    const flag = await work.flag(
      s,
      v.eventType,
      {},
      'Browser activity changed. Review the context.',
    );
    res.status(201).json({ flag });
  }),
);
router.get(
  '/flags',
  asyncWrap(async (req, res) => {
    const q = await db.query(
      'SELECT * FROM work_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 300',
      [req.actor.id],
    );
    res.json({ flags: q.rows });
  }),
);
router.get(
  '/attendance',
  asyncWrap(async (req, res) => {
    const q = await db.query(
      `SELECT s.id,s.user_id,u.name,s.started_at,s.ended_at,s.active_seconds,s.break_seconds,s.status FROM work_sessions s JOIN org_users u ON u.id=s.user_id JOIN teams t ON t.id=s.team_id WHERE $1='admin' OR $1='manager' AND t.manager_id=$2 OR s.user_id=$2 ORDER BY s.started_at DESC LIMIT 500`,
      [req.actor.role, req.actor.id],
    );
    res.json({ records: q.rows });
  }),
);
router.get(
  '/tasks',
  asyncWrap(async (req, res) => {
    const q = await db.query(
      `SELECT k.*,u.name AS assignee_name FROM work_tasks k JOIN teams t ON t.id=k.team_id LEFT JOIN org_users u ON u.id=k.assignee_id WHERE $1='admin' OR t.manager_id=$2 OR EXISTS(SELECT 1 FROM team_members m WHERE m.team_id=t.id AND m.user_id=$2) ORDER BY k.status,k.due_at NULLS LAST,k.created_at DESC LIMIT 500`,
      [req.actor.role, req.actor.id],
    );
    res.json({ tasks: q.rows });
  }),
);
router.post(
  '/tasks',
  auth.requireManager,
  asyncWrap(async (req, res) => {
    const v = z
      .object({
        teamId: id,
        assigneeId: id.nullable(),
        title: z.string().trim().min(2).max(180),
        description: z.string().max(4000).default(''),
        dueAt: z.string().datetime().nullable().optional(),
      })
      .strict()
      .parse(req.body);
    await work.managerAccess(req.actor, v.teamId);
    if (v.assigneeId)
      must(
        (
          await db.query(
            'SELECT 1 FROM team_members WHERE team_id=$1 AND user_id=$2',
            [v.teamId, v.assigneeId],
          )
        ).rowCount,
        400,
        'Select a member of this team.',
      );
    const q = await db.query(
      'INSERT INTO work_tasks(team_id,assignee_id,created_by,title,description,due_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [
        v.teamId,
        v.assigneeId,
        req.actor.id,
        v.title,
        v.description,
        v.dueAt || null,
      ],
    );
    res.status(201).json({ task: q.rows[0] });
  }),
);
async function taskAccess(req) {
  const task = (
    await db.query('SELECT * FROM work_tasks WHERE id=$1', [
      id.parse(req.params.id),
    ])
  ).rows[0];
  must(task, 404, 'Task not found.');
  await work.teamAccess(req.actor, task.team_id);
  return task;
}
router.patch(
  '/tasks/:id',
  asyncWrap(async (req, res) => {
    const task = await taskAccess(req);
    must(
      req.actor.role === 'admin' ||
        req.actor.role === 'manager' ||
        task.assignee_id === req.actor.id,
      403,
      'Only the assignee or manager can update this task.',
    );
    const status = z
      .enum(['todo', 'in_progress', 'done'])
      .parse(req.body.status);
    const q = await db.query(
      'UPDATE work_tasks SET status=$2 WHERE id=$1 RETURNING *',
      [task.id, status],
    );
    res.json({ task: q.rows[0] });
  }),
);
router.get(
  '/tasks/:id/comments',
  asyncWrap(async (req, res) => {
    const t = await taskAccess(req);
    res.json({
      comments: (
        await db.query(
          'SELECT c.*,u.name FROM task_comments c JOIN org_users u ON u.id=c.user_id WHERE task_id=$1 ORDER BY created_at',
          [t.id],
        )
      ).rows,
    });
  }),
);
router.post(
  '/tasks/:id/comments',
  asyncWrap(async (req, res) => {
    const t = await taskAccess(req);
    const body = z.string().trim().min(1).max(2000).parse(req.body.body);
    const q = await db.query(
      'INSERT INTO task_comments(task_id,user_id,body) VALUES($1,$2,$3) RETURNING *',
      [t.id, req.actor.id, body],
    );
    res.status(201).json({ comment: q.rows[0] });
  }),
);
router.post(
  '/incidents',
  eventLimit,
  asyncWrap(async (req, res) => {
    const v = z
      .object({
        sessionId: id,
        flagId: id,
        clientId: id,
        mimeType: z
          .string()
          .max(80)
          .refine((x) => /^video\/webm(?:;codecs=[\w, -]+)?$/.test(x)),
      })
      .strict()
      .parse(req.body);
    const s = await work.ownedSession(req.actor, v.sessionId, {
      sharing: true,
    });
    must(
      (
        await db.query(
          'SELECT 1 FROM work_events WHERE id=$1 AND session_id=$2 AND user_id=$3',
          [v.flagId, s.id, req.actor.id],
        )
      ).rowCount,
      404,
      'Activity flag not found.',
    );
    const q = await db.query(
      'INSERT INTO work_recordings(session_id,flag_id,client_id,mime_type,expires_at) VALUES($1,$2,$3,$4,now()+make_interval(days=>$5)) ON CONFLICT(session_id,client_id) DO UPDATE SET client_id=excluded.client_id RETURNING *',
      [s.id, v.flagId, v.clientId, v.mimeType, currentTenant().retention_days],
    );
    res
      .status(201)
      .json({ recordingId: q.rows[0].id, maxBytes: storage.MAX_CLIP });
  }),
);
router.post(
  '/incidents/:id/chunks/:sequence',
  eventLimit,
  upload.single('chunk'),
  asyncWrap(async (req, res) => {
    must(req.file?.buffer?.length, 400, 'A nonempty video chunk is required.');
    const recording = (
      await db.query('SELECT session_id FROM work_recordings WHERE id=$1', [
        id.parse(req.params.id),
      ])
    ).rows[0];
    must(recording, 404, 'Recording unavailable.');
    await work.ownedSession(req.actor, recording.session_id);
    const consent = (
      await db.query(
        'SELECT 1 FROM monitoring_consents c JOIN work_sessions s ON s.consent_id=c.id WHERE s.id=$1 AND c.revoked_at IS NULL',
        [recording.session_id],
      )
    ).rowCount;
    must(consent, 403, 'Recording consent was revoked.');
    const row = await require('../services/clipStore').saveWorkChunk({
      recordingId: req.params.id,
      sessionId: recording.session_id,
      sequence: z.coerce
        .number()
        .int()
        .min(0)
        .max(15000)
        .parse(req.params.sequence),
      bytes: req.file.buffer,
    });
    res.json({ saved: true, sizeBytes: row.size_bytes });
  }),
);
router.post(
  '/incidents/:id/finish',
  asyncWrap(async (req, res) => {
    const reason = z.string().max(60).parse(req.body.reason);
    const q = await db.query(
      `UPDATE work_recordings SET ended_at=coalesce(ended_at,now()),finish_reason=coalesce(finish_reason,$2) WHERE id=$1 AND session_id IN(SELECT id FROM work_sessions WHERE user_id=$3) RETURNING *`,
      [id.parse(req.params.id), reason, req.actor.id],
    );
    must(q.rowCount, 404, 'Recording unavailable.');
    const s = await work.ownedSession(req.actor, q.rows[0].session_id);
    work.publish(s.team_id, 'work:recording', {
      flagId: q.rows[0].flag_id,
      recordingId: q.rows[0].id,
      sizeBytes: q.rows[0].size_bytes,
    });
    res.json({ finished: true });
  }),
);
async function recordingAccess(req) {
  const r = (
    await db.query(
      'SELECT * FROM work_recordings WHERE id=$1 AND expires_at>now()',
      [id.parse(req.params.id)],
    )
  ).rows[0];
  must(r, 404, 'Recording unavailable.');
  await work.ownedSession(req.actor, r.session_id, {
    manager: req.actor.role !== 'employee',
  });
  return r;
}
router.get(
  '/flags/:id/recordings',
  asyncWrap(async (req, res) => {
    const flag = (
      await db.query('SELECT * FROM work_events WHERE id=$1', [
        id.parse(req.params.id),
      ])
    ).rows[0];
    must(flag, 404, 'Activity flag not found.');
    await work.ownedSession(req.actor, flag.session_id, {
      manager: req.actor.role !== 'employee',
    });
    const q = await db.query(
      'SELECT id,size_bytes,started_at,ended_at,expires_at FROM work_recordings WHERE flag_id=$1 AND expires_at>now() ORDER BY started_at',
      [flag.id],
    );
    res.json({ recordings: q.rows });
  }),
);
router.get(
  '/incidents/:id/link',
  asyncWrap(async (req, res) => {
    const r = await recordingAccess(req);
    must(r.ended_at, 409, 'Recording is still saving.');
    res.json({
      url:
        '/api/workplace/incidents/' +
        r.id +
        '/video?signature=' +
        storage.downloadToken(req.actor, 'recording', r.id),
      expiresIn: 60,
    });
  }),
);
router.get(
  '/incidents/:id/video',
  asyncWrap(async (req, res) => {
    const r = await recordingAccess(req);
    must(
      storage.verifySignature(
        req.query.signature,
        req.actor,
        'recording',
        r.id,
      ),
      403,
      'This recording link expired. Open it again.',
    );
    const chunks = await db.query(
      'SELECT file_bytes FROM work_recording_chunks WHERE recording_id=$1 ORDER BY sequence',
      [r.id],
    );
    must(chunks.rowCount && r.ended_at, 404, 'Recording is not ready.');
    res
      .type('video/webm')
      .set('Cache-Control', 'private, no-store')
      .send(Buffer.concat(chunks.rows.map((x) => x.file_bytes)));
  }),
);
router.get('/desktop-download', (req, res) => {
  const url = process.env.WORKPLACE_INSTALLER_URL;
  const signed = process.env.WORKPLACE_INSTALLER_SIGNED === 'true';
  res.json({
    available: !!url && signed,
    url: url && signed ? url : null,
    version: process.env.WORKPLACE_INSTALLER_VERSION || null,
    message:
      url && signed
        ? 'Download the signed Windows app.'
        : 'The Windows app will be available after its signed release passes device testing.',
  });
});
module.exports = router;
