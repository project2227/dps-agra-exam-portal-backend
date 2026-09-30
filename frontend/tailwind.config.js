/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#020617', 900: '#06111f', 850: '#081627', 800: '#0b1b30', 700: '#12263f', 600: '#1b3352' },
        dps: { green: '#16a34a', neon: '#4ade80', orange: '#f97316', gold: '#facc15' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(74,222,128,.25), 0 8px 30px -8px rgba(22,163,74,.55)',
        'glow-orange': '0 0 0 1px rgba(249,115,22,.3), 0 8px 30px -8px rgba(249,115,22,.55)',
        'glow-red': '0 0 0 1px rgba(248,113,113,.45), 0 0 28px -6px rgba(239,68,68,.55)',
      },
    },
  },
  plugins: [],
}
