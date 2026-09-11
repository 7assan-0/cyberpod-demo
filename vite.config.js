import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    headers: securityHeaders,
  },
  preview: {
    port: 3000,
    host: true,
    headers: securityHeaders,
  },
})
