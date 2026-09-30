// A fresh in-memory SQLite database for each practice run, no server-side SQL.
const library = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/';
let SQL;
self.onmessage = async ({ data }) => {
  const start = Date.now(); let db;
  try {
    if (!SQL) {
      self.postMessage({ type: 'loading', message: 'Loading the free browser SQL engine...' });
      importScripts(library + 'sql-wasm.js');
      SQL = await initSqlJs({ locateFile: name => library + name });
    }
    self.postMessage({ type: 'ready' });
    db = new SQL.Database();
    const sets = db.exec(String(data.code || '').slice(0, 20000));
    const output = sets.map(set => [set.columns.join(' | '), ...set.values.slice(0,100).map(row=>row.map(v=>String(v??'NULL')).join(' | '))].join('\n')).join('\n\n');
    self.postMessage({ type: 'result', stdout: output || 'SQL executed successfully. (No result rows.)', stderr: '', exitCode: 0, timeMs: Date.now() - start, note: 'In-memory SQLite runs locally in the browser; it cannot access the real exam database.' });
  } catch (e) {
    self.postMessage({ type: 'result', stdout: '', stderr: String(e?.message || e), exitCode: 1, timeMs: Date.now() - start });
  } finally { db?.close(); }
};
