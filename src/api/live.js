const BASE = (import.meta.env?.VITE_API_BASE || '').replace(/\/+$/, '')

function newKey() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    'Cache-Control': 'no-store',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }
  const csrf = sessionStorage.getItem('cyberpod-csrf')
  const method = options.method || 'GET'
  if (csrf && method !== 'GET' && method !== 'HEAD') headers['X-CSRF-Token'] = csrf
  if (options.idempotent) headers['Idempotency-Key'] = options.idempotent
  const response = await fetch(BASE + path, { ...options, method, headers, credentials: 'include', cache: 'no-store', signal: options.signal || AbortSignal.timeout(20000) })
  const body = await response.json().catch(() => { throw new Error('INVALID_API_RESPONSE') })
  if (!response.ok) {
    const err = new Error(body?.error?.code || 'HTTP_ERROR')
    err.payload = body
    err.status = response.status
    throw err
  }
  if (JSON.stringify(body).includes('CYBERPOD{')) throw new Error('SECRET_LEAK')
  return body
}

export const liveApi = {
  restore() {
    return { auth: null, lab: null, session: null, view: 'login', lines: [] }
  },
  async me() {
    const body = await request('/api/v1/auth/me')
    sessionStorage.setItem('cyberpod-csrf', body.csrf_token)
    return body
  },
  async login({ email, password }) {
    const body = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    sessionStorage.setItem('cyberpod-csrf', body.csrf_token)
    return {
      user: body.user || { id: 'student', display_name: email },
      csrf_token: body.csrf_token,
    }
  },
  async logout() {
    try {
      await request('/api/v1/auth/logout', { method: 'POST', body: '{}' })
    } finally {
      sessionStorage.removeItem('cyberpod-csrf')
    }
    return { ok: true }
  },
  async listLabs() {
    return request('/api/v1/labs')
  },
  async getLab(labId) {
    return request(`/api/v1/labs/${encodeURIComponent(labId)}`)
  },
  async listSessions() {
    return request('/api/v1/sessions')
  },
  async createSession(labId) {
    return request(`/api/v1/labs/${encodeURIComponent(labId)}/sessions`, {
      method: 'POST',
      body: '{}',
      idempotent: `create:${labId}:${newKey()}`,
    })
  },
  async startSession(sessionId) {
    return request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/start`, {
      method: 'POST',
      body: '{}',
      idempotent: `start:${sessionId}`,
    })
  },
  async stopSession(sessionId) {
    return request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/stop`, {
      method: 'POST',
      body: '{}',
      idempotent: `stop:${sessionId}`,
    })
  },
  async restartSession(sessionId) {
    return request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/restart`, {
      method: 'POST',
      body: '{}',
      idempotent: `restart:${sessionId}:${newKey()}`,
    })
  },
  async getSessionStatus(sessionId) {
    return request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/status`)
  },
  async getSessionAccess(sessionId) {
    return request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/access`)
  },
  async cleanupSession(sessionId) {
    return request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/cleanup`, { method: 'POST', body: '{}' })
  },
  async submitFlag(sessionId, { flag, expected_revision }) {
    return request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/flags`, {
      method: 'POST',
      body: JSON.stringify({ flag, expected_revision }),
      idempotent: `flag:${sessionId}:${newKey()}`,
    })
  },
  setView() {},
  runCommand() {
    return ['Live mode: use the authorized desktop and training target. The flag is not returned by the API.']
  },
  getTerminal() {
    return ['Live API mode. Submit the flag issued to this session generation.']
  },
  getRevision(session) {
    return Number(session?.revision) || 0
  },
  loginPortal() {
    return { ok: false, reason: 'live' }
  },
  openPortal() {},
  getPortalFlag() {
    return null
  },
}
