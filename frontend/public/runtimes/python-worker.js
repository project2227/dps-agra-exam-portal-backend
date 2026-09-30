// Entirely browser-side Python. A disposable Worker is terminated after each run
// so an accidental infinite loop cannot permanently freeze the main UI.
const root = 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/';
let pyodide;
self.onmessage = async ({ data }) => {
  const started = Date.now(), output = [], errors = [];
  try {
    if (!pyodide) {
      self.postMessage({ type: 'loading', message: 'Downloading free browser Python runtime (first run may take a moment)...' });
      importScripts(root + 'pyodide.js');
      pyodide = await loadPyodide({ indexURL: root });
    }
    const stdin = String(data.stdin || '').split(/\r?\n/);
    pyodide.setStdout({ batched: x => output.push(x) });
    pyodide.setStderr({ batched: x => errors.push(x) });
    pyodide.setStdin({ stdin: () => stdin.shift() ?? '' });
    self.postMessage({ type: 'ready' });
    await pyodide.runPythonAsync(String(data.code || '').slice(0, 20000));
    self.postMessage({ type: 'result', stdout: output.join('\n'), stderr: errors.join('\n'), exitCode: errors.length ? 1 : 0, timeMs: Date.now() - started, note: 'Ran locally in your browser; no exam token or external API key required.' });
  } catch (e) {
    self.postMessage({ type: 'result', stdout: output.join('\n'), stderr: [...errors, String(e?.message || e)].join('\n'), exitCode: 1, timeMs: Date.now() - started });
  }
};
