'use strict';
const db = require('../config/db'),
  auth = require('../platform/auth'),
  work = require('../platform/workplace');
const { socketTenant } = require('../platform/tenancy');
const { withTenant } = require('../platform/context');
const { must } = require('../utils/http');
function attachWorkplace(server) {
  const io = server.of('/workplace');
  work.attach(io);
  const chat = require('../routes/chat.routes');
  chat.attachChat(io);
  io.use(socketTenant);
  io.use((socket, next) =>
    withTenant(socket.data.tenant, async () => {
      try {
        const user = await auth.resolve(socket.handshake.headers);
        must(
          user && socket.data.tenant.path === 'workplace',
          401,
          'Sign in to your workplace.',
        );
        socket.data.actor = user;
        next();
      } catch {
        next(new Error('Authentication expired or invalid.'));
      }
    }),
  );
  io.on('connection', (socket) =>
    withTenant(socket.data.tenant, () => {
      const actor = socket.data.actor,
        relayWindow = [],
        throttle = new Map();
      let sessionId = null;
      const limit = (name, ms = 500) => {
        const now = Date.now();
        if (now - (throttle.get(name) || 0) < ms) return true;
        throttle.set(name, now);
        return false;
      };
      const guard = (fn) =>
        withTenant(socket.data.tenant, async () => {
          try {
            const live = await auth.resolve(socket.handshake.headers);
            must(
              live?.session_id === actor.session_id &&
                socket.data.tenant.status === 'ready',
              401,
              'Sign in again.',
            );
            await fn();
          } catch (error) {
            socket.emit('work:error', {
              message: error.status ? error.message : 'Operation rejected.',
            });
          }
        });
      const timer = setInterval(
        () =>
          guard(async () => {
            const tenant = (
              await db.query(
                'SELECT monitoring_policy,status FROM tenants WHERE id=$1',
                [socket.data.tenant.id],
              )
            ).rows[0];
            if (tenant?.status !== 'ready') {
              socket.disconnect(true);
              return;
            }
            if (sessionId && !work.workHours(tenant.monitoring_policy))
              socket.emit('work:policyChanged', {
                reason: 'Outside work hours or policy changed.',
              });
          }),
        15000,
      );
      timer.unref();
      socket.on('work:joinSession', (data) =>
        guard(async () => {
          const s = await work.ownedSession(
            actor,
            String(data?.sessionId || ''),
            { sharing: true },
          );
          sessionId = s.id;
          socket.join(work.employeeRoom(s.id));
          await db.query(
            'UPDATE work_sessions SET active_socket_id=$2,last_seen_at=now() WHERE id=$1',
            [s.id, socket.id],
          );
          work.publish(s.team_id, 'work:status', {
            session: { ...s, active_socket_id: socket.id },
          });
          socket.emit('work:joined', { sessionId: s.id });
        }),
      );
      socket.on('work:heartbeat', () =>
        guard(async () => {
          if (!sessionId || limit('heartbeat', 15000)) return;
          const s = await work.ownedSession(actor, sessionId, {
            sharing: true,
          });
          await db.query(
            "UPDATE work_sessions SET active_seconds=active_seconds+least(30,greatest(0,extract(epoch FROM now()-last_seen_at)::int)),last_seen_at=now() WHERE id=$1 AND status='sharing'",
            [s.id],
          );
        }),
      );
      socket.on('work:joinMonitor', (data) =>
        guard(async () => {
          const team = await work.managerAccess(
            actor,
            String(data?.teamId || ''),
          );
          socket.join(work.managerRoom(team.id));
          socket.emit('work:monitorJoined', { teamId: team.id });
        }),
      );
      const owned = async (id) => {
        const s = await work.ownedSession(actor, id, {
          sharing: true,
          manager: true,
        });
        must(
          socket.rooms.has(work.managerRoom(s.team_id)),
          403,
          'Open this team monitor first.',
        );
        return {
          ...s,
          consent_screen: true,
          consent_webcam: s.webcam_on,
          exam_id: s.team_id,
        };
      };
      const student = async () => {
        const s = await work.ownedSession(actor, sessionId, { sharing: true });
        return {
          ...s,
          consent_screen: true,
          consent_webcam: s.webcam_on,
          exam_id: s.team_id,
        };
      };
      socket.on('teacher:requestMediaPreview', (data) =>
        guard(async () => {
          const mediaType = String(data?.mediaType || '');
          if (
            !['screen', 'webcam'].includes(mediaType) ||
            limit('preview:' + mediaType, 700)
          )
            return;
          const s = await owned(String(data?.sessionId || ''));
          if (mediaType === 'webcam' && !s.webcam_on)
            return socket.emit('teacher:mediaStatus', {
              sessionId: s.id,
              mediaType,
              status: 'not-consented',
            });
          if (!s.active_socket_id)
            return socket.emit('teacher:mediaStatus', {
              sessionId: s.id,
              mediaType,
              status: 'student-offline',
            });
          work.privateEmployee(s.id, 'teacher:mediaRequest', {
            sessionId: s.id,
            mediaType,
          });
          socket.emit('teacher:mediaStatus', {
            sessionId: s.id,
            mediaType,
            status: 'requested',
          });
        }),
      );
      socket.on('student:mediaUnavailable', (data) =>
        guard(async () => {
          const s = await student();
          work.publish(s.team_id, 'teacher:mediaStatus', {
            sessionId: s.id,
            mediaType: data?.mediaType,
            status: 'not-sharing',
          });
        }),
      );
      for (const event of [
        'webrtc:offer',
        'webrtc:answer',
        'webrtc:iceCandidate',
        'webrtc:endStream',
      ])
        socket.on(event, (data) =>
          guard(() =>
            require('../services/monitorRelay').relay({
              event,
              data,
              ident: { kind: sessionId ? 'student' : 'teacher' },
              io,
              teacherRoom: work.managerRoom,
              privateStudent: work.privateEmployee,
              checkStudent: student,
              checkOwnedStudent: owned,
              relayWindow,
            }),
          ),
        );
      socket.on('chat:join', (data) =>
        guard(async () => {
          const channelId = String(data?.channelId || '');
          await chat.member(actor, channelId);
          socket.join(chat.room(channelId));
          socket.emit('chat:joined', { channelId });
        }),
      );
      socket.on('chat:typing', (data) =>
        guard(async () => {
          if (limit('typing', 1000)) return;
          const channelId = String(data?.channelId || '');
          await chat.member(actor, channelId);
          socket.to(chat.room(channelId)).emit('chat:typing', {
            channelId,
            userId: actor.id,
            name: actor.name,
            typing: data?.typing === true,
          });
        }),
      );
      socket.on('disconnect', () => {
        clearInterval(timer);
        if (sessionId)
          withTenant(socket.data.tenant, () =>
            db
              .query(
                "UPDATE work_sessions SET active_socket_id=NULL,status=CASE WHEN status='sharing' THEN 'offline' ELSE status END WHERE id=$1 AND active_socket_id=$2 RETURNING team_id",
                [sessionId, socket.id],
              )
              .then((q) => {
                if (q.rowCount)
                  work.publish(q.rows[0].team_id, 'work:offline', {
                    sessionId,
                  });
              })
              .catch(() => {}),
          );
      });
    }),
  );
  return io;
}
module.exports = { attachWorkplace };
