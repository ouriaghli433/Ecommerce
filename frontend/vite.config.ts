import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // "@/..." always means "src/...", so imports stay short and stable.
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Needed on Windows/Docker: file change events do not cross the
      // bind mount, so Vite checks the files itself.
      usePolling: true,
    },
  },
})
