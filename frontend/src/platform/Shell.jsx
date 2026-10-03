import { useEffect, useState, useCallback } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  HelpCircle,
  LogOut,
  Menu,
  Moon,
  Sun,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Loader from '../components/common/Loader';
import Skeleton from '../components/common/Skeleton';
import { useToast } from '../components/common/Toast';
import { usePlatform } from './Context';
import { request } from './api';
import { Mark, ProductPreview } from './ProductUI';
import { PLINTH } from '../config';
export function useQuery(path) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setError('');
    try {
      const next = await request(path);
      setData(next);
      return next;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setData(null);
    request(path)
      .then((q) => {
        if (live) setData(q);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path]);
  return { data, setData, error, loading, refresh };
}
export function FetchState({ query, empty, children }) {
  if (query.loading)
    return (
      <div aria-busy="true" aria-label="Loading">
        <Skeleton className="h-24" />
        <Skeleton className="mt-4 h-24" />
      </div>
    );
  if (query.error)
    return (
      <div role="alert" className="p-error">
        <p>{query.error}</p>
        <Button variant="secondary" onClick={query.refresh}>
          <RefreshCw size={15} />
          Try again
        </Button>
      </div>
    );
  if (empty)
    return (
      <div className="p-empty">
        <p>{empty}</p>
      </div>
    );
  return children;
}
export function ThemeButton() {
  const [dark, setDark] = useState(
    document.documentElement.dataset.theme === 'dark',
  );
  return (
    <button
      type="button"
      className="p-icon-button"
      aria-label={dark ? 'Use light theme' : 'Use dark theme'}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? 'dark' : 'light';
        localStorage.setItem('dps.ui.theme', next ? 'dark' : 'light');
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
export function Brand() {
  const { tenant } = usePlatform();
  return (
    <Link className="p-brand" to="/">
      {tenant?.logoUrl ? <img src={tenant.logoUrl} alt="" /> : <Mark />}
      <span>{tenant?.name || 'Plinth'}</span>
    </Link>
  );
}
export function SimpleHeader() {
  return (
    <header className="p-simple-header">
      <Brand />
      <div>
        <button
          className="p-icon-button"
          aria-label="Open guide"
          onClick={() => window.dispatchEvent(new Event('plinth-guide-open'))}
        >
          <HelpCircle size={18} />
        </button>
        <ThemeButton />
      </div>
    </header>
  );
}
export function RequireOrg({ children }) {
  const { ready, user, error, refresh } = usePlatform();
  if (!ready) return <Loader />;
  if (error)
    return (
      <div className="p-empty" role="alert">
        <p>{error}</p>
        <Button onClick={refresh}>Try again</Button>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
export function OrgPicker() {
  const [slug, setSlug] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const q = await request(
        '/api/platform/availability?slug=' +
          encodeURIComponent(slug.toLowerCase()),
      );
      if (q.available || !q.siteUrl)
        throw new Error('Check the site address your organisation gave you.');
      location.href = q.siteUrl + '/login';
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SimpleHeader />
      <main className="p-auth">
        <p className="p-caption">Your organisation</p>
        <h1>Find your site.</h1>
        <p>
          Use the site address in your invitation. Institute students receive
          their username from a teacher.
        </p>
        <form onSubmit={go}>
          <Input
            label="Site address"
            required
            autoComplete="organization"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-organisation"
            error={error}
          />
          <Button type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Open your site'}
            <ArrowRight size={16} />
          </Button>
        </form>
        <Link to="/create">Create an organisation site</Link>
      </main>
    </>
  );
}
export function OrgLogin() {
  const { tenant, user, signIn } = usePlatform(),
    navigate = useNavigate();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (user)
    return (
      <Navigate
        to={tenant.path === 'institute' ? '/teacher/dashboard' : '/dashboard'}
        replace
      />
    );
  return (
    <>
      <SimpleHeader />
      <main className="p-auth">
        <p className="p-caption">{tenant?.name}</p>
        <h1>Sign in.</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await signIn({ email, password, remember });
              navigate(
                tenant.path === 'institute'
                  ? '/teacher/dashboard'
                  : '/dashboard',
              );
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="p-checkbox">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
            />
            Show password
          </label>
          <label className="p-checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Keep me signed in on this device
          </label>
          {error && (
            <p className="p-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            <ArrowRight size={16} />
          </Button>
        </form>
        <p>Ask your organisation administrator if you need help signing in.</p>
        {tenant?.path === 'institute' && (
          <Link to="/student/login">Student sign in</Link>
        )}
      </main>
    </>
  );
}
export function TenantHome() {
  const { tenant, user } = usePlatform();
  return (
    <>
      <SimpleHeader />
      <main className="p-tenant-home">
        <div>
          <p className="p-caption">Welcome to {tenant?.name}</p>
          <h1>
            {tenant?.path === 'institute'
              ? 'Ready for your school day.'
              : 'Your team, in one place.'}
          </h1>
          <p>
            {tenant?.path === 'institute'
              ? 'Exams, learning and the school day. Choose where you want to begin.'
              : 'Tasks, conversation and sharing that stays in your control.'}
          </p>
          <div className="p-actions">
            {tenant?.path === 'institute' ? (
              <>
                <Link className="btn btn-primary" to="/student/join">
                  Join an exam
                  <ArrowRight size={17} />
                </Link>
                <Link className="btn btn-secondary" to="/student/login">
                  I’m a student
                </Link>
                <Link className="btn btn-secondary" to="/teacher/login">
                  I’m a teacher
                </Link>
              </>
            ) : (
              <Link
                className="btn btn-primary"
                to={user ? '/dashboard' : '/login'}
              >
                {user ? 'Open your dashboard' : 'Sign in'}
                <ArrowRight size={17} />
              </Link>
            )}
          </div>
          {tenant?.path === 'institute' && (
            <nav className="p-home-links" aria-label="More school tools">
              <Link to="/learn">Learning Hub</Link>
              <Link to="/student/practice">Practice IDE</Link>
              <Link to="/school/announcements">Announcements</Link>
              <Link to="/school/timetable">Timetable</Link>
            </nav>
          )}
        </div>
        <ProductPreview
          path={tenant?.path}
          name={tenant?.name}
          theme={tenant?.theme}
          logo={tenant?.logoUrl}
        />
      </main>
      <footer className="p-tenant-footer">
        <span>Built on Plinth · Every feature is free</span>
        <Link to="/privacy">Privacy and consent</Link>
      </footer>
    </>
  );
}
export function WorkLayout() {
  const { tenant, user, signOut } = usePlatform(),
    location = useLocation(),
    toast = useToast(),
    [open, setOpen] = useState(false);
  const manager = ['admin', 'manager'].includes(user?.role);
  const links = [
    ['/dashboard', 'Overview'],
    ['/sharing', 'My sharing'],
    ...(manager ? [['/monitor', 'Live monitor']] : []),
    ['/tasks', 'Tasks'],
    ['/chat', 'Chat'],
    ['/attendance', 'Attendance'],
    ['/flags', 'My flags'],
    ...(user?.role === 'admin'
      ? [
          ['/teams', 'Teams & people'],
          ['/settings', 'Site settings'],
        ]
      : []),
  ];
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <div className="p-app">
      <aside className={'p-sidebar ' + (open ? 'open' : '')}>
        <Brand />
        <p>
          {user?.name}
          <small>{user?.role}</small>
        </p>
        <nav aria-label="Workspace">
          {links
            .filter(
              ([href]) =>
                !['/tasks', '/chat', '/attendance'].includes(href) ||
                tenant.features.includes(href.slice(1)),
            )
            .map(([href, label]) => (
              <NavLink key={href} to={href}>
                {label}
                <ChevronRight size={13} />
              </NavLink>
            ))}
        </nav>
        <button
          type="button"
          className="p-text-button"
          onClick={() => window.dispatchEvent(new Event('plinth-guide-open'))}
        >
          <HelpCircle size={16} />
          Help & tour
        </button>
        <button
          type="button"
          className="p-text-button"
          onClick={async () => {
            try {
              await signOut();
            } catch (e) {
              toast(e.message, 'error');
            }
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
        <small>Built on Plinth</small>
      </aside>
      <div className="p-workspace">
        <header className="p-workspace-bar">
          <button
            type="button"
            className="p-mobile-menu p-icon-button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Menu size={20} />
          </button>
          <span>
            {tenant.name}
            <ChevronRight size={14} />
            {links.find((x) => x[0] === location.pathname)?.[1] || 'Workspace'}
          </span>
          <ThemeButton />
        </header>
        <main className="p-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export function PrivacyPage() {
  const { tenant } = usePlatform();
  return (
    <>
      <SimpleHeader />
      <main className="p-legal">
        <p className="p-caption">Privacy and consent</p>
        <h1>You can see what is shared.</h1>
        <p>
          {tenant?.name || 'Each organisation'} controls its accounts and
          records. Ask your administrator for the organisation’s privacy notice,
          contact and lawful basis. Plinth does not sell your information or
          offer paid feature tiers.
        </p>
        <h2>Institute accounts</h2>
        <p>
          A teacher creates student accounts. No public student sign-up or photo
          uploads are offered. Exam rules and screen-sharing consent appear
          before an exam. Profiles include a data download and deletion request
          that a teacher reviews.
        </p>
        <h2>Workplace sharing</h2>
        <p>
          Monitoring is off until an administrator sets work hours and accepts
          the notice. Each employee must accept the current notice. Screen
          sharing and active app names can be shared during those hours. Webcam
          sharing is optional and off by default. Pause or stop at any time;
          withdrawal stops sharing. Flags require human review and are not proof
          of misconduct.
        </p>
        <p>
          With recording consent, Workplace holds a short rolling screen buffer
          in memory and uploads clips only around a flag. Clips expire after the
          site’s retention period, at most 30 days. Channel files are available
          only to channel members through short-lived authenticated links.
        </p>
        <h2>Your choices</h2>
        <p>
          Employees can view their own attendance and flags. Administrators can
          export or delete organisation data. Organisations must provide clear
          notice and meet applicable privacy and employment law; accepting a
          screen-sharing prompt does not by itself establish a lawful basis.
        </p>
        <Link to="/">Return home</Link>
      </main>
    </>
  );
}
