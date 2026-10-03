'use strict';
const { execFile } = require('node:child_process');
// Fixed Windows sensor, without shell interpolation or access to file contents.
const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Foreground { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p); }'; $id=0; [Foreground]::GetWindowThreadProcessId([Foreground]::GetForegroundWindow(),[ref]$id)|Out-Null; $p=Get-Process -Id $id -ErrorAction Stop; @{app=$p.ProcessName;title=$p.MainWindowTitle}|ConvertTo-Json -Compress`;
function focusedWindow() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') return resolve(null);
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 4000, maxBuffer: 8192 },
      (error, out) => {
        if (error) return reject(error);
        try {
          const v = JSON.parse(out);
          resolve({
            app: String(v.app).slice(0, 100),
            title: String(v.title).slice(0, 160),
          });
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}
module.exports = { focusedWindow };
