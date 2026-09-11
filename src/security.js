const FLAG_SHA256 = '94e4c7f3e94b883ff5cfb676d082c7e36006ac22be1eb0209b4df4fad4cd9702'
const PASS_SHA256 = 'c115df80c9d37dc70d1335fd24429a8f1c12e04a47cfe0d3432ff4db233dc2be'
const EMAIL_SHA256 = '3b306615967f305f7dda88446b475c8c3468cb8b9944bf4207c0d4ec753acf84'

export async function sha256hex(value) {
  const bytes = new TextEncoder().encode(String(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function credentialsMatch(email, password) {
  const [e, p] = await Promise.all([sha256hex(email.trim().toLowerCase()), sha256hex(password)])
  return e === EMAIL_SHA256 && p === PASS_SHA256
}

export async function flagMatches(flag) {
  return (await sha256hex(String(flag).trim())) === FLAG_SHA256
}

export function sanitizeInput(value, max = 200) {
  return String(value || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, max)
}

export function randomToken() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export class RateGate {
  constructor(limit = 5, windowMs = 5 * 60 * 1000) {
    this.limit = limit
    this.windowMs = windowMs
    this.hits = []
  }
  check() {
    const now = Date.now()
    this.hits = this.hits.filter((t) => now - t < this.windowMs)
    if (this.hits.length >= this.limit) return false
    this.hits.push(now)
    return true
  }
}
