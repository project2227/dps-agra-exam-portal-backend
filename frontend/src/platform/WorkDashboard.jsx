import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Monitor,
  TriangleAlert,
  Video,
  Pause,
  Play,
} from 'lucide-react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { useTeacherRTC } from '../hooks/useWebRTC';
import { useQuery, FetchState } from './Shell';
import { usePlatform } from './Context';
import { useWorkSocket } from './workSocket';
import { request } from './api';
import { PLINTH } from '../config';
import { ScreenTile } from './ProductUI';
const date = (value) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
export default function WorkDashboard({
  monitor = false,
  attendance = false,
  flags = false,
}) {
  const { user } = usePlatform(),
    toast = useToast(),
    q = useQuery(
      attendance
        ? '/api/workplace/attendance'
        : flags
          ? '/api/workplace/flags'
          : '/api/workplace/dashboard',
    ),
    teams = useQuery('/api/workplace/teams'),
    { socket, connected, error } = useWorkSocket(),
    rtc = useTeacherRTC(socket),
    [clip, setClip] = useState(null),
    [clips, setClips] = useState(null),
    [clipError, setClipError] = useState('');
  const manager = ['admin', 'manager'].includes(user.role);
  useEffect(() => {
    if (!socket || !manager) return;
    const join = () =>
      teams.data?.teams.forEach((t) =>
        socket.emit('work:joinMonitor', { teamId: t.id }),
      );
    join();
    socket.on('connect', join);
    return () => socket.off('connect', join);
  }, [socket, teams.data, manager]);
  useEffect(() => {
    if (!socket) return;
    const update = () => q.refresh(),
      offline = ({ sessionId }) => {
        rtc.stop(sessionId);
        update();
      },
      status = ({ session }) => {
        if (session.status !== 'sharing') rtc.stop(session.id);
        update();
      };
    socket.on('work:status', status);
    socket.on('work:flag', update);
    socket.on('work:offline', offline);
    socket.on('work:recording', update);
    return () => {
      socket.off('work:status', status);
      socket.off('work:flag', update);
      socket.off('work:offline', offline);
      socket.off('work:recording', update);
    };
  }, [socket, q.refresh, rtc.stop]);
  const activity = q.data?.flags || [],
    sessions = q.data?.sessions || [];
  const ordered = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const score = (id) =>
          activity
            .filter((f) => f.session_id === id)
            .reduce(
              (s, f) =>
                s + ({ high: 100, medium: 10, low: 1 }[f.severity] || 0),
              0,
            );
        return score(b.id) - score(a.id) || a.name.localeCompare(b.name);
      }),
    [sessions, activity],
  );
  const inspect = async (flag) => {
    setClip({ flag, url: null });
    setClips(null);
    setClipError('');
    try {
      setClips(
        (await request('/api/workplace/flags/' + flag.id + '/recordings'))
          .recordings,
      );
    } catch (e) {
      setClipError(e.message);
    }
  };
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-caption">
            {attendance
              ? 'Session attendance'
              : flags
                ? 'Your activity history'
                : monitor
                  ? 'Consented live view'
                  : 'Your workspace'}
          </p>
          <h1>
            {attendance
              ? 'Time together.'
              : flags
                ? 'Your flags.'
                : monitor
                  ? 'Who needs a closer look?'
                  : 'Good to see you, ' + user.name.split(' ')[0] + '.'}
          </h1>
        </div>
        <span className={'p-connection ' + (connected ? 'live' : '')}>
          <span />
          {connected ? 'Live connection' : 'Reconnecting'}
        </span>
      </div>
      {error && (
        <p className="p-error" role="status">
          {error}
        </p>
      )}
      {!attendance && !flags && !monitor && (
        <div className="p-stat-grid">
          <div className="p-card">
            <Monitor size={20} />
            <strong>
              {sessions.filter((s) => s.status === 'sharing').length}
            </strong>
            <span>
              {manager ? 'People sharing' : 'Active sharing sessions'}
            </span>
          </div>
          <div className="p-card">
            <TriangleAlert size={20} />
            <strong>
              {activity.filter((f) => f.severity !== 'low').length}
            </strong>
            <span>Flags to review</span>
          </div>
          <Link className="p-card p-card-link" to="/sharing">
            <Play size={20} />
            <strong>My sharing</strong>
            <span>Read the notice. Start, pause or stop.</span>
          </Link>
        </div>
      )}
      <FetchState query={q}>
        {attendance ? (
          <div className="p-table-wrap">
            <table>
              <caption className="sr-only">Sharing session attendance</caption>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Started</th>
                  <th>Active time</th>
                  <th>Break time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {q.data?.records.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{date(s.started_at)}</td>
                    <td>{Math.round(s.active_seconds / 60)} min</td>
                    <td>{Math.round(s.break_seconds / 60)} min</td>
                    <td>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!q.data?.records.length && (
              <p className="p-empty">
                Session attendance will appear after sharing starts.
              </p>
            )}
          </div>
        ) : (
          <>
            {!flags && manager && (
              <section>
                <div className="p-section-heading">
                  <h2>Shared screens</h2>
                  <p>
                    Ordered by flags requiring attention. Only active, consented
                    streams are available.
                  </p>
                </div>
                <div className="p-live-grid">
                  {ordered.map((s) => (
                    <div className="p-card" key={s.id}>
                      <ScreenTile
                        name={s.name}
                        sharing={s.status === 'sharing'}
                        flag={activity.some(
                          (f) => f.session_id === s.id && f.severity !== 'low',
                        )}
                        stream={rtc.streams[s.id]?.screen}
                      >
                        <div className="p-stream-placeholder">
                          <Monitor size={28} />
                          <p>
                            {s.status === 'sharing'
                              ? 'Open this consented screen'
                              : s.status === 'paused'
                                ? 'Sharing is paused'
                                : 'Screen is offline'}
                          </p>
                        </div>
                      </ScreenTile>
                      <div className="p-tile-actions">
                        <span>
                          {s.status} ·{' '}
                          {rtc.mediaStates[s.id]?.screen || 'Preview closed'}
                        </span>
                        <Button
                          variant="secondary"
                          disabled={s.status !== 'sharing' || !connected}
                          onClick={() =>
                            rtc.watch(s.id, [
                              'screen',
                              ...(s.webcam_on ? ['webcam'] : []),
                            ])
                          }
                        >
                          View screen
                        </Button>
                        <button
                          type="button"
                          className="p-text-button"
                          onClick={() => rtc.stop(s.id)}
                        >
                          Close
                        </button>
                      </div>
                      {rtc.streams[s.id]?.webcam && (
                        <video
                          className="p-webcam-preview"
                          autoPlay
                          playsInline
                          muted
                          ref={(node) => {
                            if (node) node.srcObject = rtc.streams[s.id].webcam;
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {!ordered.length && (
                  <p className="p-empty">
                    No sharing sessions yet. Employees choose when to share
                    during configured work hours.
                  </p>
                )}
              </section>
            )}
            <section>
              <div className="p-section-heading">
                <h2>{flags ? 'Activity flags' : 'Recent flags'}</h2>
                <p>
                  Events are observations. Review the context before taking
                  action.
                </p>
              </div>
              <div className="p-flag-list">
                {activity.map((f) => (
                  <div
                    className={'p-flag-row severity-' + f.severity}
                    key={f.id}
                  >
                    <TriangleAlert size={18} />
                    <div>
                      <strong>
                        {f.event_type.replaceAll('_', ' ').toLowerCase()}
                      </strong>
                      <p>
                        {f.name || user.name} · {f.message}
                        {f.metadata?.app ? ' · ' + f.metadata.app : ''}
                      </p>
                      <small>{date(f.created_at)}</small>
                    </div>
                    <span className="p-badge">
                      {f.severity} · Review required
                    </span>
                    <button
                      type="button"
                      className="p-text-button"
                      onClick={() => inspect(f)}
                    >
                      <Video size={16} />
                      Clips
                    </button>
                  </div>
                ))}
              </div>
              {!activity.length && (
                <p className="p-empty">No activity flags in this view.</p>
              )}
            </section>
          </>
        )}
      </FetchState>
      <Modal
        open={!!clip}
        onClose={() => setClip(null)}
        title="Review a flag clip"
      >
        <p>
          Clips show context around the event. They expire according to your
          site’s retention policy.
        </p>
        {clipError && <p role="alert">{clipError}</p>}
        {clips === null && !clipError ? (
          <p>Loading clips…</p>
        ) : !clips?.length ? (
          <p>
            No recording is attached to this event. Recording requires consent
            and a supported browser.
          </p>
        ) : (
          clips.map((c) => (
            <div className="p-clip-row" key={c.id}>
              <span>
                {date(c.started_at)} · {Math.round(c.size_bytes / 1024)} KB
              </span>
              <Button
                disabled={!c.ended_at || !c.size_bytes}
                onClick={async () => {
                  try {
                    const r = await request(
                      '/api/workplace/incidents/' + c.id + '/link',
                    );
                    setClip((x) => ({
                      ...x,
                      url: (PLINTH.base || '') + r.url,
                    }));
                  } catch (e) {
                    toast(e.message, 'error');
                  }
                }}
              >
                {c.ended_at ? 'Play clip' : 'Saving…'}
              </Button>
            </div>
          ))
        )}
        {clip?.url && (
          <video controls src={clip.url} className="p-clip-video" />
        )}
      </Modal>
    </>
  );
}
