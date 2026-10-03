import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  ImagePlus,
  LoaderCircle,
  Mail,
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { MarketingNav } from './Marketing';
import { ProductPreview } from './ProductUI';
import { presets, foreground } from './theme';
import { request } from './api';
const STEPS = [
  'Your path',
  'Your organisation',
  'Your logo',
  'Your theme',
  'Your account',
  'Verify email',
];
export default function Wizard() {
  const [search] = useSearchParams(),
    [step, setStep] = useState(0),
    [v, setV] = useState({
      path: search.get('path') === 'workplace' ? 'workplace' : 'institute',
      name: '',
      slug: '',
      theme: { preset: search.get('path') === 'workplace' ? 'mint' : 'chalk' },
      adminName: '',
      email: '',
      password: '',
    }),
    [logo, setLogo] = useState(null),
    [logoUrl, setLogoUrl] = useState(''),
    [available, setAvailable] = useState(null),
    [checking, setChecking] = useState(false),
    [config, setConfig] = useState(null),
    [errors, setErrors] = useState({}),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState(''),
    [show, setShow] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    request('/api/platform/config', { signal: c.signal })
      .then(setConfig)
      .catch((e) => e.name !== 'AbortError' && setProblem(e.message));
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!v.slug) {
      setAvailable(null);
      return;
    }
    const c = new AbortController();
    setChecking(true);
    const timer = setTimeout(
      () =>
        request(
          '/api/platform/availability?slug=' + encodeURIComponent(v.slug),
          { signal: c.signal },
        )
          .then(setAvailable)
          .catch(
            (e) =>
              e.name !== 'AbortError' &&
              setAvailable({ available: false, reason: e.message }),
          )
          .finally(() => setChecking(false)),
      350,
    );
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [v.slug]);
  useEffect(() => () => logoUrl && URL.revokeObjectURL(logoUrl), [logoUrl]);
  const change = (key, value) => {
    setV((old) => ({ ...old, [key]: value }));
    setErrors((old) => ({ ...old, [key]: '' }));
    setProblem('');
  };
  const choosePath = (path) =>
    setV((old) => ({
      ...old,
      path,
      theme: { preset: path === 'institute' ? 'chalk' : 'mint' },
    }));
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (v.name.trim().length < 2) e.name = 'Enter your organisation’s name.';
      if (!available?.available)
        e.slug = available?.reason || 'Choose an available site name.';
    }
    if (step === 4) {
      if (v.adminName.trim().length < 2) e.adminName = 'Enter your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
        e.email = 'Enter an email address you can verify.';
      if (
        v.password.length < 12 ||
        new TextEncoder().encode(v.password).length > 72
      )
        e.password = 'Use 12–72 characters, at most 72 bytes.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const submit = async () => {
    if (!validate()) return;
    if (config?.signupAvailable === false) {
      setProblem(
        'Site creation will open when email verification is connected. Existing organisation sites remain available.',
      );
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const form = new FormData();
      for (const [key, value] of Object.entries(v))
        form.append(
          key,
          typeof value === 'object' ? JSON.stringify(value) : value,
        );
      if (logo) form.append('logo', logo);
      await request('/api/platform/signup', { method: 'POST', body: form });
      setV((old) => ({ ...old, password: '' }));
      setStep(5);
    } catch (e) {
      setProblem(e.message);
    } finally {
      setBusy(false);
    }
  };
  const chooseLogo = (file) => {
    if (!file) return;
    if (
      file.size > 2097152 ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    ) {
      setErrors({ logo: 'Choose a PNG, JPEG or WebP up to 2 MB.' });
      return;
    }
    setLogo(file);
    setLogoUrl(URL.createObjectURL(file));
    setErrors({});
  };
  return (
    <div className="plinth p-wizard-page">
      <MarketingNav />
      <main className="p-wizard-shell">
        <div className="p-wizard-form">
          <Link to="/" className="p-text-link">
            <ArrowLeft size={15} />
            Back to Plinth
          </Link>
          <ol className="p-wizard-steps" aria-label="Site creation steps">
            {STEPS.map((label, i) => (
              <li
                key={label}
                aria-current={step === i ? 'step' : undefined}
                className={step === i ? 'active' : step > i ? 'done' : ''}
              >
                <span>{step > i ? <Check size={11} /> : i + 1}</span>
                <small>{label}</small>
              </li>
            ))}
          </ol>
          <p className="p-caption">{STEPS[step]}</p>
          <h1>
            {
              [
                'Make room for your people.',
                'Give your place a name.',
                'A mark of your own.',
                'Find your kind of colour.',
                'Make the first introduction.',
                'One last step. Your inbox.',
              ][step]
            }
          </h1>
          {step === 0 && (
            <>
              <p>Choose the tools that fit your day. Every feature is free.</p>
              <div className="p-path-options">
                {[
                  [
                    'institute',
                    'Institute',
                    'Schools, colleges, exams and learning',
                    GraduationCap,
                  ],
                  [
                    'workplace',
                    'Workplace',
                    'Teams, tasks, sharing and chat',
                    BriefcaseBusiness,
                  ],
                ].map(([path, title, text, Icon]) => (
                  <button
                    type="button"
                    className={v.path === path ? 'selected' : ''}
                    key={path}
                    onClick={() => choosePath(path)}
                    aria-pressed={v.path === path}
                  >
                    <Icon size={27} />
                    <strong>{title}</strong>
                    <span>{text}</span>
                    {v.path === path && <Check size={17} />}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <Input
                label="Organisation name"
                value={v.name}
                maxLength={120}
                onChange={(e) => {
                  const name = e.target.value;
                  setV((old) => ({
                    ...old,
                    name,
                    ...(!old.slug
                      ? {
                          slug: name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '')
                            .slice(0, 48),
                        }
                      : {}),
                  }));
                  setErrors({});
                }}
                error={errors.name}
                autoComplete="organization"
              />
              <Input
                label="Site name"
                value={v.slug}
                maxLength={48}
                onChange={(e) => change('slug', e.target.value.toLowerCase())}
                error={errors.slug}
                hint={
                  config?.tenantDomain
                    ? v.slug + '.' + config.tenantDomain
                    : 'Your site gets a unique organisation address.'
                }
              />
              <div className="p-availability" role="status">
                {checking ? (
                  <>
                    <LoaderCircle size={15} />
                    Checking availability…
                  </>
                ) : available?.available ? (
                  <>
                    <Check size={15} />
                    This name is available.
                  </>
                ) : (
                  available?.reason || 'Use letters, numbers and hyphens.'
                )}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p>
                Your logo appears on the site, login screen and app icons. We’ll
                crop it to a square and create the sizes your site needs.
              </p>
              <label
                className="p-logo-upload"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  chooseLogo(e.dataTransfer.files[0]);
                }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Your organisation logo preview" />
                ) : (
                  <ImagePlus size={38} />
                )}
                <strong>
                  {logo ? 'Change logo' : 'Choose or drop a logo'}
                </strong>
                <span>PNG, JPEG or WebP · Up to 2 MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Organisation logo"
                  onChange={(e) => chooseLogo(e.target.files[0])}
                />
              </label>
              {errors.logo && (
                <p className="p-error" role="alert">
                  {errors.logo}
                </p>
              )}
              <p className="p-subtle">
                You can use the Plinth mark for now and change it later.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <p>A complete light and dark palette, made to work together.</p>
              <div className="p-theme-options">
                {Object.entries(presets)
                  .filter(([, p]) => p.path === v.path)
                  .map(([key, p]) => (
                    <button
                      type="button"
                      key={key}
                      className={v.theme.preset === key ? 'selected' : ''}
                      aria-pressed={v.theme.preset === key}
                      onClick={() => change('theme', { preset: key })}
                    >
                      <span style={{ background: p.canvas }}>
                        <i style={{ background: p.primary }} />
                        <i style={{ background: p.accent }} />
                      </span>
                      <strong>{p.name}</strong>
                      {v.theme.preset === key && <Check size={14} />}
                    </button>
                  ))}
              </div>
              <div className="p-custom-colours">
                <label>
                  Primary colour
                  <input
                    type="color"
                    value={v.theme.primary || presets[v.theme.preset].primary}
                    onChange={(e) =>
                      change('theme', { ...v.theme, primary: e.target.value })
                    }
                  />
                </label>
                <label>
                  Accent colour
                  <input
                    type="color"
                    value={v.theme.accent || presets[v.theme.preset].accent}
                    onChange={(e) =>
                      change('theme', { ...v.theme, accent: e.target.value })
                    }
                  />
                </label>
              </div>
              <p className="p-subtle">
                <Check size={14} />
                Text colour adjusts to keep AA contrast.
              </p>
            </>
          )}
          {step === 4 && (
            <form
              id="create-account"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <p>
                You’ll be the organisation admin. Students receive accounts from
                teachers; employees join by invitation.
              </p>
              <Input
                label="Your name"
                autoComplete="name"
                value={v.adminName}
                onChange={(e) => change('adminName', e.target.value)}
                error={errors.adminName}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                value={v.email}
                onChange={(e) => change('email', e.target.value)}
                error={errors.email}
              />
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={v.password}
                onChange={(e) => change('password', e.target.value)}
                error={errors.password}
                hint="At least 12 characters. Never shared with your team."
              />
              <label className="p-check-label">
                <input
                  type="checkbox"
                  checked={show}
                  onChange={(e) => setShow(e.target.checked)}
                />
                Show password
              </label>
              <p className="p-subtle">
                Creating a site means accepting the{' '}
                <Link to="/privacy">privacy and responsible-use notice</Link>.
              </p>
            </form>
          )}
          {step === 5 && (
            <div className="p-check-inbox">
              <Mail size={40} />
              <p>
                A verification link was sent to <strong>{v.email}</strong>. Open
                it to build your site automatically.
              </p>
              <p>The link expires in 24 hours. Check your spam folder too.</p>
              <Button
                variant="secondary"
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await request('/api/platform/resend', {
                      method: 'POST',
                      body: { slug: v.slug, email: v.email },
                    });
                    setProblem(r.message);
                  } catch (e) {
                    setProblem(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                Send another link
              </Button>
            </div>
          )}
          {problem && (
            <p className="p-form-notice" role="alert">
              {problem}
            </p>
          )}
          {config?.signupAvailable === false && step < 5 && (
            <p className="p-form-notice">
              New site creation is waiting for email verification to be
              connected. You can explore every step here.
            </p>
          )}
          {step < 5 && (
            <div className="p-wizard-actions">
              <Button
                variant="secondary"
                disabled={step === 0 || busy}
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <Button
                disabled={busy || (step === 1 && checking)}
                type={step === 4 ? 'submit' : 'button'}
                form={step === 4 ? 'create-account' : undefined}
                onClick={
                  step === 4
                    ? undefined
                    : () => validate() && setStep((s) => s + 1)
                }
              >
                {busy
                  ? 'Sending…'
                  : step === 4
                    ? 'Send verification email'
                    : 'Continue'}
                <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
        <aside className="p-wizard-preview">
          <div className="p-preview-label">Your site, taking shape</div>
          <ProductPreview
            path={v.path}
            name={v.name || 'Your organisation'}
            theme={v.theme}
            logo={logoUrl}
          />
          <div className="p-wizard-preview-note">
            <span />
            <span>Preview updates as you choose.</span>
          </div>
        </aside>
      </main>
    </div>
  );
}
export function Verification() {
  const [query] = useSearchParams(),
    token = query.get('token'),
    [info, setInfo] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [v, setV] = useState({ name: '', password: '' }),
    navigate = useNavigate();
  useEffect(() => {
    if (!token) {
      setError('Open the verification link from your email.');
      return;
    }
    request('/api/platform/link?token=' + encodeURIComponent(token))
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [token]);
  const act = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (info.kind === 'invite') {
        const r = await request('/api/platform/accept-invite', {
          method: 'POST',
          body: { token, ...v },
        });
        location.assign(r.siteUrl + '/login');
      } else {
        const r = await request('/api/platform/verify', {
          method: 'POST',
          body: { token },
        });
        navigate('/provisioning/' + r.slug, {
          replace: true,
          state: { entryToken: r.entryToken },
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="plinth">
      <MarketingNav />
      <main className="p-centered-page">
        <Mail size={38} />
        <h1>
          {info?.kind === 'invite'
            ? 'Your invitation to ' + info.name
            : 'Let’s make it yours.'}
        </h1>
        <p>
          {info
            ? info.kind === 'invite'
              ? 'Set your own password to join your organisation.'
              : 'Verify your email to build ' + info.name + '.'
            : 'Checking your link…'}
        </p>
        <form onSubmit={act}>
          {info?.kind === 'invite' && (
            <>
              <Input
                label="Your name"
                value={v.name}
                required
                onChange={(e) => setV({ ...v, name: e.target.value })}
              />
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                hint="At least 12 characters."
                value={v.password}
                onChange={(e) => setV({ ...v, password: e.target.value })}
              />
            </>
          )}
          {info && (
            <Button type="submit" disabled={busy}>
              {busy
                ? 'Working…'
                : info.kind === 'invite'
                  ? 'Set password and join'
                  : 'Verify email and build my site'}
            </Button>
          )}
        </form>
        {error && (
          <p className="p-error" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
