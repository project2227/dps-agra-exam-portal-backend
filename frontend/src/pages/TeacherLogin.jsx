import { disconnectSocket } from '../services/socket'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import DPSLogoAnimated from '../components/common/DPSLogoAnimated'
import { Field } from '../components/common/Field'
import api from '../services/api'
import { getTeacherAuth, setTeacherAuth } from '../services/session'
import { API_BASE_URL, DEMO_MODE, SCHOOL } from '../config'
import { DEMO_TEACHER } from '../services/mockData'
import { isValidTeacherEmail } from '../utils/teacherEmail'

export default function TeacherLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  if (getTeacherAuth()) return <Navigate to="/teacher/dashboard" replace />

  const submit = async (e) => {
    e.preventDefault()
    const fe = {}
    const email = form.email.trim().toLowerCase()
    if (!email) fe.email = 'Enter the registered email address for your teacher account.'
    else if (!isValidTeacherEmail(email)) fe.email = 'Enter a valid email address including the @ symbol (not a period).'
    if (!form.password) fe.password = 'Enter your password.'
    setFieldErrors(fe)
    if (Object.keys(fe).length) return
    setBusy(true); setError('')
    try {
      const res = await api.teacherLogin({ email, password: form.password, remember })
      disconnectSocket()
      setTeacherAuth(res)
      navigate(location.state?.from || '/teacher/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }


  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="grid flex-1 place-items-center px-4 py-12">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div className="hidden flex-col items-center text-center lg:flex">
            <DPSLogoAnimated size={120} />
            <h2 className="mt-6 font-display text-2xl font-semibold">Teacher workspace</h2>
            <p className="mt-2 max-w-sm text-slate-400">Create an exam, follow class progress, and review submitted work.</p>
          </div>

          <form onSubmit={submit} noValidate className="gradient-border rounded-2xl">
            <div className="glass-strong p-7 sm:p-8">
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <DPSLogoAnimated size={56} small interactive={false} label="" />
                <span className="font-display font-semibold">{SCHOOL.portal}</span>
              </div>
              <h1 className="font-display text-2xl font-semibold">Teacher sign in</h1>
              <p className="mt-1 text-sm text-slate-400">Use your authorised teacher account. Need access? Send a request below.</p>

              <div className="mt-6 space-y-4">
                <Field label="Registered email" required error={fieldErrors.email}>
                  {(p) => (
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                      <input {...p} className="input pl-9" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors(x => ({...x,email:''})) }} onBlur={() => { if (form.email && !isValidTeacherEmail(form.email.trim())) setFieldErrors(x => ({...x,email:'Enter a valid email address with an @ symbol.'})) }} placeholder="name@dpsagra.edu.in" />
                    </div>
                  )}
                </Field>
                <Field label="Password" required error={fieldErrors.password}>
                  {(p) => (
                    <div className="relative">
                      <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                      <input {...p} className="input px-9" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors(x => ({...x,password:''})) }} />
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
                  <span className="text-right text-xs text-slate-400">Password help: contact the portal administrator.</span>
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
              {API_BASE_URL && <a className="mt-4 block text-sm text-dps-green hover:underline" href={API_BASE_URL+'/#/teacher/login'}>Open secure sign-in directly</a>}
              <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-center text-sm">
                <p>Teacher or invited staff tester? <Link to="/teacher/request-access" className="font-semibold text-dps-neon hover:underline">Request teacher access</Link></p>
                <p className="text-xs text-slate-400">Requests are manually reviewed; they do not provide instant staff access.</p>
                <p className="text-xs text-slate-400">Student? <Link to="/learn" className="text-dps-neon hover:underline">Open the Learning Hub</Link></p>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />

    </div>
  )
}
