/** @type {import('tailwindcss').Config} */
const token = name => `rgb(var(--${name}) / <alpha-value>)`
const shades = name => Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(n => [n, token(name)]))
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', '!./src/visual/**', '!./src/pages/LandingPage.jsx', '!./src/pages/LearningHome.jsx', '!./src/pages/LearningLanding.jsx', '!./src/pages/AboutPortal.jsx'],
  theme: {
    colors: {
      transparent: 'transparent', current: 'currentColor', black: token('paper'), white: token('ink'),
      paper: token('paper'), surface: token('surface'), ink: token('ink'), muted: token('muted'), line: token('line'),
      navy: {950:token('paper'),900:token('paper'),850:token('surface'),800:token('surface'),700:token('line'),600:token('muted')},
      slate: {...shades('muted'),50:token('ink'),100:token('ink'),200:token('ink'),300:token('ink')},
      gray: shades('muted'), zinc: shades('muted'), neutral: shades('muted'),
      dps: {green:token('green'),neon:token('green'),orange:token('warning'),gold:token('warning')},
      green: shades('green'), emerald: shades('green'), teal: shades('green'), lime: shades('green'),
      red: shades('danger'), rose: shades('danger'), orange: shades('warning'), amber: shades('warning'), yellow: shades('warning'),
      blue: shades('info'), sky: shades('info'), cyan: shades('info'), indigo: shades('info'), violet: shades('info'), purple: shades('info'), pink: shades('info'),
    },
    extend: {
      fontFamily: {sans:['"DM Sans"','system-ui','sans-serif'],display:['"DM Sans"','system-ui','sans-serif'],mono:['"JetBrains Mono"','ui-monospace','monospace']},
      boxShadow: {glow:'var(--shadow-card)','glow-orange':'var(--shadow-card)','glow-red':'var(--shadow-card)'},
    },
  },
  plugins: [],
}
