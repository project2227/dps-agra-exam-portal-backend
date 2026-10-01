import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Braces, Check, ChevronDown, Code2, Gamepad2, GraduationCap, Layers3, ShieldCheck, Terminal, Users } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import useLearningMotion from '../hooks/useLearningMotion'

const chapters = [
  { label: 'A spark of curiosity', title: <>A little curiosity.<br />A world of <em>possibilities.</em></>, text: 'A place to understand the idea, try it yourself, and make something that matters. Your next chapter in computer science starts here.' },
  { label: 'Space to experiment', title: <>Great ideas start<br />with <em>“what if?”</em></>, text: 'Change a line. Follow the output. Learn why it works. Turn the things you read into things you can actually build.' },
  { label: 'Confidence to create', title: <>From your first line<br />to your <em>next big idea.</em></>, text: 'Small lessons become new skills. New skills become real projects. Find your rhythm, keep experimenting, and see how far you can go.' },
]
const examples = {
  Python: { file: 'first_steps.py', code: <><span className="syntax-comment"># Every big idea starts somewhere.</span>{'\n'}<span className="syntax-soft">name</span> = <span className="syntax-string">"Curious mind"</span>{'\n\n'}<span className="syntax-purple">def</span> <span className="syntax-gold">say_hello</span>(name):{'\n'}{'    '}<span className="syntax-purple">return</span> <span className="syntax-string">f"Hello, {'{name}'}!"</span>{'\n\n'}<span className="syntax-gold">print</span>(say_hello(name))</>, output: 'Hello, Curious mind!', to: '/student/practice/python' },
  Web: { file: 'my_first_page.html', code: <><span className="syntax-comment">{'<!-- An idea, made visible. -->'}</span>{'\n'}<span className="syntax-purple">{'<main>'}</span>{'\n'}{'  '}<span className="syntax-purple">{'<h1>'}</span>Hello, world!<span className="syntax-purple">{'</h1>'}</span>{'\n'}{'  '}<span className="syntax-purple">{'<p>'}</span>I made this.<span className="syntax-purple">{'</p>'}</span>{'\n'}<span className="syntax-purple">{'</main>'}</span></>, output: 'Hello, world!  ·  I made this.', to: '/student/practice/web' },
  SQL: { file: 'discover.sql', code: <><span className="syntax-comment">-- Find a little inspiration.</span>{'\n'}<span className="syntax-purple">SELECT</span> <span className="syntax-string">'Keep exploring.'</span>{'\n'}{'  '}<span className="syntax-purple">AS</span> next_step;</>, output: 'next_step → Keep exploring.', to: '/student/practice/sql' },
}
const paths = [
  { id: 'python', mark: 'Py', title: 'Think in Python.', subtitle: 'START WITH THE FUNDAMENTALS', text: 'Meet variables, loops and functions. Build the confidence to solve a problem one step at a time.', tags: ['Beginner friendly', '3 lessons'], className: 'path-python' },
  { id: 'web', mark: '</>', title: 'Make the web yours.', subtitle: 'TURN IDEAS INTO INTERFACES', text: 'Give your ideas a home on the web with HTML, CSS and JavaScript. Create something you can see.', tags: ['Creative coding', '3 lessons'], className: 'path-web' },
  { id: 'sql', mark: '{ }', title: 'Find the story in data.', subtitle: 'ASK BETTER QUESTIONS', text: 'Explore tables, write your first queries and discover how a few lines can make information useful.', tags: ['Data essentials', '2 lessons'], className: 'path-sql' },
]
const questions = [
  ['Can I start without an account?', 'Yes. The free courses, original PDF guides, practice IDE, Logic Arcade and practice tests are available without signing in. An optional learning profile and teacher-led exams have their own access flows.'],
  ['What can I practise here?', 'Explore Python, web development, SQL, C, C++, Java and block coding. Python and SQL can run in your browser; web and block activities have interactive previews. C, C++ and Java execution depends on an available separate compiler service.'],
  ['How do I join a classroom exam?', 'Open Join an exam, choose the exam, and enter your name, class, section, roll number and the passcode your teacher gives you. Early check-in opens 30 minutes before the scheduled start.'],
  ['How does monitoring work?', 'Exam monitoring is visible and based on consent. Camera or screen access requires browser permission. Activity flags are reviewed by a teacher; they are not automatic proof of misconduct. Sharing stops when the exam ends.'],
  ['Is this the official DPS Agra website?', 'DPS Lab is an independent, student-built learning project created by Aryan Agarwal. It is not an officially affiliated school website. School information is available on the official DPS Agra website.'],
]

function CodingScene({ step }) {
  const [language, setLanguage] = useState('Python')
  const example = examples[language]
  return <div className="lab-scene" aria-label="An interactive preview of a first coding project">
    <div className="scene-orbit orbit-one" aria-hidden="true" /><div className="scene-orbit orbit-two" aria-hidden="true" />
    <span className="scene-star star-one" aria-hidden="true">✳</span><span className="scene-star star-two" aria-hidden="true">+</span>
    <div className="scene-note note-top"><span className="note-icon"><BookOpen size={18} /></span><div><b>One small step.</b><span>A whole new way to think.</span></div></div>
    <div className="scene-editor">
      <div className="scene-editor-bar"><span className="editor-dots" aria-hidden="true"><i /><i /><i /></span><span>{example.file}</span><Code2 size={15} /></div>
      <div className="scene-editor-tabs" aria-label="Preview language">{Object.keys(examples).map(name => <button key={name} type="button" onClick={() => setLanguage(name)} aria-pressed={name === language} className={name === language ? 'selected' : ''}>{name}</button>)}<span>EXAMPLE</span></div>
      <div className="scene-code"><div className="code-numbers" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i}>{i + 1}</span>)}</div><pre><code>{example.code}</code></pre></div>
      <div className="scene-output"><span><Terminal size={13} /> Output preview</span><p key={language}>{example.output}<i aria-hidden="true" /></p><Link to={example.to}>Try it in the IDE <ArrowUpRight size={14} /></Link></div>
    </div>
    <div className="scene-stamp"><span><Check size={18} /></span><div><b>{['Ready when you are.', 'Learn. Try. Understand.', 'Something you made.'][step]}</b><small>{['No sign-in. Just curiosity.', 'That’s how ideas take shape.', 'That’s a good place to start.'][step]}</small></div></div>
    <div className="scene-block" aria-hidden="true"><Braces strokeWidth={1.1} size={45} /></div>
    <div className="scene-caption"><span className="caption-line" /> YOUR FIRST LINE IS ONLY THE BEGINNING</div>
  </div>
}

export default function LearningLanding() {
  const root = useRef(null), story = useRef(null)
  const step = useLearningMotion(root, story)
  const chapter = chapters[step]
  const skip = () => document.getElementById('discover')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  return <div className="learning-site" ref={root}>
    <Navbar />
    <main>
      <section className="lab-story" ref={story} aria-label="Welcome to DPS Lab" data-chapter={step}>
        <div className="lab-story-sticky">
          <div className="lab-wrap hero-grid">
            <div className="hero-copy">
              <p className="lab-eyebrow"><span className="eyebrow-dot" /> A LEARNING SPACE FOR CURIOUS MINDS</p>
              <div className="hero-chapter" key={step}><span className="chapter-caption">0{step + 1} / {chapter.label}</span><h1>{chapter.title}</h1><p className="hero-description">{chapter.text}</p></div>
              <div className="hero-actions"><Link to="/learn" className="lab-button lab-button-dark" data-tour="courses">Find your next skill <ArrowUpRight size={18} /></Link><Link to="/student/practice/python" className="lab-text-link">Open the practice lab <ArrowRight size={16} /></Link></div>
              <p className="hero-note"><span className="tiny-check"><Check size={11} /></span> Free to explore. Learn at your own pace.</p>
            </div>
            <CodingScene step={step} />
          </div>
          <div className="lab-wrap story-bottom"><button type="button" className="scroll-invitation" onClick={skip}><span className="scroll-icon"><ArrowDown size={14} /></span><span>SCROLL TO DISCOVER <small>or skip to the good stuff</small></span></button><ol className="story-steps" aria-label="Learning journey">{['Be curious', 'Try it yourself', 'Make it real'].map((label, i) => <li key={label} className={step === i ? 'active' : ''} aria-current={step === i ? 'step' : undefined}><span>0{i + 1}</span>{label}</li>)}</ol><span className="story-signature">A little lab. A lot of potential.</span></div>
          <div className="story-progress" aria-hidden="true"><span /></div>
        </div>
      </section>

      <div className="lab-language-strip" aria-label="Available learning paths"><div className="lab-wrap"><span>YOUR IDEAS. MANY LANGUAGES.</span><div>{['Python', 'HTML & CSS', 'JavaScript', 'SQL', 'Java', 'C / C++', 'Blocks'].map(x => <span key={x}>{x}</span>)}</div><span className="strip-symbol" aria-hidden="true">✳</span></div></div>

      <section className="lab-section lab-wrap" id="discover" aria-labelledby="discover-title">
        <div className="lab-section-head" data-reveal><div><p className="lab-eyebrow">01 — FIND YOUR STARTING POINT</p><h2 id="discover-title">Big possibilities.<br /><em>Small first steps.</em></h2></div><p>You don’t need to know everything to begin.<br />Just pick something that makes you curious.</p></div>
        <div className="learning-paths">{paths.map((path, i) => <Link to={`/learn/course/${path.id}`} className={`learning-path ${path.className}`} key={path.id} data-reveal style={{ '--reveal-delay': `${i * 90}ms` }}><div className="path-art" aria-hidden="true"><span>{path.mark}</span><i className="path-art-circle" /><i className="path-art-line" /><span className="path-art-plus">+</span></div><div className="path-body"><p className="path-eyebrow">{path.subtitle}</p><h3>{path.title}</h3><p>{path.text}</p><div className="path-tags">{path.tags.map(x => <span key={x}>{x}</span>)}</div><span className="path-link">Explore the course <ArrowUpRight size={18} /></span></div></Link>)}</div>
        <div className="section-foot" data-reveal><p>There’s more where that came from. Seven learning paths, one open door.</p><Link to="/learn" className="lab-text-link">Browse the whole library <ArrowRight size={16} /></Link></div>
      </section>

      <section className="lab-practice-section" aria-labelledby="practice-title"><div className="lab-wrap practice-grid">
        <div className="practice-art" data-reveal aria-hidden="true"><div className="practice-sheet"><div className="sheet-header"><span>THE EXPERIMENT BOOK</span><span>№ 001</span></div><h3>What if I<br /><em>made this?</em></h3><div className="sheet-rule" /><div className="sheet-check"><Check size={15} /><span>Write a little code</span></div><div className="sheet-check"><Check size={15} /><span>See what happens</span></div><div className="sheet-check"><Check size={15} /><span>Make it a little better</span></div><div className="sheet-scribble"><svg width="130" height="45" viewBox="0 0 130 45" fill="none"><path d="M4 31c24-30 23 22 47-4 17-17 11 15 31-3 14-15 16-3 29-13m-8-3 11 2-2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg><span>repeat until proud.</span></div></div><div className="practice-floating"><Terminal size={19} /><span>idea → code → possibility</span></div><span className="practice-big-star">✳</span></div>
        <div className="practice-copy" data-reveal><p className="lab-eyebrow">02 — LEARNING, WITH YOUR HANDS ON</p><h2 id="practice-title">Less “I get it.”<br />More <em>“I made it.”</em></h2><p>Reading is a start. Making is where it clicks. Step into a practice space where you can write, experiment and learn from every little mistake.</p><div className="practice-benefits"><span><Check size={15} /> Start with ready-to-edit examples</span><span><Check size={15} /> Keep your drafts on your device</span><span><Check size={15} /> Move between seven languages</span></div><Link to="/student/practice/python" className="lab-button lab-button-dark">Make your first experiment <ArrowUpRight size={18} /></Link><small>Python, SQL, web and blocks have browser-based practice.</small></div>
      </div></section>

      <section className="lab-section lab-wrap" aria-labelledby="explore-title"><div className="lab-section-head" data-reveal><div><p className="lab-eyebrow">03 — THERE’S MORE THAN ONE WAY TO LEARN</p><h2 id="explore-title">Follow your <em>curiosity.</em></h2></div><p>A little structure. A little play.<br />Find the way that works for you.</p></div><div className="discovery-grid">
        <Link to="/learn/arcade" className="discovery-card" data-reveal><div className="discovery-icon"><Gamepad2 size={26} strokeWidth={1.5} /></div><span className="discovery-number">01</span><h3>Play with a purpose.</h3><p>Logic circuits, memory challenges and code stacks. Give your brain a different kind of workout.</p><span className="lab-text-link">Enter the Logic Arcade <ArrowUpRight size={17} /></span></Link>
        <Link to="/learn/custom-test" className="discovery-card" data-reveal style={{ '--reveal-delay': '80ms' }}><div className="discovery-icon"><Layers3 size={26} strokeWidth={1.5} /></div><span className="discovery-number">02</span><h3>A challenge, your way.</h3><p>Choose a language, a level and a time limit. Create a practice test that meets you where you are.</p><span className="lab-text-link">Make a practice test <ArrowUpRight size={17} /></span></Link>
        <Link to="/learn/mock-exam" className="discovery-card" data-reveal style={{ '--reveal-delay': '160ms' }}><div className="discovery-icon"><GraduationCap size={26} strokeWidth={1.5} /></div><span className="discovery-number">03</span><h3>Ready for exam day?</h3><p>Try the Class IX practice exam, spot the gaps and walk into your next assessment with more confidence.</p><span className="lab-text-link">Try the mock exam <ArrowUpRight size={17} /></span></Link>
      </div></section>

      <section className="lab-classroom-section" aria-labelledby="classroom-title"><div className="lab-wrap classroom-grid"><div data-reveal><p className="lab-eyebrow">04 — A LITTLE MORE ROOM FOR YOUR CLASSROOM</p><h2 id="classroom-title">Good learning.<br /><em>Thoughtful teaching.</em></h2><p>Bring the practical lab together. Share resources, host an exam and understand how your students are progressing — with clear expectations at every step.</p><div className="classroom-actions"><Link to="/teacher/login" className="lab-button lab-button-light">Teacher workspace <ArrowUpRight size={18} /></Link><Link to="/student/join" className="classroom-join">Joining an exam? <ArrowRight size={16} /></Link></div><div className="classroom-trust"><ShieldCheck size={18} /><span>Visible monitoring. Clear consent. Human review.</span></div></div><div className="classroom-steps" data-reveal>{[{icon:Users,title:'Bring your class together',text:'Create a class, organise your resources and give every student a clear starting point.'},{icon:BookOpen,title:'Make the practical count',text:'Host a teacher-led assessment, share a passcode and let answers save as students work.'},{icon:ShieldCheck,title:'Understand the progress',text:'Review submissions and consent-based activity signals. Keep the teacher in the decision.'}].map(({icon:Icon,title,text},i)=><div key={title}><span className="classroom-step-icon"><Icon size={21} strokeWidth={1.5}/></span><div><small>0{i+1}</small><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></section>

      <section className="lab-section lab-wrap faq-grid" aria-labelledby="faq-title"><div data-reveal><p className="lab-eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</p><h2 id="faq-title">Before you<br /><em>jump in.</em></h2><p className="faq-intro">A clear starting point makes all the difference.</p><Link to="/about" className="lab-text-link">Meet the project <ArrowUpRight size={16} /></Link></div><div className="lab-faq" data-reveal>{questions.map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={18}/></summary><p>{a}</p></details>)}</div></section>

      <section className="lab-final-cta lab-wrap" data-reveal><span className="cta-star" aria-hidden="true">✳</span><p className="lab-eyebrow">YOU DON’T NEED A BIG PLAN. JUST A FIRST STEP.</p><h2>Your next chapter<br />starts with <em>curiosity.</em></h2><Link to="/learn" className="lab-button lab-button-dark">Let’s learn something <ArrowUpRight size={18} /></Link><p>Free lessons. Real practice. Room to grow.</p></section>
    </main><Footer />
  </div>
}
