// Central configuration. Values come from Vite env variables (see .env.example).
const env = import.meta.env

export const API_BASE_URL = (env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
export const SOCKET_URL = (env.VITE_SOCKET_URL || API_BASE_URL).replace(/\/+$/, '')
export const SOCKET_PATH = env.VITE_SOCKET_PATH || '/socket.io'
export const DEMO_MODE = env.VITE_DEMO_MODE ? env.VITE_DEMO_MODE === 'true' : !API_BASE_URL
export const ROUTER_MODE = env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'browser'
export const SNAPSHOT_INTERVAL_MS = Number(env.VITE_SNAPSHOT_INTERVAL_MS || 10000)
export const LOGO_SRC = `${env.BASE_URL}dps-logo.png`

let parsedIce = null
try { parsedIce = env.VITE_ICE_SERVERS ? JSON.parse(env.VITE_ICE_SERVERS) : null } catch { parsedIce = null }
export const ICE_SERVERS = parsedIce || [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]

export const SCHOOL = {
  name: 'Delhi Public School, Agra',
  short: 'DPS Agra',
  portal: 'DPS Agra Exam Portal',
  department: 'Department of Computer Science',
  motto: 'Service Before Self',
}

// Edit these lists to match the school's actual classes and sections.
export const CLASSES = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
export const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']
export const EXAM_TYPES = ['Quiz', 'Practical', 'Mixed']

export const LANGUAGES = {
  blocks: { label: 'Blocks', long: 'Block coding (Scratch-style)', monaco: null },
  web: { label: 'HTML/CSS/JS', long: 'Web page: HTML, CSS & JavaScript', monaco: 'html' },
  python: { label: 'Python', long: 'Python 3', monaco: 'python' },
  java: { label: 'Java', long: 'Java 17', monaco: 'java' },
  c: { label: 'C', long: 'C (GCC)', monaco: 'c' },
  cpp: { label: 'C++', long: 'C++17 (G++)', monaco: 'cpp' },
  sql: { label: 'SQL', long: 'SQL basics (SQLite)', monaco: 'sql' },
}

// Which IDEs each class sees on the dashboard and in the exam builder.
export const CLASS_LANGUAGES = {
  VI: ['blocks', 'web'],
  VII: ['blocks', 'web'],
  VIII: ['web', 'python'],
  IX: ['python', 'web'],
  X: ['python', 'web'],
  XI: ['python', 'sql', 'cpp', 'c'],
  XII: ['python', 'sql', 'java', 'cpp'],
}

export const STARTER_CODE = {
  python: '# Write your Python program here\n\ndef main():\n    name = input()\n    print("Hello,", name)\n\nmain()\n',
  java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String name = sc.nextLine();\n        System.out.println("Hello, " + name);\n    }\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    char name[64];\n    scanf("%63s", name);\n    printf("Hello, %s\\n", name);\n    return 0;\n}\n',
  cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string name;\n    getline(cin, name);\n    cout << "Hello, " << name << endl;\n    return 0;\n}\n',
  sql: '-- Write your SQL query here\nCREATE TABLE student (roll INT, name TEXT, marks INT);\nINSERT INTO student VALUES (1, \'Aarav\', 88), (2, \'Diya\', 94);\n\nSELECT name, marks FROM student WHERE marks > 90;\n',
  web: {
    html: '<main class="card">\n  <h1>Hello, DPS Agra!</h1>\n  <p>Edit the HTML, CSS and JS tabs.</p>\n  <button id="btn">Click me</button>\n</main>\n',
    css: 'body {\n  font-family: system-ui, sans-serif;\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n  margin: 0;\n  background: #f1f5f9;\n}\n.card {\n  padding: 24px;\n  border-radius: 12px;\n  background: white;\n  box-shadow: 0 8px 24px rgba(0,0,0,.08);\n}\n',
    js: 'document.getElementById("btn").addEventListener("click", () => {\n  console.log("Button clicked!");\n});\n',
  },
  blocks: [],
}

// Proctoring events: label, severity and the message a student sees.
export const PROCTOR_EVENTS = {
  tab_hidden: { label: 'Switched tab / minimised', severity: 'high', warn: 'You left the exam tab. This has been recorded and your teacher can see it.' },
  tab_visible: { label: 'Returned to exam tab', severity: 'info' },
  window_blur: { label: 'Exam window lost focus', severity: 'medium', warn: 'The exam window lost focus. Keep this window active until you submit.' },
  window_focus: { label: 'Exam window focused', severity: 'info' },
  fullscreen_exit: { label: 'Exited fullscreen', severity: 'high', warn: 'You exited fullscreen. Return to fullscreen to continue the exam.' },
  fullscreen_enter: { label: 'Entered fullscreen', severity: 'info' },
  copy: { label: 'Copy attempt', severity: 'medium', warn: 'Copying is disabled for this exam. The attempt was recorded.' },
  cut: { label: 'Cut attempt', severity: 'medium', warn: 'Cutting text is disabled for this exam. The attempt was recorded.' },
  paste: { label: 'Paste attempt', severity: 'high', warn: 'Pasting is disabled for this exam. The attempt was recorded.' },
  right_click: { label: 'Right-click blocked', severity: 'low' },
  devtools_shortcut: { label: 'Developer tools shortcut', severity: 'high', warn: 'Developer tools are not allowed during the exam. This was recorded.' },
  devtools_suspected: { label: 'Developer tools possibly open', severity: 'medium' },
  print_screen: { label: 'Print Screen pressed', severity: 'medium', warn: 'Screenshots are not allowed during the exam.' },
  multiple_tabs: { label: 'Exam open in another tab', severity: 'high', warn: 'This exam is open in another tab. Close the other tab now.' },
  screen_share_stopped: { label: 'Screen sharing stopped', severity: 'high', warn: 'Screen sharing stopped. Share your screen again to continue.' },
  webcam_stopped: { label: 'Webcam stopped', severity: 'high', warn: 'Your webcam turned off. Check the camera and reconnect.' },
  exam_started: { label: 'Exam started', severity: 'info' },
  exam_submitted: { label: 'Exam submitted', severity: 'info' },
  teacher_warning: { label: 'Warning from teacher', severity: 'info' },
  teacher_observation: { label: 'Teacher observation (requires manual review)', severity: 'info' },
}

export const FLAG_BUCKETS = {
  tab: { label: 'Tab switches', types: ['tab_hidden'] },
  blur: { label: 'Focus lost', types: ['window_blur'] },
  fullscreen: { label: 'Fullscreen exits', types: ['fullscreen_exit'] },
  copyPaste: { label: 'Copy / paste', types: ['copy', 'cut', 'paste'] },
  devtools: { label: 'DevTools', types: ['devtools_shortcut', 'devtools_suspected'] },
  other: { label: 'Other', types: ['multiple_tabs', 'screen_share_stopped', 'webcam_stopped', 'print_screen'] },
}

export function bucketOf(type) {
  return Object.keys(FLAG_BUCKETS).find((k) => FLAG_BUCKETS[k].types.includes(type)) || null
}
