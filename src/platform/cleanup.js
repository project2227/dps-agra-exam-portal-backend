'use strict';
const db = require('../config/db');
const { withTenant, DPS_ID } = require('./context');
const OWNED_DELETE_ORDER = [
  'branding_assets',
  'tenant_files',
  'task_comments',
  'chat_messages',
  'chat_members',
  'chat_channels',
  'work_recording_chunks',
  'work_recordings',
  'work_events',
  'work_tasks',
  'work_sessions',
  'monitoring_consents',
  'team_members',
  'teams',
  'org_sessions',
  'erp_records',
  'incident_recording_chunks',
  'incident_recordings',
  'student_password_resets',
  'student_deletion_requests',
  'student_learning_progress',
  'account_sessions',
  'account_login_limits',
  'course_enrollments',
  'course_attempts',
  'practice_game_results',
  'teacher_community_messages',
  'answers',
  'code_runs',
  'anti_cheat_events',
  'audit_logs',
  'exam_sessions',
  'questions',
  'exams',
  'handouts',
  'exam_dates',
  'stored_files',
  'teacher_access_requests',
  'courses',
  'practice_users',
  'students',
  'class_groups',
  'org_users',
  'teachers',
];
async function deleteTenant(tenant) {
  await db.platformQuery("UPDATE tenants SET status='deleting' WHERE id=$1", [
    tenant.id,
  ]);
  await withTenant(tenant, () =>
    db.transaction(async (c) => {
      for (const table of OWNED_DELETE_ORDER)
        await c.query('DELETE FROM ' + table);
    }),
  );
  await db.platformQuery(
    'DELETE FROM platform_email_links WHERE tenant_id=$1',
    [tenant.id],
  );
  await db.platformQuery('DELETE FROM provisioning_jobs WHERE tenant_id=$1', [
    tenant.id,
  ]);
  await db.platformQuery('DELETE FROM tenants WHERE id=$1', [tenant.id]);
}
async function cleanup() {
  const tenants = (await db.platformQuery('SELECT * FROM tenants')).rows;
  for (const tenant of tenants) {
    if (
      tenant.id !== DPS_ID &&
      ((['unverified', 'failed'].includes(tenant.status) &&
        Date.parse(tenant.created_at) < Date.now() - 14 * 86400000) ||
        (tenant.status === 'ready' &&
          Date.parse(tenant.last_active_at) < Date.now() - 14 * 86400000))
    ) {
      await deleteTenant(tenant);
      continue;
    }
    if (tenant.status !== 'ready') continue;
    await withTenant(tenant, () =>
      db.transaction(async (c) => {
        const deleted = await c.query(
          'DELETE FROM work_recordings WHERE expires_at<now() RETURNING size_bytes',
        );
        const incidents = await c.query(
          'DELETE FROM incident_recordings WHERE expires_at<now() RETURNING size_bytes',
        );
        const bytes = [...deleted.rows, ...incidents.rows].reduce(
          (n, r) => n + Number(r.size_bytes),
          0,
        );

        await c.query(
          "UPDATE work_sessions SET status='offline',active_socket_id=NULL WHERE ended_at IS NULL AND last_seen_at<now()-interval '90 seconds' AND status='sharing'",
        );
        await c.query(
          "DELETE FROM org_sessions WHERE expires_at<now()-interval '14 days'",
        );
      }),
    );
  }
  await db.platformQuery(
    "DELETE FROM platform_email_links WHERE expires_at<now()-interval '14 days'",
  );
}
module.exports = { OWNED_DELETE_ORDER, cleanup, deleteTenant };
