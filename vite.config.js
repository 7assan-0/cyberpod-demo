import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.CYBERPOD_API_PROXY || 'http://127.0.0.1:8000'
  const proxy = Object.fromEntries(['/api', '/desktop'].map((path) => [path, { target, ws: true }]))
  return {
    plugins: [react(), {
      name: 'production-csp', apply: 'build',
      transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head' }],
    }],
    server: {
      port: 3000, strictPort: true, host: true, proxy,
      allowedHosts: (env.CYBERPOD_ALLOWED_HOSTS || '').split(',').filter(Boolean),
      headers: { ...securityHeaders, 'Content-Security-Policy': csp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace("connect-src 'self'", "connect-src 'self' ws: wss:") },
    },
    preview: { port: 3000, strictPort: true, host: true, proxy, headers: { ...securityHeaders, 'Content-Security-Policy': csp } },
  }
})
