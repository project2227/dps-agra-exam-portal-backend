import { useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { CheckCheck, Loader2, Play, Send } from 'lucide-react'
import OutputConsole from './OutputConsole'
import TestCasePanel from './TestCasePanel'
import WebPreview from './WebPreview'
import BlockWorkspace from './BlockWorkspace'
import AutoSaveIndicator from '../exam/AutoSaveIndicator'
import { LANGUAGES, STARTER_CODE } from '../../config'
import { runCode, submitCode } from '../../services/codeRunner'
import { cx } from '../../utils/format'

function useMediaQuery(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

const WEB_FILES = [
  { key: 'html', label: 'index.html', monaco: 'html' },
  { key: 'css', label: 'style.css', monaco: 'css' },
  { key: 'js', label: 'script.js', monaco: 'javascript' },
]

function defineTheme(monaco) {
  monaco.editor.defineTheme('dps-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f97316' },
      { token: 'string', foreground: '4ade80' },
      { token: 'number', foreground: 'facc15' },
    ],
    colors: {
      'editor.background': '#071224',
      'editor.lineHighlightBackground': '#0d1d35',
      'editorLineNumber.foreground': '#334155',
      'editorLineNumber.activeForeground': '#94a3b8',
      'editorCursor.foreground': '#4ade80',
      'editor.selectionBackground': '#16a34a44',
      'editorIndentGuide.background1': '#12263f',
    },
  })
}

/**
 * Full IDE panel.
 * answer = { language, drafts: { [language]: code }, lastResult }
 * Each language keeps its own draft, so switching tabs never loses work.
 */
export default function CodeEditorPanel({
  answer,
  onAnswerChange,
  languages = ['python'],
  starterCode = {},
  visibleTests = [],
  hiddenTestCount = 0,
  allowRun = true,
  allowSubmit = true,
  runContext = {},
  saveStatus,
  lastSavedAt,
  readOnly = false,
  restrictClipboard = false,
  height = 420,
}) {
  const language = answer?.language && languages.includes(answer.language) ? answer.language : languages[0]
  const code = answer?.drafts?.[language] ?? starterCode[language] ?? STARTER_CODE[language] ?? ''
  const isWeb = language === 'web'
  const isBlocks = language === 'blocks'
  const [webFile, setWebFile] = useState('html')
  const [tab, setTab] = useState(isBlocks ? 'tests' : 'output')
  const wide = useMediaQuery('(min-width: 1024px)')
  const [stdin, setStdin] = useState(visibleTests[0]?.input || '')
  const [lines, setLines] = useState([])
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const channel = useMemo(() => `dps-preview-${Math.random().toString(36).slice(2)}`, [])
  const results = answer?.lastResult?.[language] || null

  useEffect(() => { setTab(isBlocks ? 'tests' : 'output') }, [isWeb, isBlocks])

  // Console messages from the web preview iframe
  useEffect(() => {
    if (!isWeb) return undefined
    const onMsg = (e) => {
      if (e.data?.channel !== channel) return
      setLines((l) => [...l.slice(-200), { type: e.data.level === 'log' ? 'stdout' : e.data.level, text: e.data.text }])
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [isWeb, channel])

  const update = (patch) => onAnswerChange?.({ drafts: {}, ...answer, language, ...patch })
  const setCode = (next) => update({ drafts: { ...(answer?.drafts || {}), [language]: next } })
  const switchLanguage = (lang) => onAnswerChange?.({ drafts: {}, ...answer, language: lang })

  const run = async () => {
    if (isWeb) {
      setLines([{ type: 'info', text: 'Preview reloaded.' }])
      setRefreshKey((k) => k + 1)
      setTab(wide ? 'output' : 'preview')
      return
    }
    setTab('output')
    setRunning(true)
    setLines((l) => [...l, { type: 'muted', text: `$ run ${LANGUAGES[language]?.label || language}` }])
    try {
      const r = await runCode({ language, code, stdin, examId: runContext.examId, questionId: runContext.questionId })
      const out = []
      if (r.stdout) out.push({ type: 'stdout', text: r.stdout })
      if (r.stderr) out.push({ type: 'stderr', text: r.stderr })
      if (r.note) out.push({ type: 'info', text: r.note })
      out.push({ type: r.exitCode === 0 ? 'success' : 'stderr', text: `Exited with code ${r.exitCode}${r.timeMs != null ? ` in ${r.timeMs} ms` : ''}` })
      setLines((l) => [...l, ...out])
    } catch (e) {
      setLines((l) => [...l, { type: 'stderr', text: e.message }])
    } finally {
      setRunning(false)
    }
  }

  const submit = async () => {
    setTab('tests')
    setSubmitting(true)
    try {
      const payload = isWeb || isBlocks ? JSON.stringify(code) : code
      const r = await submitCode({ language, code: payload, examId: runContext.examId, questionId: runContext.questionId, question: runContext.question })
      update({ lastResult: { ...(answer?.lastResult || {}), [language]: r }, submittedAt: new Date().toISOString() })
    } catch (e) {
      setLines((l) => [...l, { type: 'stderr', text: e.message }])
      setTab('output')
    } finally {
      setSubmitting(false)
    }
  }

  const monacoLang = isWeb ? WEB_FILES.find((f) => f.key === webFile).monaco : LANGUAGES[language]?.monaco
  const editorValue = isWeb ? code?.[webFile] ?? '' : code
  const onEditorChange = (v = '') => (isWeb ? setCode({ ...(code || {}), [webFile]: v }) : setCode(v))

  const bottomTabs = [
    !isWeb && !isBlocks && { key: 'input', label: 'Input (stdin)' },
    !isBlocks && { key: 'output', label: 'Output' },
    isWeb && !wide && { key: 'preview', label: 'Preview' },
    (visibleTests.length > 0 || hiddenTestCount > 0 || results) && { key: 'tests', label: 'Test cases' },
  ].filter(Boolean)

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-navy-950/60 px-3 py-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Language">
          {languages.map((l) => (
            <button key={l} type="button" role="tab" aria-selected={l === language} disabled={readOnly} onClick={() => switchLanguage(l)}
              className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold transition', l === language ? 'bg-dps-green/20 text-dps-neon ring-1 ring-dps-green/50' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
              {LANGUAGES[l]?.label || l}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {saveStatus && <AutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />}
          {allowRun && !isBlocks && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={run} disabled={running || readOnly}>
              {running ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />} {isWeb ? 'Refresh preview' : 'Run code'}
            </button>
          )}
          {allowSubmit && (
            <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={submitting || readOnly}>
              {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : results ? <CheckCheck size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />} Submit code
            </button>
          )}
        </div>
      </div>

      {isBlocks ? (
        <div style={{ minHeight: height }}>
          <BlockWorkspace value={code} onChange={setCode} readOnly={readOnly} />
        </div>
      ) : (
        <div className={cx('grid', isWeb && 'lg:grid-cols-2')}>
          <div className="min-w-0">
            {isWeb && (
              <div className="flex border-b border-white/[0.06] bg-navy-950/40 text-xs" role="tablist" aria-label="Files">
                {WEB_FILES.map((f) => (
                  <button key={f.key} type="button" role="tab" aria-selected={webFile === f.key} onClick={() => setWebFile(f.key)}
                    className={cx('border-r border-white/[0.06] px-3 py-2 font-mono transition', webFile === f.key ? 'bg-[#071224] text-white' : 'text-slate-500 hover:text-slate-200')}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            <Editor
              height={height}
              language={monacoLang}
              path={`${runContext.questionId || 'practice'}-${language}-${isWeb ? webFile : 'main'}`}
              value={editorValue}
              onChange={onEditorChange}
              beforeMount={defineTheme}
              theme="dps-dark"
              loading={<div className="grid h-full place-items-center text-sm text-slate-400">Loading editor</div>}
              options={{
                readOnly,
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                fontSize: 14,
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                wordWrap: isWeb ? 'on' : 'off',
                contextmenu: !restrictClipboard,
                padding: { top: 12 },
                renderLineHighlight: 'all',
                smoothScrolling: true,
              }}
            />
          </div>
          {isWeb && wide && (
            <div className="border-l border-white/[0.06]" style={{ height: height + 33 }}>
              <WebPreview files={code} channel={channel} refreshKey={refreshKey} />
            </div>
          )}
        </div>
      )}

      {/* bottom panel */}
      {bottomTabs.length > 0 && (
        <div className="border-t border-white/[0.06]">
          <div className="flex gap-1 bg-navy-950/60 px-2 pt-1.5" role="tablist" aria-label="Output panels">
            {bottomTabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={cx('rounded-t-lg px-3 py-1.5 text-xs font-medium', tab === t.key ? 'bg-[#050d1a] text-white' : 'text-slate-400 hover:text-white')}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="h-56">
            {tab === 'input' && (
              <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} aria-label="Program input"
                placeholder="Type the input your program should read, one value per line."
                className="h-full w-full resize-none bg-[#050d1a] p-3 font-mono text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none" />
            )}
            {tab === 'output' && <OutputConsole lines={lines} running={running} onClear={() => setLines([])} />}
            {tab === 'preview' && !wide && <WebPreview files={code} channel={channel} refreshKey={refreshKey} />}
            {tab === 'tests' && <TestCasePanel tests={visibleTests} hiddenTestCount={hiddenTestCount} results={results} />}
          </div>
        </div>
      )}
    </div>
  )
}
