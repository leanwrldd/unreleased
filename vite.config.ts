import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/renderer'),
  envDir: resolve(__dirname, '.'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 3018,
    strictPort: true,
    host: true,
    allowedHosts: ['.juicewrldapi.com', 'player.juicewrldapi.com', 'localhost', '127.0.0.1'],
  },
  preview: {
    port: 3018,
    strictPort: true,
    host: true,
    allowedHosts: ['.juicewrldapi.com', 'player.juicewrldapi.com', 'localhost', '127.0.0.1'],
  },
})
