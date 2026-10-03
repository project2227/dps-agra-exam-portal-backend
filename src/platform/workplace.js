'use strict';
const db = require('../config/db');
const { must } = require('../utils/http');
const { currentTenant } = require('./context');
const { EVENT_SEVERITY } = require('../services/proctor');
const SEVERITY = {
  ...EVENT_SEVERITY,
  NON_WORK_APP: 'medium',
  SHARING_PAUSED: 'low',
  SHARING_STARTED: 'low',
  SHARING_STOPPED: 'low',
};
function workHours(policy, at = new Date()) {
  if (!policy?.enabled || !policy.noticeAccepted) return false;
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: policy.timezone || 'Asia/Kolkata',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(at)
        .map((p) => [p.type, p.value]),
    );
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
      parts.weekday,
    );
    const time = parts.hour + ':' + parts.minute;
    const start = policy.start || '09:00',
      end = policy.end || '18:00';
    if (start < end)
      return (policy.days || []).includes(day) && time >= start && time < end;
    if (start > end)
      return (
        ((policy.days || []).includes(day) && time >= start) ||
        ((policy.days || []).includes((day + 6) % 7) && time < end)
      );
    return false;
  } catch {
    return false;
  }
}
function notice(tenant) {
  const p = tenant.monitoring_policy;
  return {
    version: p.version,
    organisation: tenant.name,
    screen: true,
    webcam: 'Optional, off by default. Turn it off at any time.',
    activeWindow: 'Focused app names and window titles while sharing.',
    recordings:
      'Only when flagged; a short pre-flag buffer remains in memory while sharing.',
    retentionDays: tenant.retention_days,
    workHours: p.start + '–' + p.end,
    timezone: p.timezone,
    pause: 'Pause sharing at any time. Each pause is visible to your manager.',
  };
}
const managerRoom = (teamId) =>
  'tenant:' + currentTenant().id + ':work:team:' + teamId + ':managers';
const employeeRoom = (sessionId) =>
  'tenant:' + currentTenant().id + ':work:session:' + sessionId;
let io = null;
function attach(instance) {
  io = instance;
}
function publish(teamId, event, data) {
  io?.to(managerRoom(teamId)).emit(event, data);
}
function privateEmployee(sessionId, event, data) {
  io?.to(employeeRoom(sessionId)).emit(event, data);
}
function disconnectTenant(id) {
  if (io)
    for (const socket of io.sockets.values())
      if (socket.data.tenant?.id === id) socket.disconnect(true);
  const exam = require('../services/events').getIo();
  if (exam)
    for (const socket of exam.sockets.sockets.values())
      if (socket.data.tenant?.id === id) socket.disconnect(true);
}
function disconnectUser(tenantId, userId) {
  if (io)
    for (const socket of io.sockets.values())
      if (
        socket.data.tenant?.id === tenantId &&
        socket.data.actor?.id === userId
      )
        socket.disconnect(true);
}
async function teamAccess(actor, teamId) {
  const q = await db.query(
    `SELECT t.* FROM teams t WHERE t.id=$1 AND ($2='admin' OR t.manager_id=$3 OR EXISTS(SELECT 1 FROM team_members m WHERE m.team_id=t.id AND m.user_id=$3))`,
    [teamId, actor.role, actor.id],
  );
  must(q.rowCount, 404, 'Team not found.');
  return q.rows[0];
}
async function managerAccess(actor, teamId) {
  must(
    ['admin', 'manager'].includes(actor.role),
    403,
    'Manager access required.',
  );
  const q = await db.query(
    "SELECT * FROM teams WHERE id=$1 AND ($2='admin' OR manager_id=$3)",
    [teamId, actor.role, actor.id],
  );
  must(q.rowCount, 404, 'Team not found.');
  return q.rows[0];
}
async function sharingAllowed(userId) {
  const tenant = currentTenant();
  must(tenant?.path === 'workplace', 403, 'Open your workplace site.');
  const fresh = (
    await db.query(
      'SELECT monitoring_policy,retention_days,name FROM tenants WHERE id=$1',
      [tenant.id],
    )
  ).rows[0];
  const policy = fresh.monitoring_policy;
  must(
    workHours(policy),
    403,
    'Sharing is paused outside your organisation’s work hours or until monitoring is enabled.',
  );
  const consent = (
    await db.query(
      'SELECT * FROM monitoring_consents WHERE user_id=$1 AND policy_version=$2 AND revoked_at IS NULL',
      [userId, policy.version],
    )
  ).rows[0];
  must(
    consent,
    403,
    'Read and accept your organisation’s current monitoring notice before sharing.',
  );
  return { consent, policy };
}
async function ownedSession(
  actor,
  id,
  { sharing = false, manager = false } = {},
) {
  const q = await db.query(
    'SELECT s.*,u.name FROM work_sessions s JOIN org_users u ON u.id=s.user_id WHERE s.id=$1',
    [id],
  );
  const s = q.rows[0];
  must(s, 404, 'Sharing session not found.');
  if (manager) await managerAccess(actor, s.team_id);
  else must(s.user_id === actor.id, 404, 'Sharing session not found.');
  if (sharing) {
    must(
      s.status === 'sharing' && !s.ended_at,
      403,
      'This sharing session is paused or ended.',
    );
    await sharingAllowed(s.user_id);
  }
  return s;
}
async function flag(session, type, metadata = {}, message = '') {
  must(SEVERITY[type], 400, 'Unknown activity event.');
  const clean = {};
  for (const k of ['app', 'title', 'reason', 'timestamp'])
    if (typeof metadata[k] === 'string')
      clean[k] = metadata[k].slice(0, k === 'title' ? 160 : 100);
  const q = await db.query(
    'INSERT INTO work_events(session_id,user_id,event_type,severity,message,metadata) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [
      session.id,
      session.user_id,
      type,
      SEVERITY[type],
      message.slice(0, 300),
      JSON.stringify(clean),
    ],
  );
  const event = q.rows[0];
  publish(session.team_id, 'work:flag', {
    sessionId: session.id,
    event,
    reviewRequired: true,
  });
  privateEmployee(session.id, 'work:flag', {
    sessionId: session.id,
    event,
    reviewRequired: true,
  });
  return event;
}
module.exports = {
  SEVERITY,
  workHours,
  notice,
  managerRoom,
  employeeRoom,
  attach,
  publish,
  privateEmployee,
  disconnectTenant,
  disconnectUser,
  teamAccess,
  managerAccess,
  sharingAllowed,
  ownedSession,
  flag,
};
