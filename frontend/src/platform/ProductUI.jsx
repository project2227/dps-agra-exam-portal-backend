import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  MessageSquare,
  Monitor,
  Pause,
  ShieldCheck,
  Signal,
  TriangleAlert,
} from 'lucide-react';
import { themeOf } from './theme';
export function Mark({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path d="m13 23 19-10 19 10-19 11Z" />
      <path d="m13 32 19 10 19-10M13 41l19 10 19-10" />
    </svg>
  );
}
export function HandCircle({ className = '' }) {
  return (
    <svg
      className={'hand-circle ' + className}
      viewBox="0 0 260 110"
      fill="none"
      aria-hidden="true"
    >
      <path d="M237 56c15-46-80-62-152-45C15 28 1 77 45 93c51 19 152 4 191-20 41-25 5-51-60-57C83 7 19 36 23 63" />
    </svg>
  );
}
export function ScreenTile({
  name = 'Shared screen',
  flag = false,
  sharing = true,
  stream,
  children,
}) {
  return (
    <div className={'p-screen-tile ' + (flag ? 'is-flagged' : '')}>
      <div className="p-tile-bar">
        <span>
          <Monitor size={12} />
          {name}
        </span>
        <span>
          {flag ? (
            <>
              <TriangleAlert size={12} />
              Review
            </>
          ) : sharing ? (
            <>
              <Signal size={12} />
              Live
            </>
          ) : (
            <>
              <Pause size={12} />
              Paused
            </>
          )}
        </span>
      </div>
      <div className="p-tile-content">
        {stream ? (
          <video
            autoPlay
            playsInline
            muted
            ref={(node) => {
              if (node) node.srcObject = stream;
            }}
            aria-label={name + ' live shared screen'}
          />
        ) : (
          children || (
            <div className="p-screen-document">
              <span />
              <span />
              <span />
              <i />
              <span />
              <span />
            </div>
          )
        )}
      </div>
      {flag && (
        <span className="p-recording">
          <span />
          Flag clip
        </span>
      )}
    </div>
  );
}
export function ConsentPanel({ compact = false }) {
  return (
    <div className={'p-consent ' + (compact ? 'compact' : '')}>
      <ShieldCheck size={28} />
      <h3>You’re in control.</h3>
      <p>
        Screen and active app names are shared during work hours. Clips are
        saved only when flagged, for 30 days.
      </p>
      <div className="p-consent-row">
        <Check size={15} />
        Screen sharing
      </div>
      <div className="p-consent-row">
        <Check size={15} />
        Pause at any time
      </div>
      <div className="p-consent-row muted">
        Webcam is optional · Off by default
      </div>
      <div className="p-demo-button">
        Accept and continue <ChevronRight size={14} />
      </div>
    </div>
  );
}
export function SharingBadge({ webcam = false, paused = false }) {
  return (
    <div className={'p-sharing-badge ' + (paused ? 'paused' : '')}>
      <span />
      {paused
        ? 'Sharing paused'
        : webcam
          ? 'Screen and webcam are being shared'
          : 'Screen is being shared'}
    </div>
  );
}
export function ChatBubble({ file = false, children, mine = false }) {
  return (
    <div className={'p-chat-bubble ' + (mine ? 'mine' : '')}>
      {file ? (
        <>
          <FileText size={19} />
          <span>
            Project brief.pdf<small>PDF · 240 KB</small>
          </span>
        </>
      ) : (
        children
      )}
    </div>
  );
}
export function ProductPreview({
  path = 'institute',
  name = 'Your organisation',
  theme,
  logo,
  scene = 'dashboard',
  className = '',
}) {
  const t = themeOf(theme, path);
  return (
    <div
      className={'product-window ' + className}
      style={{
        '--preview-primary': t.primary,
        '--preview-on-primary': t.onPrimary,
        '--preview-accent': t.accent,
        '--preview-canvas': t.canvas,
        '--preview-ink': t.ink,
        '--preview-radius': t.radius + 'px',
      }}
    >
      <div className="p-window-chrome">
        <span>
          <i />
          <i />
          <i />
        </span>
        <small>{name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.plinth</small>
        <ShieldCheck size={12} />
      </div>
      <div className="p-window-body">
        <aside className="p-preview-sidebar">
          <div className="p-preview-brand">
            {logo ? <img src={logo} alt="" /> : <Mark />}
            <strong>{name}</strong>
          </div>
          <div className="p-preview-nav">
            <span className="selected">
              <Layers size={13} />
              Overview
            </span>
            <span>
              <Monitor size={13} />
              {path === 'institute' ? 'Exams' : 'Live view'}
            </span>
            <span>
              <CheckCircle2 size={13} />
              {path === 'institute' ? 'Attendance' : 'Tasks'}
            </span>
            <span>
              <MessageSquare size={13} />
              {path === 'institute' ? 'Announcements' : 'Chat'}
            </span>
          </div>
          <small>Built on Plinth</small>
        </aside>
        <div className="p-preview-main">
          {scene === 'consent' ? (
            <ConsentPanel compact />
          ) : scene === 'chat' ? (
            <div className="p-preview-chat">
              <h3># project-room</h3>
              <ChatBubble>Ready for the next step?</ChatBubble>
              <ChatBubble mine>Everything is in one place.</ChatBubble>
              <ChatBubble file />
            </div>
          ) : scene === 'exam' ? (
            <div className="p-preview-exam">
              <div className="p-preview-heading">
                <span>
                  <GraduationCap size={15} />
                  Computing assessment
                </span>
                <span>
                  <Clock size={12} />
                  28:40
                </span>
              </div>
              <div className="p-exam-progress">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <small>Question 2 of 5</small>
              <h3>Explain how a loop works.</h3>
              <div className="p-answer">
                A loop repeats a set of instructions…
                <span />
              </div>
              <div className="p-save">
                <Check size={12} />
                Saved just now
              </div>
              <div className="p-demo-button">
                Next question <ChevronRight size={13} />
              </div>
            </div>
          ) : scene === 'erp' ? (
            <>
              <div className="p-preview-heading">
                <h3>A clear school day.</h3>
              </div>
              <div className="p-preview-erp">
                {[
                  ['Attendance', 'Class IX · Mark register'],
                  ['Timetable', 'Computing · Period 3'],
                  ['Announcements', 'New handout available'],
                  ['Fee status', 'Record only · No payments'],
                ].map(([title, body]) => (
                  <div key={title}>
                    <CheckCircle2 size={18} />
                    <span>
                      <strong>{title}</strong>
                      <small>{body}</small>
                    </span>
                    <ChevronRight size={14} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="p-preview-heading">
                <div>
                  <small>
                    {path === 'institute' ? 'Exam workspace' : 'Team workspace'}
                  </small>
                  <h3>
                    {scene === 'monitor'
                      ? 'A view when it matters.'
                      : 'Everything for today.'}
                  </h3>
                </div>
                <span className="p-preview-live">
                  <span />
                  Connected
                </span>
              </div>
              <div className="p-preview-stats">
                <div>
                  <strong>{path === 'institute' ? '24' : '8'}</strong>
                  <small>
                    {path === 'institute' ? 'Checked in' : 'Sharing'}
                  </small>
                </div>
                <div>
                  <strong>2</strong>
                  <small>Need attention</small>
                </div>
                <div>
                  <strong>{path === 'institute' ? '18' : '5'}</strong>
                  <small>
                    {path === 'institute' ? 'Saved answers' : 'Tasks done'}
                  </small>
                </div>
              </div>
              <div className="p-preview-tiles">
                <ScreenTile
                  name={
                    path === 'institute' ? 'Exam screen 1' : 'Team screen 1'
                  }
                  flag={scene === 'monitor'}
                />
                <ScreenTile
                  name={
                    path === 'institute' ? 'Exam screen 2' : 'Team screen 2'
                  }
                />
              </div>
              <div className="p-preview-summary">
                <ShieldCheck size={14} />
                <span>Only your organisation. Only with consent.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
