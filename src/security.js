const PASS_SHA256 = '8b31e003daf9ab33f0678081be064ff627110d1f510701b7e09f4f0f1ade4dfd'
const EMAIL_SHA256 = '8b31e003daf9ab33f0678081be064ff627110d1f510701b7e09f4f0f1ade4dfd'

export async function sha256hex(value) {
  const bytes = new TextEncoder().encode(String(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function credentialsMatch(email, password) {
  const [e, p] = await Promise.all([sha256hex(email.trim().toLowerCase()), sha256hex(password)])
  return e === EMAIL_SHA256 && p === PASS_SHA256
}

export async function hashEquals(value, expectedHex) {
  if (!expectedHex) return false
  const digest = await sha256hex(String(value).trim())
  if (digest.length !== expectedHex.length) return false
  let out = 0
  for (let i = 0; i < digest.length; i += 1) out |= digest.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  return out === 0
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
