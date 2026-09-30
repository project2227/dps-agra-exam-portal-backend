// No API key: Pyodide and SQLite run in disposable browser workers.
// Runtime downloads come from public CDNs over HTTPS on first use. If offline,
// report that clearly; Java/C/C++ need a separately configured isolated runner.
function runWorker(name, { code, stdin = '' }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`${import.meta.env.BASE_URL}runtimes/${name}-worker.js`)
    let runtimeReady = false
    const startupTimer = setTimeout(() => finish(new Error('The browser runtime did not load. Check your internet connection or content blocker.')), 60000)
    let executionTimer
    function finish(error, value) {
      clearTimeout(startupTimer)
      clearTimeout(executionTimer)
      worker.terminate()
      error ? reject(error) : resolve(value)
    }
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        runtimeReady = true
        clearTimeout(startupTimer)
        executionTimer = setTimeout(() => finish(new Error('Code stopped after 8 seconds to protect your browser.')), 8000)
      } else if (data.type === 'result') finish(null, data)
    }
    worker.onerror = () => finish(new Error(runtimeReady ? 'Execution worker crashed.' : 'Could not load the browser runtime. Try disabling a CDN blocker.'))
    worker.postMessage({ code, stdin })
  })
}
export async function runInBrowser({ language, code, stdin = '' }) {
  if (language === 'python') return runWorker('python', { code, stdin })
  if (language === 'sql') return runWorker('sql', { code, stdin })
  throw new Error(`${language.toUpperCase()} compilation needs a separate isolated compiler. Python, SQL, block coding and HTML/CSS/JS are free to practise now.`)
}
