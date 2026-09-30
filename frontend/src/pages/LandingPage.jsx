import { Link } from 'react-router-dom'
import {
  BadgeCheck, CalendarDays, Camera, CheckCircle2, Code2, Eye, FileText, GraduationCap, KeyRound, Laptop, LayoutGrid, BookOpen, Gamepad2,
  LogIn, MonitorPlay, ShieldCheck, Sparkles, TerminalSquare, UserRound,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import DPSLogoAnimated from '../components/common/DPSLogoAnimated'
import GlassCard from '../components/common/GlassCard'
import { SCHOOL } from '../config'

const FEATURES = [
  { icon: LayoutGrid, title: 'Class-wise Computer Exams', text: 'Quizzes and practicals for Classes VI to XII, targeted to a whole class or a single section, with one computer teacher per class.' },
  { icon: TerminalSquare, title: 'Built-in Programming IDEs', text: 'A browser code editor for seven languages. Python and SQL execute free on-device; the web preview and blocks work without an exam token. Other compilers require an isolated runner.' },
  { icon: CalendarDays, title: 'Handouts & Exam Dates', text: 'Teachers share notes, slides and practical file formats class-wise. Students always see what is coming up next.' },
  { icon: MonitorPlay, title: 'Live Proctored Exams', text: 'One screen shows every student: progress, live typing, webcam and screen previews, and integrity flags as they happen.' },
  { icon: BadgeCheck, title: 'Auto Program Checking', text: 'Optional isolated program checking for teacher exams. Requires an independently configured runner; no unsafe execution on the main backend.' },
]

const STEPS = [
  { icon: KeyRound, title: 'Teacher hosts', text: 'Creates the exam, picks the class and section, and shares a one-time password in the lab.' },
  { icon: UserRound, title: 'Student joins', text: 'No accounts needed. Enter name, roll number, class, section and the exam password.' },
  { icon: Code2, title: 'Exam runs', text: 'Answers and code save automatically. Programs are checked instantly against test cases.' },
  { icon: CheckCircle2, title: 'Teacher reviews', text: 'Scores, test results, flags and remarks in one place, exportable as CSV or PDF.' },
]

const TRANSPARENCY = [
  { icon: Eye, text: 'A monitoring indicator is visible on the student screen for the entire exam.' },
  { icon: Camera, text: 'Webcam and screen are shared only after the browser asks and the student allows it.' },
  { icon: ShieldCheck, text: 'Every flag is shown to the student when it happens, and reviewed by a teacher before any decision.' },
  { icon: Laptop, text: 'Sharing stops the moment the exam is submitted. Nothing runs in the background afterwards.' },
]

function TerminalCard() {
  const lines = [
    ['muted', '$ python3 practical.py < tests/'],
    ['ok', 'Sample 1   Hello World   -> 3   passed'],
    ['ok', 'Sample 2   DPS Agra      -> 2   passed'],
    ['ok', 'Hidden     3 of 3 checks        passed'],
    ['gold', 'Score      8 / 8 marks   auto-checked'],
  ]
  const color = { muted: 'text-slate-500', ok: 'text-dps-neon', gold: 'text-dps-gold' }
  return (
    <div className="gradient-border rounded-2xl">
      <div className="overflow-hidden rounded-2xl bg-navy-900/90">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-dps-gold/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-dps-neon/80" />
          <span className="ml-2 font-mono text-xs text-slate-400">practical.py | Class XII-A</span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-6 text-slate-200">
          <code>
            <span className="text-sky-300">def</span> <span className="text-dps-gold">count_vowels</span>(s):{'\n'}
            {'    '}<span className="text-sky-300">return</span> sum(<span className="text-dps-orange">1</span> <span className="text-sky-300">for</span> c <span className="text-sky-300">in</span> s.lower() <span className="text-sky-300">if</span> c <span className="text-sky-300">in</span> <span className="text-green-300">"aeiou"</span>){'\n\n'}
            print(count_vowels(input())){'\n'}
          </code>
        </pre>
        <div className="border-t border-white/[0.06] bg-navy-950/70 p-4 font-mono text-[12px] leading-6">
          {lines.map(([c, t], i) => (
            <div key={t} className={color[c]}>
              <span className="type-line" style={{ animationDelay: `${0.5 + i * 0.55}s`, whiteSpace: 'pre' }}>{t}</span>
            </div>
          ))}
          <span className="type-caret text-slate-500" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] lg:pt-20">
          <div className="animate-fade-up">
            <p className="chip mb-5 border-dps-green/30 text-dps-neon"><Sparkles size={12} aria-hidden="true" /> {SCHOOL.name} | {SCHOOL.department}</p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              DPS Agra <span className="text-gradient">Exam Portal</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              Computer Practical Exams, Quizzes, IDE Practice, Handouts &amp; Exam Scheduling
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/student/join" className="btn btn-primary btn-lg"><GraduationCap size={18} aria-hidden="true" /> Student Login / Join Exam</Link>
              <Link to="/teacher/login" className="btn btn-ghost btn-lg"><LogIn size={18} aria-hidden="true" /> Teacher Login</Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Try <Link to="/learn" className="text-dps-neon hover:underline">7 free coding courses & PDFs</Link>, <Link to="/learn/games" className="text-dps-neon hover:underline">mini games</Link> or the <Link to="/learn/mock-exam" className="text-dps-neon hover:underline">Class IX mock exam</Link>. No school login needed. Want to practise first? Open the <Link to="/student/practice" className="text-dps-neon underline-offset-4 hover:underline">practice IDE</Link>. No sign-in needed.
            </p>
            <p className="mt-4 text-xs text-slate-500">Independent student prototype. Not an official DPS Agra platform. <a href="https://dps.ac.in/" target="_blank" rel="noopener noreferrer" className="text-dps-neon hover:underline">Go to the official school website ↗</a></p>
          </div>
          <div className="flex flex-col items-center gap-8">
            <DPSLogoAnimated size={300} />
            <div className="w-full max-w-md"><TerminalCard /></div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="features-title">
          <div className="mb-10 max-w-2xl">
            <h2 id="features-title" className="font-display text-3xl font-semibold sm:text-4xl">Everything the computer lab needs</h2>
            <p className="mt-3 text-slate-400">Built for how practical exams actually run at school: a teacher, a lab full of computers and a fixed period.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <GlassCard key={title} hoverGlow className="gradient-border-hover p-6 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-dps-green/30 bg-dps-green/10 text-dps-neon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
              </GlassCard>
            ))}
            <GlassCard className="flex flex-col justify-between gap-4 border-dps-orange/30 bg-dps-orange/[0.06] p-6">
              <div>
                <h3 className="text-lg font-semibold">Exam today?</h3>
                <p className="mt-2 text-sm text-slate-300">Ask your teacher for the exam password, then join with your roll number.</p>
              </div>
              <Link to="/student/join" className="btn btn-accent self-start">Join exam</Link>
            </GlassCard>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="how-title">
          <h2 id="how-title" className="mb-10 font-display text-3xl font-semibold sm:text-4xl">How an exam runs</h2>
          <ol className="grid gap-4 md:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="glass relative p-5">
                <span className="absolute right-4 top-4 font-display text-4xl font-bold text-white/[0.06]" aria-hidden="true">0{i + 1}</span>
                <Icon size={22} className="text-dps-gold" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Transparency */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="fair-title">
          <GlassCard glow className="grid gap-8 p-8 lg:grid-cols-[0.9fr,1.1fr] lg:p-10">
            <div>
              <h2 id="fair-title" className="font-display text-3xl font-semibold">Monitored, never hidden</h2>
              <p className="mt-3 text-slate-400">
                Proctoring exists to keep exams fair for every student. The portal is designed so students always know what is shared and when.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {TRANSPARENCY.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
                  <Icon size={18} className="mt-0.5 shrink-0 text-dps-neon" aria-hidden="true" /> {text}
                </li>
              ))}
            </ul>
          </GlassCard>
        </section>

        {/* About */}
        <section id="about" className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6" aria-labelledby="about-title">
          <div className="grid items-center gap-8 md:grid-cols-[auto,1fr]">
            <DPSLogoAnimated size={140} small label="" />
            <div>
              <h2 id="about-title" className="font-display text-2xl font-semibold">About this portal</h2>
              <p className="mt-2 max-w-3xl text-slate-400">
                This independent student prototype was designed and developed by <span className="credit-name text-gradient">Aryan Agarwal</span> for
                exploring computer science in Class IX. It is not an officially approved service of {SCHOOL.name}.
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><FileText size={14} aria-hidden="true" /> {SCHOOL.motto}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
