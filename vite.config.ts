import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      // In development, proxy API calls to Vercel dev server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
})
