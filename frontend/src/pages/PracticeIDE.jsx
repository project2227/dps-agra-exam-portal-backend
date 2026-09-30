import { useEffect, useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { Lightbulb, RotateCcw } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import StudentHeader from '../components/layout/StudentHeader'
import Footer from '../components/layout/Footer'
import CodeEditorPanel from '../components/ide/CodeEditorPanel'
import useAutoSave, { loadBackup } from '../hooks/useAutoSave'
import { getStudentSession } from '../services/session'
import { CLASS_LANGUAGES, LANGUAGES } from '../config'
import { cx } from '../utils/format'

const TASKS = {
  blocks: ['Draw a square using a repeat block.', 'Draw a triangle (turn 120 degrees each time).', 'Change pen colour on every side.'],
  web: ['Make a table of your weekly timetable.', 'Style a button that changes colour on hover.', 'Show an alert with your name when a button is clicked.'],
  python: ['Read a number and print whether it is even or odd.', 'Print the first 10 terms of the Fibonacci series.', 'Count the words in a line of text.'],
  java: ['Print the factorial of a number using a loop.', 'Reverse a string entered by the user.', 'Find the largest of three numbers.'],
  c: ['Swap two numbers without a third variable.', 'Print a star pyramid of n rows.', 'Check whether a number is prime.'],
  cpp: ['Find the sum of array elements.', 'Write a function to check a palindrome.', 'Use a class to store and display student marks.'],
  sql: ['Create a table STUDENT with roll, name and marks.', 'Show students with marks above 75, highest first.', 'Find the average marks using AVG().'],
}

export default function PracticeIDE() {
  const { lang } = useParams()
  const session = getStudentSession()
  const classLangs = CLASS_LANGUAGES[session?.student?.class]
  const order = classLangs ? [...classLangs, ...Object.keys(LANGUAGES).filter((l) => !classLangs.includes(l))] : Object.keys(LANGUAGES)
  const current = lang || order.find((l) => l !== 'blocks') || 'python'
  const storageKey = `dps-practice:${current}`
  const [answer, setAnswer] = useState(() => loadBackup(storageKey))

  useEffect(() => { setAnswer(loadBackup(storageKey)) }, [storageKey])
  const { status, lastSavedAt } = useAutoSave({ data: answer, save: async () => {}, storageKey, delay: 600 })

  if (lang && !LANGUAGES[lang]) return <Navigate to="/student/practice" replace />

  return (
    <div className="flex min-h-screen flex-col">
      {session ? <StudentHeader title="Practice IDE" /> : <Navbar />}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Practice IDE</h1>
            <p className="mt-1 text-slate-400">Write and run code before the exam. Your work is saved on this computer only.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAnswer(null)}><RotateCcw size={14} aria-hidden="true" /> Reset to starter code</button>
        </div>

        <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Languages">
          {order.map((l) => (
            <NavLink key={l} to={`/student/practice/${l}`}
              className={() => cx('rounded-xl border px-3.5 py-2 text-sm font-medium transition', l === current ? 'border-dps-green/50 bg-dps-green/15 text-white' : 'border-white/10 text-slate-400 hover:text-white')}>
              {LANGUAGES[l].label}
              {classLangs?.includes(l) && <span className="ml-1.5 text-[10px] text-dps-gold">your class</span>}
            </NavLink>
          ))}
        </nav>

        <div className="grid gap-5 xl:grid-cols-[1fr,280px]">
          <CodeEditorPanel
            key={current}
            answer={answer}
            onAnswerChange={setAnswer}
            languages={[current]}
            allowRun
            allowSubmit={false}
            saveStatus={status === 'saving' ? 'saved' : status}
            lastSavedAt={lastSavedAt}
            runContext={{ questionId: 'practice' }}
            height={460}
          />
          <aside className="glass h-fit p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Lightbulb size={16} className="text-dps-gold" aria-hidden="true" /> Try these</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300 marker:text-slate-500">
              {TASKS[current].map((t) => <li key={t}>{t}</li>)}
            </ol>
            <p className="mt-4 text-xs text-slate-500">{LANGUAGES[current].long}. {current === 'web' ? 'The preview updates when you press Refresh preview.' : current === 'blocks' ? 'Drag blocks and press Run on the stage.' : 'Type input in the Input tab, then press Run code.'}</p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}
