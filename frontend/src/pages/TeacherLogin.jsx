import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import DPSLogoAnimated from '../components/common/DPSLogoAnimated'
import Modal from '../components/common/Modal'
import { Field } from '../components/common/Field'
import api from '../services/api'
import { getTeacherToken, setTeacherAuth } from '../services/session'
import { DEMO_MODE, SCHOOL } from '../config'
import { DEMO_TEACHER } from '../services/mockData'

export default function TeacherLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetState, setResetState] = useState('idle')

  if (getTeacherToken()) return <Navigate to="/teacher/dashboard" replace />

  const submit = async (e) => {
    e.preventDefault()
    const fe = {}
    if (!form.email.trim()) fe.email = 'Enter your school email or username.'
    if (!form.password) fe.password = 'Enter your password.'
    setFieldErrors(fe)
    if (Object.keys(fe).length) return
    setBusy(true); setError('')
    try {
      const res = await api.teacherLogin({ email: form.email.trim(), password: form.password, remember })
      setTeacherAuth({ token: res.token, teacher: res.teacher, at: new Date().toISOString() })
      navigate(location.state?.from || '/teacher/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  const sendReset = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setResetState('sending')
    try { await api.requestPasswordReset(resetEmail.trim()); setResetState('sent') } catch { setResetState('error') }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="grid flex-1 place-items-center px-4 py-12">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div className="hidden flex-col items-center text-center lg:flex">
            <DPSLogoAnimated size={260} />
            <h2 className="mt-6 font-display text-2xl font-semibold">Teacher console</h2>
            <p className="mt-2 max-w-sm text-slate-400">Host exams, watch the lab live, review programs and share handouts for your classes.</p>
          </div>

          <form onSubmit={submit} noValidate className="gradient-border rounded-2xl">
            <div className="glass-strong p-7 sm:p-8">
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <DPSLogoAnimated size={56} small interactive={false} label="" />
                <span className="font-display font-semibold">{SCHOOL.portal}</span>
              </div>
              <h1 className="font-display text-2xl font-semibold">Teacher sign in</h1>
              <p className="mt-1 text-sm text-slate-400">Use the account issued by the Computer Science department.</p>

              <div className="mt-6 space-y-4">
                <Field label="Email or username" required error={fieldErrors.email}>
                  {(p) => (
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                      <input {...p} className="input pl-9" type="text" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@dpsagra.edu.in" />
                    </div>
                  )}
                </Field>
                <Field label="Password" required error={fieldErrors.password}>
                  {(p) => (
                    <div className="relative">
                      <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                      <input {...p} className="input px-9" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white" aria-label={show ? 'Hide password' : 'Show password'}>
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}
                </Field>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input type="checkbox" className="h-4 w-4 accent-dps-green" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in
                  </label>
                  <button type="button" className="text-dps-neon hover:underline" onClick={() => { setResetOpen(true); setResetEmail(form.email); setResetState('idle') }}>Forgot password?</button>
                </div>
              </div>

              {error && (
                <p className="mt-4 flex gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100" role="alert">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
                </p>
              )}

              <button type="submit" className="btn btn-primary btn-lg mt-6 w-full" disabled={busy}>
                {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />} Sign in
              </button>

              {DEMO_MODE && (
                <div className="mt-5 rounded-xl border border-dps-gold/30 bg-dps-gold/[0.06] p-3 text-xs text-slate-300">
                  <p className="font-semibold text-dps-gold">Demo mode</p>
                  <p className="mt-1">No backend is configured, so sample data is used. Sign in with <span className="kbd">{DEMO_TEACHER.email}</span> and <span className="kbd">{DEMO_TEACHER.password}</span>.</p>
                  <button type="button" className="mt-2 text-dps-neon hover:underline" onClick={() => setForm({ ...DEMO_TEACHER })}>Fill demo credentials</button>
                </div>
              )}
              <p className="mt-5 text-center text-xs text-slate-500">Student? <Link to="/student/join" className="text-dps-neon hover:underline">Join an exam instead</Link></p>
            </div>
          </form>
        </div>
      </main>
      <Footer />

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset your password" size="sm">
        {resetState === 'sent' ? (
          <p className="text-sm text-slate-300">If an account exists for <strong className="text-white">{resetEmail}</strong>, a reset link has been sent. You can also ask the portal administrator to reset it for you.</p>
        ) : (
          <form onSubmit={sendReset} className="space-y-4">
            <p className="text-sm text-slate-400">Enter your school email. We will send a link to set a new password.</p>
            <Field label="School email">
              {(p) => <input {...p} type="email" className="input" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" />}
            </Field>
            {resetState === 'error' && <p className="error-text" role="alert">Could not send the link right now. Try again later or contact the administrator.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setResetOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={resetState === 'sending'}>{resetState === 'sending' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Send reset link</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
