const BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const csrf = sessionStorage.getItem('cyberpod-csrf')
  if (csrf && options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrf
  const response = await fetch(BASE + path, { ...options, headers, credentials: 'include' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(body?.error?.code || 'HTTP_ERROR')
    err.payload = body
    throw err
  }
  if (JSON.stringify(body).includes('CYBERPOD{')) {
    throw new Error('SECRET_LEAK')
  }
  return body
}

export const liveApi = {
  restore() {
    return { auth: null, lab: null, session: null, view: 'login', lines: [] }
  },
  async login({ email, password }) {
    const body = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    sessionStorage.setItem('cyberpod-csrf', body.csrf_token)
    return { user: { id: 'student', display_name: email }, csrf_token: body.csrf_token }
  },
  async logout() {
    sessionStorage.removeItem('cyberpod-csrf')
    return { ok: true }
  },
  async listLabs() {
    return request('/api/v1/labs')
  },
  async createSession(labId) {
    return request(`/api/v1/labs/${labId}/sessions`, { method: 'POST', body: '{}' })
  },
  async startSession(sessionId) {
    return request(`/api/v1/sessions/${sessionId}/start`, { method: 'POST', body: '{}' })
  },
  async getSessionStatus(sessionId) {
    return request(`/api/v1/sessions/${sessionId}/start`, { method: 'GET' }).catch(() => ({ session: null }))
  },
  async submitFlag(sessionId, { flag, expected_revision }) {
    return request(`/api/v1/sessions/${sessionId}/flags`, {
      method: 'POST',
      body: JSON.stringify({ flag, expected_revision }),
    })
  },
  setView() {},
  runCommand() { return ['Connect the training target to read the session flag.'] },
  getTerminal() { return ['Live API mode: submit the flag issued to this session.'] },
  getRevision(sessionId) { return Number(sessionId && 0) },
}
