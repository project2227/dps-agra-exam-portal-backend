import api from './api'

const normalizeRun = (d = {}) => ({
  stdout: d.stdout ?? d.output ?? '',
  stderr: d.stderr ?? d.error ?? '',
  exitCode: d.exitCode ?? d.code ?? 0,
  timeMs: d.timeMs ?? d.time ?? null,
  note: d.note,
})

/** Run code on the backend sandbox (Python, Java, C, C++, SQL). */
export async function runCode({ language, code, stdin, examId, questionId }) {
  const res = await api.runCode({ language, code, stdin, examId, questionId })
  return normalizeRun(res)
}

/** Submit code for checking against visible + hidden test cases. */
export async function submitCode({ language, code, examId, questionId, question }) {
  const res = await api.submitCode({ language, code, examId, questionId, question: question ? { visibleTests: question.visibleTests, hiddenTestCount: question.hiddenTestCount } : undefined })
  const results = res.results || res.testResults || []
  return {
    results,
    passed: res.passed ?? results.filter((r) => r.passed).length,
    total: res.total ?? results.length,
    score: res.score,
  }
}

/**
 * Builds the srcdoc for the HTML/CSS/JS live preview. console.* and runtime
 * errors are forwarded to the parent window so the IDE console can show them.
 * The iframe is sandboxed with allow-scripts only (no same-origin access).
 */
export function buildWebPreview({ html = '', css = '', js = '' }, channel = 'dps-preview') {
  const bridge = `<script>(function(){var C=${JSON.stringify(channel)};function send(l,a){try{parent.postMessage({channel:C,level:l,text:Array.prototype.map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}}['log','info','warn','error'].forEach(function(l){var o=console[l];console[l]=function(){send(l,arguments);o&&o.apply(console,arguments)}});window.addEventListener('error',function(e){send('error',[e.message+' (line '+e.lineno+')'])});})();<\/script>`
  const safeJs = js.replace(/<\/script/gi, '<\\/script')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${bridge}<style>${css}</style></head><body>${html}<script>try{${safeJs}\n}catch(e){console.error(e.message)}<\/script></body></html>`
}
