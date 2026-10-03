import { API_BASE_URL, PLINTH } from '../config';
import { getStudentAccount } from '../services/session';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ExamCrest from '../components/common/ExamCrest';
import { useAccount } from '../components/common/AccountBootstrap';
import { accountApi, refreshAccount } from '../services/accountApi';
import { Field } from '../components/common/Field';
import Button from '../components/common/Button';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { ErrorNote } from '../components/common/Feedback';
import { useToast } from '../components/common/Toast';
import { updateAccount } from '../services/session';
export default function StudentAccountLogin({ mode = 'login' }) {
  const toast = useToast();
  const auth = useAccount(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  if (mode === 'login' && auth.student)
    return (
      <Navigate
        to={
          auth.student.mustChangePassword
            ? '/student/set-password'
            : '/student/profile'
        }
        replace
      />
    );
  if (mode === 'set' && auth.ready && !auth.student)
    return <Navigate to="/student/login" replace />;
  const newPassword = mode === 'set' || mode === 'reset',
    title = newPassword
      ? 'Set your new password'
      : mode === 'forgot'
        ? 'Password help'
        : 'Student sign in';
  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword && password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const result = await accountApi('/student/login', {
          method: 'POST',
          body: { username, password, remember },
        });
        updateAccount({ ...result, teacher: null, ready: true });
        await refreshAccount();
        if (!getStudentAccount())
          throw new Error(
            PLINTH.enabled
              ? 'Your browser could not keep the session. Allow cookies for this site, then try again.'
              : 'Your browser could not keep the session. Use the secure sign-in link below.',
          );
        toast('Signed in. Opening your account.');
        navigate(
          result.student.mustChangePassword
            ? '/student/set-password'
            : '/student/profile',
          { replace: true },
        );
      } else if (mode === 'forgot') {
        const result = await accountApi('/student/forgot-password', {
          method: 'POST',
          body: { username },
        });
        setMessage(result.message);
      } else {
        await accountApi(
          mode === 'set' ? '/student/set-password' : '/student/reset-password',
          {
            method: 'POST',
            body: {
              newPassword: password,
              ...(mode === 'reset' ? { token: params.get('token') || '' } : {}),
            },
          },
        );
        setPassword('');
        setConfirm('');
        await refreshAccount();
        navigate(mode === 'set' ? '/student/profile' : '/student/login', {
          replace: true,
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="account-login mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <section className="account-intro">
          <ExamCrest size={96} />
          <h2 className="mt-6 text-3xl font-semibold">Your school account</h2>
          <p className="mt-4 max-w-sm text-muted">
            Your exams, released results and learning progress in one place.
          </p>
          <p className="mt-4 max-w-sm text-sm text-muted">
            Your teacher provides your admission number and first password. Ask
            them if you need an account.
          </p>
        </section>
        <form
          onSubmit={submit}
          className="glass account-form space-y-5 p-6 sm:p-8"
        >
          <div>
            <Breadcrumbs />
            <div className="flex items-center gap-3">
              <KeyRound className="text-dps-green" size={24} />
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
            <p className="mt-2 text-sm text-muted">
              {newPassword
                ? 'Choose a password only you know. Use 12–72 characters. Avoid your name and admission number.'
                : mode === 'forgot'
                  ? 'Ask your teacher to reset your password. If your school email is on file, you can also request a reset link.'
                  : 'Use the account your teacher gave you.'}
            </p>
          </div>
          {!newPassword && (
            <Field
              label="Username (admission number)"
              required
              hint="Your teacher gives you this username."
            >
              {(a) => (
                <input
                  {...a}
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={40}
                  required
                />
              )}
            </Field>
          )}
          {mode !== 'forgot' && (
            <>
              <Field
                label={newPassword ? 'New password' : 'Password'}
                required
                hint={newPassword ? 'Use at least 12 characters.' : undefined}
              >
                {(a) => (
                  <div className="relative">
                    <input
                      {...a}
                      className="input pr-12"
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        newPassword ? 'new-password' : 'current-password'
                      }
                      minLength={newPassword ? 12 : 1}
                      maxLength={72}
                      required
                    />
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2"
                      type="button"
                      aria-label={show ? 'Hide password' : 'Show password'}
                      aria-pressed={show}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}
              </Field>
              {newPassword && (
                <Field
                  label="Confirm new password"
                  required
                  error={
                    confirm && password !== confirm
                      ? 'The passwords do not match.'
                      : undefined
                  }
                >
                  {(a) => (
                    <input
                      {...a}
                      className="input"
                      type={show ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={72}
                      required
                    />
                  )}
                </Field>
              )}
              {mode === 'login' && (
                <label className="flex items-start gap-3 text-sm">
                  <input
                    className="mt-1 accent-dps-green"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>
                    Keep me signed in on this device
                    <br />
                    <small className="text-muted">
                      Use this only on your own device, never a shared lab
                      computer.
                    </small>
                  </span>
                </label>
              )}
            </>
          )}
          <ErrorNote message={error} />
          {message && (
            <p
              className="rounded-xl border border-dps-green/30 p-4 text-sm"
              role="status"
            >
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? 'Please wait…'
              : newPassword
                ? 'Save new password'
                : mode === 'forgot'
                  ? 'Send reset link to school email'
                  : 'Sign in'}
          </Button>
          {mode === 'login' && (
            <p className="text-sm text-muted">
              Ask your teacher to reset your password.
            </p>
          )}
          {!PLINTH.enabled && API_BASE_URL && (
            <a
              className="block text-sm text-dps-green hover:underline"
              href={API_BASE_URL + '/#/student/login'}
            >
              Open secure sign-in directly
            </a>
          )}
          <div className="flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
            {mode === 'login' ? (
              <Link
                className="text-dps-green hover:underline"
                to="/student/forgot-password"
              >
                Forgot password?
              </Link>
            ) : (
              <Link
                className="text-dps-green hover:underline"
                to="/student/login"
              >
                Back to sign in
              </Link>
            )}
            <Link className="text-dps-green hover:underline" to="/student/join">
              Join an exam
            </Link>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
