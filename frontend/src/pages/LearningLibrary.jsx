import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpen, Check, Download, ExternalLink, GraduationCap, Search } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { BOOKS, readProgress, STARTER_LESSONS } from '../services/starterCourses'
import { learningApi, getLearningAuth } from '../services/learningApi'

const descriptions = {
  python: 'From your first variable to small functions. Learn to turn a problem into a program, one thoughtful step at a time.',
  web: 'Build a page that feels like you. Explore semantic HTML, expressive CSS and the beginnings of JavaScript interaction.',
  sql: 'Learn to ask questions of data. Explore tables, filter information and put your first useful queries together.',
  java: 'Discover classes, types and object-oriented thinking. Build a clear foundation for structured programs.',
  c: 'Understand the fundamentals a little closer to the machine, from variables and control flow to pointers.',
  cpp: 'Explore modern C++ with strings, vectors, loops and small functions. Learn to organise your ideas into code.',
  blocks: 'Start by seeing the logic. Connect sequences, events and decisions in a friendly visual programming workspace.',
}
const marks = { python:'Py', web:'</>', sql:'{ }', java:'Jv', c:'C', cpp:'C++', blocks:'▧' }
const filters = ['All paths', 'Getting started', 'Build for the web', 'Explore data']

export default function LearningLibrary() {
  const [published,setPublished] = useState([]), [error,setError] = useState('')
  const [progress,setProgress] = useState(readProgress)
  const [query,setQuery] = useState(''), [filter,setFilter] = useState('All paths')
  useEffect(() => { const on = () => setProgress(readProgress()); window.addEventListener('selfstudy-progress',on); return () => window.removeEventListener('selfstudy-progress',on) }, [])
  useEffect(() => { let active = true; learningApi('/courses').then(x => { if(active) setPublished(x.courses || []) }).catch(() => { if(active) setError('Teacher courses are temporarily unavailable. You can still use every free learning path below.') }); return () => { active = false } }, [])
  const cards = useMemo(() => Object.entries(BOOKS).filter(([id,book]) => `${book.name} ${book.tag} ${descriptions[id]}`.toLowerCase().includes(query.trim().toLowerCase()) && (filter === 'All paths' || (filter === 'Getting started' && ['python','blocks','c'].includes(id)) || (filter === 'Build for the web' && id === 'web') || (filter === 'Explore data' && id === 'sql'))), [query,filter])
  return <div className="learning-site library-site"><Navbar/><main className="lab-wrap library-main">
    <div className="library-heading"><div><p className="lab-eyebrow">THE OPEN LEARNING LIBRARY</p><h1>A new skill.<br />A new <em>possibility.</em></h1><p>Short lessons, original study guides and space to try things yourself.<br />Choose your own starting point. Everything below is free to explore.</p></div><div className="library-emblem" aria-hidden="true"><BookOpen size={70} strokeWidth={1}/><span>KEEP<br/>EXPLORING.</span><i>✳</i></div></div>
    <div className="library-toolbar"><div className="library-filters" aria-label="Filter learning paths">{filters.map(x=><button type="button" key={x} aria-pressed={filter===x} onClick={()=>setFilter(x)} className={filter===x?'selected':''}>{x}</button>)}</div><label className="library-search"><Search size={17}/><span className="sr-only">Search learning paths</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find your next skill…" type="search"/></label></div>
    <p className="library-result-count" aria-live="polite">{cards.length} learning {cards.length===1?'path':'paths'} · No sign-in required</p>
    <div className="library-course-grid">{cards.map(([id,b])=>{const total=STARTER_LESSONS[id].length,done=Math.min(total,(progress[id]?.completed||[]).length);return <article key={id} className={`library-course path-${id}`}><div className="library-course-top"><span className="library-course-mark" aria-hidden="true">{marks[id]}</span><span className="library-course-tag">{b.tag}</span></div><h2>{b.name}</h2><p>{descriptions[id]}</p><div className="library-course-meta"><span><BookOpen size={13}/>{total} lessons</span><span><Check size={13}/>Quick quiz</span><span><Download size={13}/>PDF guide</span></div>{done>0&&<div className="library-progress"><div role="progressbar" aria-label={`${b.name} lessons completed`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><span style={{width:`${done/total*100}%`}}/></div><span>{done}/{total} completed on this device</span></div>}<div className="library-course-actions"><Link to={`/learn/course/${id}`} className="lab-button lab-button-dark">{done?'Continue learning':'Start exploring'}<ArrowUpRight size={16}/></Link><a href={b.pdf} download className="library-download" aria-label={`Download ${b.name} PDF guide`}><Download size={17}/></a><a href={b.official} target="_blank" rel="noopener noreferrer" className="library-download" aria-label={`Official ${b.name} documentation`}><ExternalLink size={16}/></a></div></article>})}</div>
    {!cards.length&&<div className="library-empty"><Search size={28}/><h2>No paths found just yet.</h2><p>Try a different search or explore the whole library.</p><button className="lab-button lab-button-dark" onClick={()=>{setQuery('');setFilter('All paths')}} type="button">Show all learning paths</button></div>}
    <div className="library-next"><div><span className="lab-eyebrow">PUT A LITTLE THEORY INTO PRACTICE</span><h2>Make something <em>of it.</em></h2><p>A lesson is a beginning. Open the practice lab and see what you can do.</p></div><Link to="/student/practice/python" className="lab-button lab-button-dark">Open the practice lab<ArrowUpRight size={18}/></Link></div>
    <section className="teacher-course-section" aria-labelledby="teacher-courses-title"><div className="teacher-course-heading"><div><p className="lab-eyebrow">FROM THE CLASSROOM</p><h2 id="teacher-courses-title">A little guidance goes a long way.</h2><p>Courses shared by authorised teachers, alongside your free learning paths.</p></div><Link to="/learn/profile" className="lab-text-link"><GraduationCap size={17}/>{getLearningAuth()?'My learning profile':'Optional learning profile'}<ArrowRight size={15}/></Link></div>{error&&<p role="status" className="library-api-note">{error}</p>}{published.length?<div className="teacher-course-grid">{published.map(c=><article key={c.id} className="library-course"><span className="library-course-tag">Class {c.className} · {c.language}</span><h3>{c.title}</h3><p>{c.summary}</p><span className="library-course-meta">{c.lessonCount} lessons</span><Link to={`/learn/teacher-course/${c.id}`} className="lab-text-link">Join or continue<ArrowUpRight size={16}/></Link></article>)}</div>:<div className="teacher-course-empty"><BookOpen size={25}/><div><h3>Room for your next classroom course.</h3><p>Teacher courses will appear here when published. Explore the free library while you wait. A teacher-issued enrolment code connects course quizzes to teacher reports.</p></div></div>}</section>
  </main><Footer/></div>
}
