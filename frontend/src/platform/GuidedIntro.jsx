import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { HandCircle, ProductPreview, SharingBadge } from './ProductUI';
import { usePlatform } from './Context';
const SCENES = [
  {
    title: 'A place for your people.',
    text: 'Plinth gives an institute or workplace its own branded site. The platform is free, with every feature included.',
    path: 'both',
    scene: 'dashboard',
  },
  {
    title: 'Choose your path.',
    text: 'Institute brings school administration, exams and learning together. Workplace brings teams, tasks, consented monitoring and chat together.',
    path: 'both',
    scene: 'dashboard',
  },
  {
    title: 'Your site builds itself.',
    text: 'Choose a name, site address, logo and theme. Verify your admin email; Plinth creates your site and useful sample records automatically.',
    path: 'both',
    scene: 'dashboard',
  },
  {
    title: 'Make it yours.',
    text: 'Choose a complete light and dark theme, or your own primary and accent colours. Your name and logo follow you through login, navigation and app icons.',
    path: 'both',
    scene: 'dashboard',
  },
  {
    title: 'A calm room. A clear view.',
    text: 'Students sign in with teacher-issued accounts, check in with a passcode and answer one question at a time. Autosave, a timer and review-before-submit keep the focus on the exam. Teachers create exams, watch flags, review submissions and analyse grades.',
    path: 'institute',
    scene: 'exam',
  },
  {
    title: 'The rest of the school day.',
    text: 'Mark attendance, share a timetable, publish announcements and record fee status. Manage classes, rosters, handouts and staff profiles. Practise in the IDE; use courses, mock exams, custom tests, games and the arcade.',
    path: 'institute',
    scene: 'erp',
  },
  {
    title: 'Your team, at a glance.',
    text: 'Managers see consented screen tiles, online status, attendance, assigned tasks and flags sorted by severity. Employees can see their own activity and flag history.',
    path: 'workplace',
    scene: 'monitor',
  },
  {
    title: 'The app opens the web.',
    text: 'The Windows app is a thin bridge. Employees accept a clear notice in the web page; the web starts sharing. A visible badge follows real sharing state. Pause and optional webcam controls remain available.',
    path: 'workplace',
    scene: 'consent',
  },
  {
    title: 'Flags deserve a careful review.',
    text: 'Both paths share the same WebRTC engine and severity model. Browser or active-app events are observations, never proof. Consented flag clips attach to the event; retention is visible and bounded.',
    path: 'both',
    scene: 'monitor',
  },
  {
    title: 'Keep the conversation close.',
    text: 'Workplace channels and direct messages include history, search, mentions, unread badges and typing indicators. Share files with progress and previews, and pin what matters. Only channel members can download them.',
    path: 'workplace',
    scene: 'chat',
  },
  {
    title: 'Start with one small step.',
    text: 'Create an organisation site, or sign in to an existing one. Invite your staff and team. Institute students receive their accounts from a teacher. Replay this guide from Help whenever you need it.',
    path: 'both',
    scene: 'dashboard',
  },
];
export default function GuidedIntro({ button = false }) {
  const { tenant, user, ready } = usePlatform(),
    location = useLocation(),
    [open, setOpen] = useState(false),
    [index, setIndex] = useState(0);
  const scenes = tenant
    ? SCENES.filter(
        (s, i) =>
          (s.path === 'both' || s.path === tenant.path) &&
          ![1, 2].includes(i) &&
          (!(user?.role === 'employee') || i !== 6),
      )
    : SCENES;
  const key =
    'plinth.guide.v1.' +
    (tenant?.slug || 'root') +
    '.' +
    (user?.role || 'visitor');
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(key, 'seen');
    } catch {}
  };
  const replay = () => {
    setIndex(0);
    setOpen(true);
  };
  useEffect(() => {
    const replayEvent = () => replay();
    window.addEventListener('plinth-guide-open', replayEvent);
    window.addEventListener('dps:tour-replay', replayEvent);
    return () => {
      window.removeEventListener('plinth-guide-open', replayEvent);
      window.removeEventListener('dps:tour-replay', replayEvent);
    };
  }, []);
  useEffect(() => {
    if (
      !ready ||
      /\/exam\//.test(location.pathname) ||
      location.pathname.includes('verify') ||
      location.pathname.includes('provisioning')
    )
      return;
    let seen = true;
    try {
      seen = !!localStorage.getItem(key);
    } catch {}
    if (!seen) {
      const timer = setTimeout(replay, 1000);
      return () => clearTimeout(timer);
    }
  }, [key, ready]);
  useEffect(() => {
    if (!open) return;
    const listener = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, scenes.length - 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [open, scenes.length]);
  const s = scenes[index] || scenes[0],
    path = s.path === 'workplace' ? 'workplace' : tenant?.path || 'institute';
  return (
    <>
      {button && (
        <button className="p-help-button" type="button" onClick={replay}>
          <HelpCircle size={16} />
          Take a tour
        </button>
      )}
      <Modal
        open={open}
        onClose={close}
        title={'Take a look around · ' + (index + 1) + ' of ' + scenes.length}
        size="xl"
      >
        <div className="plinth-guide">
          <div className="guide-interface">
            <ProductPreview
              path={path}
              scene={s.scene}
              name={tenant?.name || 'Your organisation'}
              theme={tenant?.theme}
              logo={tenant?.logoUrl}
            />
            <HandCircle className={'guide-highlight scene-' + index} />
            {s.scene === 'consent' && <SharingBadge />}
          </div>
          <div className="guide-copy" aria-live="polite">
            <p className="p-caption">
              {tenant ? 'Welcome to ' + tenant.name : 'Welcome to Plinth'}
            </p>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <div className="guide-dots" aria-hidden="true">
              {scenes.map((_, i) => (
                <span key={i} className={i === index ? 'active' : ''} />
              ))}
            </div>
          </div>
        </div>
        <div className="guide-actions">
          <button type="button" className="p-text-button" onClick={close}>
            Skip tour
          </button>
          <div>
            <Button
              variant="secondary"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              <ArrowLeft size={15} />
              Back
            </Button>
            <Button
              onClick={() =>
                index === scenes.length - 1 ? close() : setIndex((i) => i + 1)
              }
            >
              {index === scenes.length - 1 ? 'Get started' : 'Next'}
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
