import { useEffect, useRef, useState } from 'react';
import {
  Monitor,
  Pause,
  Play,
  Square,
  Video,
  ShieldCheck,
  Download,
} from 'lucide-react';
import Button from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { request } from './api';
import { usePlatform } from './Context';
import { useQuery, FetchState } from './Shell';
import { useWorkSocket } from './workSocket';
import { useStudentRTC } from '../hooks/useWebRTC';
import {
  requestScreen,
  requestWebcam,
  stopStream,
} from '../services/proctoring';
import { IncidentCapture } from '../services/incidentCapture';
import { SharingBadge } from './ProductUI';
export default function WorkSharing() {
  const { tenant } = usePlatform(),
    toast = useToast(),
    consent = useQuery('/api/workplace/consent'),
    teams = useQuery('/api/workplace/teams'),
    download = useQuery('/api/workplace/desktop-download'),
    [team, setTeam] = useState(''),
    [accepted, setAccepted] = useState(false),
    [session, setSession] = useState(null),
    [screen, setScreen] = useState(null),
    [webcam, setWebcam] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [recording, setRecording] = useState({ status: 'idle', message: '' }),
    { socket, connected } = useWorkSocket(),
    streams = useRef({}),
    engine = useRef(null),
    current = useRef(null),
    action = useRef(null),
    autoStarted = useRef(false),
    ending = useRef(false);
  const sharing =
    !!screen?.getVideoTracks().some((t) => t.readyState === 'live') &&
    session?.status === 'sharing';
  current.current = { session, sharing };
  streams.current = { screen, webcam };
  useStudentRTC(socket, streams, sharing);
  const badge = () =>
    window.plinthDesktop?.sharingState({
      screen: !!streams.current.screen
        ?.getVideoTracks()
        .some((t) => t.readyState === 'live'),
      webcam: !!streams.current.webcam
        ?.getVideoTracks()
        .some((t) => t.readyState === 'live'),
      tenant: tenant.name,
      connected,
    });
  const end = async (status = 'paused', reason = 'Employee paused sharing') => {
    if (ending.current) return;
    ending.current = true;
    const s = current.current.session;
    current.current.sharing = false;
    await engine.current?.close(reason);
    engine.current = null;
    stopStream(streams.current.screen);
    stopStream(streams.current.webcam);
    streams.current = {};
    setScreen(null);
    setWebcam(null);
    window.plinthDesktop?.sharingState({
      screen: false,
      webcam: false,
      tenant: tenant.name,
      connected,
    });
    if (s) {
      try {
        const q = await request('/api/workplace/sessions/' + s.id + '/state', {
          method: 'PATCH',
          body: { status, reason },
        });
        setSession(q.session);
      } catch (e) {
        setError(e.message);
      }
    }
    ending.current = false;
  };
  useEffect(() => {
    window.plinthDesktop?.sharingState({
      screen: sharing,
      webcam: !!webcam,
      connected,
    });
  }, [sharing, webcam, connected]);
  action.current = end;
  useEffect(() => {
    request('/api/workplace/sessions/current')
      .then((q) => {
        setSession(q.session);
        if (q.session) setTeam(q.session.team_id);
      })
      .catch((e) => setError(e.message));
    return () => {
      stopStream(streams.current.screen);
      stopStream(streams.current.webcam);
      engine.current?.close('page-left');
      window.plinthDesktop?.sharingState({
        screen: false,
        webcam: false,
        tenant: tenant.name,
        connected,
      });
    };
  }, []);
  useEffect(() => {
    if (!socket || !sharing) return;
    const join = () =>
      socket.emit('work:joinSession', { sessionId: session.id });
    join();
    socket.on('connect', join);
    const timer = setInterval(() => socket.emit('work:heartbeat'), 20000);
    return () => {
      clearInterval(timer);
      socket.off('connect', join);
    };
  }, [socket, sharing, session?.id]);
  useEffect(() => {
    if (!socket) return;
    const policy = () => {
      action.current?.('paused', 'Work hours ended or policy changed');
      consent.refresh();
    };
    socket.on('work:policyChanged', policy);
    return () => socket.off('work:policyChanged', policy);
  }, [socket, consent.refresh]);
  useEffect(() => {
    if (!sharing) return;
    const timer = setInterval(async () => {
      try {
        const p = await request('/api/workplace/desktop-permit');
        if (!p.allowed) action.current?.('paused', 'Sharing permission ended');
      } catch {
        action.current?.('paused', 'Connection lost; sharing paused');
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [sharing]);
  const start = async ({ automatic = false } = {}) => {
    setBusy(true);
    setError('');
    let captured;
    try {
      if (!consent.data?.accepted) {
        if (!accepted)
          throw new Error('Read and accept the monitoring notice first.');
        await request('/api/workplace/consent', {
          method: 'POST',
          body: { accept: true, policyVersion: consent.data.policyVersion },
        });
        await consent.refresh();
      }
      const teamId = team || teams.data?.teams[0]?.id;
      if (!teamId)
        throw new Error('Ask your administrator to add you to a team.');
      if (automatic) {
        const p = await request('/api/workplace/desktop-permit');
        if (!p.allowed)
          throw new Error(
            'Resume sharing yourself after checking work hours and consent.',
          );
      }
      captured = await requestScreen();
      const q = await request('/api/workplace/sessions', {
        method: 'POST',
        body: { teamId, resume: session?.status === 'paused' },
      });
      setSession(q.session);
      setScreen(captured);
      streams.current = { screen: captured };
      window.plinthDesktop?.sharingState({
        screen: true,
        webcam: false,
        tenant: tenant.name,
        connected,
      });
      captured
        .getVideoTracks()[0]
        .addEventListener(
          'ended',
          () => action.current?.('paused', 'Screen sharing stopped'),
          { once: true },
        );
      engine.current = new IncidentCapture({
        screen: captured,
        preRollMs: 10000,
        notify: setRecording,
        upload: {
          open: (body) =>
            request('/api/workplace/incidents', {
              method: 'POST',
              body: { ...body, sessionId: q.session.id },
            }),
          chunk: (id, sequence, part) => {
            const body = new FormData();
            body.append('chunk', part, 'screen.webm');
            return request(
              '/api/workplace/incidents/' + id + '/chunks/' + sequence,
              { method: 'POST', body },
            );
          },
          finish: (id, reason) =>
            request('/api/workplace/incidents/' + id + '/finish', {
              method: 'POST',
              body: { reason },
            }),
        },
      });
    } catch (e) {
      stopStream(captured);
      window.plinthDesktop?.sharingState({
        screen: false,
        webcam: false,
        connected,
      });
      setError(
        e.name === 'NotAllowedError'
          ? 'Screen sharing was not started. Choose Start sharing when you’re ready.'
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (
      !window.plinthDesktop ||
      autoStarted.current ||
      !consent.data ||
      !teams.data ||
      !session
    )
      return;
    autoStarted.current = true;
    if (
      ['offline', 'sharing'].includes(session.status) &&
      consent.data.accepted &&
      consent.data.canShare
    )
      start({ automatic: true });
  }, [consent.data, teams.data, session]);
  useEffect(() => {
    if (!sharing) return;
    let clipTimer;
    const flag = async (payload) => {
      try {
        const q = await request(
          '/api/workplace/sessions/' + current.current.session.id + '/events',
          { method: 'POST', body: payload },
        );
        if (q.flag && engine.current?.begin({ flagId: q.flag.id })) {
          clearTimeout(clipTimer);
          clipTimer = setTimeout(
            () => engine.current?.finish('flag-context-complete'),
            15000,
          );
        }
      } catch (e) {
        setError(e.message);
      }
    };
    const sensor = window.plinthDesktop?.onActiveWindow(async (data) => {
      try {
        const q = await request(
          '/api/workplace/sessions/' + current.current.session.id + '/sensor',
          { method: 'POST', body: data },
        );
        if (q.flag && engine.current?.begin({ flagId: q.flag.id })) {
          clearTimeout(clipTimer);
          clipTimer = setTimeout(
            () => engine.current?.finish('flag-context-complete'),
            15000,
          );
        }
      } catch (e) {
        setError(e.message);
      }
    });
    const visibility = () => {
      if (document.visibilityState === 'hidden')
        flag({ eventType: 'TAB_SWITCH' });
    };
    const blur = () => {
      if (!window.plinthDesktop) flag({ eventType: 'WINDOW_BLUR' });
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    return () => {
      clearTimeout(clipTimer);
      sensor?.();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', blur);
    };
  }, [sharing]);
  useEffect(() => {
    if (!window.plinthDesktop) return;
    return window.plinthDesktop.onPause(() =>
      action.current?.('paused', 'Employee paused from sharing badge'),
    );
  }, []);
  const camera = async () => {
    try {
      if (webcam) {
        stopStream(webcam);
        streams.current.webcam = null;
        setWebcam(null);
        await request('/api/workplace/sessions/' + session.id + '/state', {
          method: 'PATCH',
          body: { status: 'sharing', webcamOn: false },
        });
      } else {
        const stream = await requestWebcam();
        stream.getVideoTracks()[0].addEventListener(
          'ended',
          () => {
            streams.current.webcam = null;
            setWebcam(null);
            badge();
            request('/api/workplace/sessions/' + session.id + '/state', { method: 'PATCH', body: { status: 'sharing', webcamOn: false } }).catch(() => {});
          },
          { once: true },
        );
        streams.current.webcam = stream;
        setWebcam(stream);
        await request('/api/workplace/sessions/' + session.id + '/state', {
          method: 'PATCH',
          body: { status: 'sharing', webcamOn: true },
        });
      }
      badge();
    } catch (e) {
      toast(
        e.name === 'NotAllowedError'
          ? 'Webcam permission was declined. Screen sharing can continue.'
          : e.message,
        'error',
      );
    }
  };
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-caption">You control your sharing</p>
          <h1>
            {sharing
              ? 'Your screen is shared.'
              : session?.status === 'paused'
                ? 'Sharing is paused.'
                : 'Start with a clear choice.'}
          </h1>
        </div>
        <SharingBadge paused={!sharing} webcam={!!webcam} />
      </div>
      <div className="p-sharing-layout">
        <section className="p-card">
          <ShieldCheck size={30} />
          <h2>Read before sharing</h2>
          <FetchState query={consent}>
            {consent.data && (
              <>
                <p>{`Your screen and focused app names are shared with your team manager and site administrators. Sharing is optional and can be paused or stopped. Flags require a careful human review.`}</p>
                <dl className="p-notice-details">
                  <dt>What is shared</dt>
                  <dd>
                    Screen and active app names. No microphone audio. Webcam
                    only if you turn it on.
                  </dd>
                  <dt>Who can see it</dt>
                  <dd>Your team manager and organisation administrators.</dd>
                  <dt>Recordings</dt>
                  <dd>
                    A short buffer stays in memory. Flag clips are retained for{' '}
                    {consent.data.notice.retentionDays} days.
                  </dd>
                  <dt>Work hours</dt>
                  <dd>
                    {consent.data.notice.workHours} ·{' '}
                    {consent.data.notice.timezone}
                  </dd>
                </dl>
                {!consent.data.canShare && (
                  <p className="p-error">
                    Sharing is unavailable outside configured work hours, or
                    monitoring has not been enabled.
                  </p>
                )}
                {!consent.data.accepted && (
                  <label className="p-checkbox">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    I have read this notice and choose to share during work
                    hours. I can pause or withdraw consent.
                  </label>
                )}
                {consent.data.accepted && (
                  <p>
                    Notice accepted.{' '}
                    <button
                      className="p-text-button"
                      onClick={async () => {
                        await end('ended', 'Consent withdrawn');
                        try {
                          await request('/api/workplace/consent', {
                            method: 'DELETE',
                          });
                          setAccepted(false);
                          consent.refresh();
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      Withdraw consent
                    </button>
                  </p>
                )}
              </>
            )}
          </FetchState>
        </section>
        <section className="p-card">
          <h2>{sharing ? 'Sharing controls' : 'Your sharing session'}</h2>
          <label>
            Team
            <select
              className="input"
              value={team || teams.data?.teams[0]?.id || ''}
              disabled={sharing || (!!session && !session.ended_at)}
              onChange={(e) => setTeam(e.target.value)}
            >
              {teams.data?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          {sharing ? (
            <>
              <div className="p-sharing-preview">
                <video
                  muted
                  playsInline
                  autoPlay
                  ref={(node) => {
                    if (node) node.srcObject = screen;
                  }}
                />
              </div>
              <p className="p-connection">
                {connected
                  ? 'Connected to your organisation'
                  : 'Reconnecting. Sharing will pause if the connection stays unavailable.'}
              </p>
              <div className="p-actions">
                <Button onClick={() => end('paused')}>
                  <Pause size={16} />
                  Pause sharing
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => end('ended', 'Employee stopped sharing')}
                >
                  <Square size={15} />
                  Stop session
                </Button>
                <Button variant="secondary" onClick={camera}>
                  <Video size={16} />
                  {webcam ? 'Turn webcam off' : 'Turn webcam on'}
                </Button>
              </div>
              {webcam && (
                <video
                  className="p-webcam-preview"
                  muted
                  autoPlay
                  playsInline
                  ref={(node) => {
                    if (node) node.srcObject = webcam;
                  }}
                />
              )}
            </>
          ) : (
            <>
              <p>
                {session?.status === 'paused'
                  ? 'Your screen is no longer shared. Choose Resume when you’re ready.'
                  : 'You will choose a screen in your browser. In the Windows app, consent and server work-hour checks allow the web to select the screen.'}
              </p>
              <Button
                disabled={
                  busy ||
                  !consent.data?.canShare ||
                  (!consent.data?.accepted && !accepted)
                }
                onClick={() => start()}
              >
                <Play size={16} />
                {busy
                  ? 'Starting…'
                  : session?.status === 'paused'
                    ? 'Resume sharing'
                    : 'Start sharing'}
              </Button>
            </>
          )}
          {error && (
            <p className="p-error" role="alert">
              {error}
            </p>
          )}
          {recording.message && <p role="status">{recording.message}</p>}
          <div className="p-desktop-download">
            <h3>Windows app</h3>
            <p>{download.data?.message || 'Checking the Windows release…'}</p>
            {download.data?.available && (
              <a className="btn btn-secondary" href={download.data.url}>
                <Download size={16} />
                Download Windows app
              </a>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
