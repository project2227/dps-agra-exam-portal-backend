import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// VITE_BASE_PATH lets you deploy into a sub-folder (e.g. /exam/). Default is the domain root.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: mode === 'visual' ? '/visual/' : env.VITE_BASE_PATH || '/',
    resolve: { alias: mode === 'visual' ? { 'socket.io-client': fileURLToPath(new URL('./src/visual/socket.js',import.meta.url)) } : {} },
    plugins: [react()],
    server: { port: 5173 },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        ...(mode === 'visual' ? { input: fileURLToPath(new URL('./visual.html',import.meta.url)) } : {}),
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            realtime: mode === 'visual' ? ['axios'] : ['socket.io-client', 'axios'],
          },
        },
      },
    },
  }
})
