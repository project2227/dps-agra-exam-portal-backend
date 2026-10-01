import { Link } from 'react-router-dom'
import {
  BadgeCheck, CalendarDays, Camera, CheckCircle2, Code2, Eye, FileText, GraduationCap, KeyRound, Laptop, LayoutGrid, BookOpen, Gamepad2,
  LogIn, MonitorPlay, ShieldCheck, Sparkles, TerminalSquare, UserRound, ArrowUpRight, Gamepad2 as Games,
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
  { icon: MonitorPlay, title: 'Live Proctored Exams', text: 'One screen shows every student: answer progress, consented media previews and reviewable browser-activity signals.' },
  { icon: BadgeCheck, title: 'Auto Program Checking', text: 'Optional isolated program checking for teacher exams. Requires an independently configured runner; no unsafe execution on the main backend.' },
]

const STEPS = [
  { icon: KeyRound, title: 'Teacher hosts', text: 'Creates the exam, picks the class and section, and shares a one-time password in the lab.' },
  { icon: UserRound, title: 'Student joins', text: 'No accounts needed. Enter name, roll number, class, section and the exam password.' },
  { icon: Code2, title: 'Exam runs', text: 'Answers and code save automatically. Local Python previews are free; isolated grading is optional and teachers can review saved submissions.' },
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
    ['ok', 'Source     answer saved successfully'],
    ['gold', 'Review     feedback after grading'],
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
        <section className="motion-surface relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] lg:pt-20">
          <div className="min-w-0 animate-fade-up">
            <p className="chip mb-5 border-dps-green/30 text-dps-neon"><Sparkles size={12} aria-hidden="true" /> {SCHOOL.name} | {SCHOOL.department}</p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Learn. Create. <span className="text-gradient">Make it count.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              <span className="font-semibold text-dps-gold">To stop cheats for a brighter future.</span><br/>A new home for fair exams, creative coding and your next big idea.
            </p>
            <div data-tour="hero-actions" className="mt-8 flex flex-wrap gap-3">
              <Link to="/student/join" className="btn btn-primary btn-lg"><GraduationCap size={18} aria-hidden="true" /> Student Login / Join Exam</Link>
              <Link to="/teacher/login" className="btn btn-ghost btn-lg"><LogIn size={18} aria-hidden="true" /> Teacher Login</Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Try <Link to="/learn" className="text-dps-neon hover:underline">7 free coding courses & PDFs</Link>, <Link to="/learn/games" className="text-dps-neon hover:underline">mini games</Link> or the <Link to="/learn/mock-exam" className="text-dps-neon hover:underline">Class IX mock exam</Link>. No school login needed. Want to practise first? Open the <Link to="/student/practice" className="text-dps-neon underline-offset-4 hover:underline">practice IDE</Link>. No sign-in needed.
            </p>
            <p className="mt-4 text-xs text-slate-500">Independent student-built learning platform; not an officially affiliated school website. <a href="https://dps.ac.in/" target="_blank" rel="noopener noreferrer" className="text-dps-neon hover:underline">Go to the official school website ↗</a></p>
          </div>
          <div className="flex min-w-0 flex-col items-center gap-8">
            <DPSLogoAnimated size={300} />
            <div className="w-full min-w-0 max-w-md"><TerminalCard /></div>
          </div>
        </section>


        {/* Original AI-generated art: decorative only, no school crest or game IP */}
        <section className="mx-auto max-w-7xl px-4 pb-5 sm:px-6" aria-label="Discover your learning universe">
          <div className="motion-surface group relative isolate min-h-[350px] overflow-hidden rounded-[30px] border border-dps-green/30 bg-navy-900 shadow-[0_22px_90px_-35px_rgba(16,185,129,.45)] sm:min-h-[410px]">
            <img
              src="/ai-learning-hero.webp"
              alt="AI-generated illustration of a futuristic coding studio with holographic code, glowing learning tools, and a robot overlooking a city at night"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-[64%_center] transition duration-700 motion-safe:group-hover:scale-[1.035]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#051222]/95 via-[#051222]/80 to-[#051222]/15 sm:via-[#051222]/55" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#051222]/70 via-transparent to-transparent" aria-hidden="true" />
            <div className="relative z-10 flex min-h-[350px] max-w-xl flex-col justify-end p-7 sm:min-h-[410px] sm:justify-center sm:p-12">
              <p className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[.24em] text-emerald-300"><Sparkles size={15} aria-hidden="true" /> Beyond the classroom</p>
              <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">Step into your next <span className="text-gradient">big idea.</span></h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-200 sm:text-base">Write code, create your own challenges and learn through hands-on games. The best ideas start with a little curiosity.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/learn" className="btn btn-primary"><BookOpen size={17} aria-hidden="true" /> Explore courses</Link>
                <Link to="/learn/arcade" className="btn btn-ghost border-white/25 bg-black/25"><Games size={17} aria-hidden="true" /> Play the arcade</Link>
              </div>
              <span className="mt-4 text-[10px] text-slate-400">Original AI-generated concept artwork</span>
            </div>
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


        {/* Optional third-party destination. It is not part of DPS Lab. */}
        <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6" aria-label="Fun break">
          <div className="motion-surface flex flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-400/[.075] via-transparent to-emerald-400/[.065] p-5 sm:flex-row sm:items-center sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300"><Games size={24} aria-hidden="true" /></span>
              <div>
                <h2 className="font-display text-lg font-bold text-white">Take a brain break in the Logic Arcade.</h2>
                <p className="mt-1 max-w-xl text-sm text-slate-300">Take a break without leaving DPS Lab. Explore interactive logic circuits, memory challenges and code-building games designed to sharpen your skills.</p>
              </div>
            </div>
            <Link to="/learn/arcade" className="btn btn-ghost shrink-0 border-amber-400/40 text-amber-100" aria-label="Open the Logic Arcade on DPS Lab">Play Logic Arcade <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </section>

        {/* About */}
        <section id="about" className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6" aria-labelledby="about-title">
          <div className="grid items-center gap-8 md:grid-cols-[auto,1fr]">
            <DPSLogoAnimated size={140} small label="" />
            <div>
              <h2 id="about-title" className="font-display text-2xl font-semibold">About this portal</h2>
              <p className="mt-2 max-w-3xl text-slate-400">
                This independent learning platform was designed and developed by <span className="credit-name text-gradient">Aryan Agarwal</span> for
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
