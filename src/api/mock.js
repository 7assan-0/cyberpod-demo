import { COMMANDS, TARGET } from '../lab.js'
import { credentialsMatch, hashEquals, randomToken, RateGate, sha256hex } from '../security.js'

const DEMO = { email: 'bisha' }
const STORAGE_KEY = 'cyberpod-demo-state'
const SESSION_MS = 30 * 60 * 1000
const logins = new RateGate(5, 5 * 60 * 1000)
const flags = new RateGate(8, 5 * 60 * 1000)
const runtimeSecrets = {}

const HYDRA_LAB = {
  id: 'hydra-ssh-101',
  name: 'Hydra Lab',
  description: 'سطح كالي محاكى. اكتشف بوابة Nexora ثم اكسرها بـ Hydra.',
  difficulty: 'Beginner',
  category: 'Brute Force',
  estimated_duration_minutes: 20,
  time_limit_seconds: 20 * 60,
  required_tools: ['nmap', 'hydra', 'firefox'],
  status: 'AVAILABLE',
  objectives: ['امسح الهدف', 'افتح الموقع الافتراضي', 'شغّل Hydra', 'ادخل للموقع', 'سلّم العلم'],
  tasks: [
    { id: 'recon', title: 'استطلاع الهدف بـ Nmap', description: 'امسح الهدف التدريبي', points: 20 },
    { id: 'identify', title: 'تحديد بوابة الويب', description: 'أكد خدمة HTTP وافتح الموقع', points: 15 },
    { id: 'hydra', title: 'تشغيل Hydra على الموقع', description: 'اكسر نموذج تسجيل الدخول', points: 30 },
    { id: 'creds', title: 'الدخول للموقع بالبيانات', description: 'سجّل دخول في بوابة Nexora', points: 15 },
    { id: 'submit', title: 'تسليم الـ Flag', description: 'سلّم العلم الصادر لهذه الجلسة', points: 20 },
  ],
  max_score: 100,
  instructions: ['سجّل دخول', 'ابدأ المختبر', 'افتح الترمينال والمتصفح', 'سلّم علم هذه الجلسة'],
}

const now = () => new Date().toISOString()
function empty() {
  return { user: null, csrf: null, sessions: {}, view: 'login', activeSessionId: null, loggedAt: 0 }
}
function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw)
    if (parsed.loggedAt && Date.now() - parsed.loggedAt > SESSION_MS) return empty()
    return {
      user: parsed.user || null,
      csrf: parsed.csrf || null,
      sessions: parsed.sessions || {},
      view: parsed.view || (parsed.user ? 'lab' : 'login'),
      activeSessionId: parsed.activeSessionId || null,
      loggedAt: parsed.loggedAt || 0,
    }
  } catch {
    return empty()
  }
}
const db = loadState()
function persist() {
  const safe = JSON.parse(JSON.stringify(db))
  Object.values(safe.sessions || {}).forEach((row) => {
    delete row.flagPlain
  })
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
}
function error(code) {
  const err = new Error(code)
  err.payload = { error: { code } }
  throw err
}
function requireAuth() {
  if (!db.user) error('UNAUTHENTICATED')
  if (Date.now() - db.loggedAt > SESSION_MS) {
    db.user = null
    persist()
    error('SESSION_EXPIRED')
  }
}
function getRow(sessionId) {
  return db.sessions[sessionId]
}
function leaked(session, rowId) {
  const issued = runtimeSecrets[rowId]
  return Boolean(issued && JSON.stringify(session).includes(issued))
}
function toSession(row) {
  const completed = row.done
  const tasks = HYDRA_LAB.tasks.map((t, i) => {
    const prevDone = i === 0 ? true : completed.includes(HYDRA_LAB.tasks[i - 1].id)
    const status = completed.includes(t.id) ? 'COMPLETED' : i === 0 || prevDone ? 'AVAILABLE' : 'LOCKED'
    return { ...t, status }
  })
  const earned = HYDRA_LAB.tasks.filter((t) => completed.includes(t.id)).reduce((sum, t) => sum + t.points, 0)
  const running = row.status === 'RUNNING'
  const completedRun = row.flagAccepted
  const session = {
    session_id: row.id,
    lab_id: HYDRA_LAB.id,
    lab_name: HYDRA_LAB.name,
    revision: row.revision,
    generation: row.generation,
    status: completedRun && running ? 'COMPLETED' : row.status,
    server_time: now(),
    created_at: row.created_at,
    started_at: row.started_at,
    expires_at: row.expires_at,
    completion_state: completedRun ? 'COMPLETED' : 'IN_PROGRESS',
    progress_percent: Math.round((completed.length / HYDRA_LAB.tasks.length) * 100),
    completed_tasks: completed.length,
    total_tasks: HYDRA_LAB.tasks.length,
    score: { earned, max: HYDRA_LAB.max_score },
    tasks,
    flag: {
      status: row.flagAccepted ? 'ACCEPTED' : row.flagWrong ? 'INCORRECT' : 'NOT_SUBMITTED',
      can_submit: running && !row.flagAccepted,
    },
    capabilities: {
      can_start: row.status === 'CREATED' || row.status === 'STOPPED',
      can_stop: running || row.status === 'STARTING',
      can_restart: running || row.status === 'STOPPED' || row.status === 'COMPLETED',
    },
    desktop: {
      status: running || completedRun ? 'READY' : 'UNAVAILABLE',
      url: running || completedRun ? '/workspace' : null,
      expires_at: running || completedRun ? row.expires_at : null,
    },
    target: { status: running ? 'READY' : row.status === 'STARTING' ? 'STARTING' : 'UNKNOWN' },
    error: null,
  }
  if (leaked(session, row.id)) error('SECRET_LEAK')
  return session
}
async function issueFlag(row) {
  const flag = 'CYBERPOD{' + randomToken().slice(0, 16) + '}'
  runtimeSecrets[row.id] = flag
  row.flagHash = await sha256hex(flag)
}
function mark(row, id) {
  if (!row.done.includes(id)) row.done.push(id)
}

export const mockApi = {
  restore() {
    if (!db.user) return { auth: null, lab: null, session: null, view: 'login', lines: [] }
    const session = db.activeSessionId && getRow(db.activeSessionId) ? toSession(getRow(db.activeSessionId)) : null
    return {
      auth: { user: db.user, csrf_token: db.csrf },
      lab: HYDRA_LAB,
      session,
      view: db.view || 'lab',
      lines: session ? getRow(session.session_id).termLines : [],
    }
  },
  async me() {
    requireAuth()
    return { user: db.user, csrf_token: db.csrf }
  },
  async login({ email, password }) {
    if (!logins.check()) error('RATE_LIMITED')
    if (!(await credentialsMatch(email, password))) error('INVALID_CREDENTIALS')
    db.user = { id: 'bisha', display_name: 'bisha' }
    db.csrf = randomToken()
    db.loggedAt = Date.now()
    db.view = 'lab'
    persist()
    return { user: db.user, csrf_token: db.csrf }
  },
  async logout() {
    Object.keys(runtimeSecrets).forEach((key) => delete runtimeSecrets[key])
    db.user = null
    db.csrf = null
    db.sessions = {}
    db.view = 'login'
    db.activeSessionId = null
    db.loggedAt = 0
    persist()
    return { ok: true }
  },
  async listLabs() {
    requireAuth()
    return { labs: [HYDRA_LAB] }
  },
  async getLab(labId) {
    requireAuth()
    if (labId !== HYDRA_LAB.id) error('NOT_FOUND')
    return { lab: HYDRA_LAB }
  },
  async listSessions() {
    requireAuth()
    return { sessions: Object.values(db.sessions).map(toSession).reverse() }
  },
  async createSession(labId) {
    requireAuth()
    if (HYDRA_LAB.status !== 'AVAILABLE') error('LAB_UNAVAILABLE')
    if (labId !== HYDRA_LAB.id) error('NOT_FOUND')
    const id = 'ses_' + randomToken().slice(0, 10)
    const row = {
      id,
      labId,
      status: 'CREATED',
      revision: 1,
      generation: 1,
      created_at: now(),
      started_at: null,
      expires_at: null,
      done: [],
      flagAccepted: false,
      flagWrong: false,
      flagHash: '',
      portalUnlocked: false,
      termLines: [
        'Linux kali 6.8.11-amd64 x86_64 GNU/Linux',
        'Type `help` to list lab commands.',
        '',
      ],
    }
    db.sessions[id] = row
    db.activeSessionId = id
    persist()
    return { session: toSession(row) }
  },
  async getSessionStatus(sessionId) {
    requireAuth()
    const row = getRow(sessionId)
    if (!row) error('NOT_FOUND')
    return { session: toSession(row) }
  },
  async startSession(sessionId) {
    requireAuth()
    const row = getRow(sessionId)
    if (!row) error('NOT_FOUND')
    if (row.status === 'RUNNING') return { session: toSession(row) }
    if (!row.flagHash) await issueFlag(row)
    row.status = 'RUNNING'
    row.started_at = now()
    row.expires_at = new Date(Date.now() + HYDRA_LAB.time_limit_seconds * 1000).toISOString()
    row.revision += 1
    db.view = 'workspace'
    db.activeSessionId = sessionId
    persist()
    return { session: toSession(row) }
  },
  async stopSession(sessionId) {
    requireAuth()
    const row = getRow(sessionId)
    if (!row) error('NOT_FOUND')
    if (row.status !== 'CLEANED') row.status = 'STOPPED'
    row.revision += 1
    persist()
    return { session: toSession(row) }
  },
  async restartSession(sessionId) {
    requireAuth()
    const row = getRow(sessionId)
    if (!row) error('NOT_FOUND')
    delete runtimeSecrets[sessionId]
    row.generation += 1
    row.done = []
    row.flagAccepted = false
    row.flagWrong = false
    row.flagHash = ''
    row.portalUnlocked = false
    row.status = 'CREATED'
    row.started_at = null
    row.expires_at = null
    row.revision += 1
    row.termLines = ['Session restarted.', '']
    persist()
    return this.startSession(sessionId)
  },
  setView(view) {
    db.view = view
    persist()
  },
  async submitFlag(sessionId, { flag, expected_revision }) {
    requireAuth()
    if (!flags.check()) error('RATE_LIMITED')
    const row = getRow(sessionId)
    if (!row) error('NOT_FOUND')
    if (row.status !== 'RUNNING') error('INVALID_STATE')
    if (expected_revision !== row.revision) error('INVALID_STATE')
    const submission_id = 'sub_' + randomToken().slice(0, 8)
    const value = String(flag ?? '')
    if (value.length < 1 || value.length > 4096) error('INVALID_FLAG')
    if (row.flagAccepted) {
      return { submission_id, result: 'ALREADY_ACCEPTED', session: toSession(row) }
    }
    if (await hashEquals(value, row.flagHash)) {
      mark(row, 'submit')
      row.flagAccepted = true
      row.revision += 1
      persist()
      return { submission_id, result: 'ACCEPTED', session: toSession(row) }
    }
    row.flagWrong = true
    row.revision += 1
    persist()
    return { submission_id, result: 'INCORRECT', session: toSession(row) }
  },
  loginPortal(sessionId, username, password) {
    const row = getRow(sessionId)
    if (!row || row.status !== 'RUNNING') return { ok: false, reason: 'offline' }
    const userOk = String(username || '').trim().toLowerCase() === TARGET.user
    const passOk = String(password || '') === TARGET.pass
    if (!userOk || !passOk) return { ok: false, reason: 'invalid' }
    row.portalUnlocked = true
    mark(row, 'identify')
    mark(row, 'creds')
    row.revision += 1
    persist()
    return { ok: true, flag: runtimeSecrets[sessionId] || null }
  },
  openPortal(sessionId) {
    const row = getRow(sessionId)
    if (!row) return
    mark(row, 'identify')
    row.revision += 1
    persist()
  },
  getPortalFlag(sessionId) {
    const row = getRow(sessionId)
    if (!row?.portalUnlocked) return null
    return runtimeSecrets[sessionId] || null
  },
  runCommand(sessionId, raw) {
    const row = getRow(sessionId)
    if (!row) return ['session not found']
    const clean = String(raw || '').replace(/[\u0000-\u001f]/g, '').slice(0, 220)
    const lower = clean.trim().toLowerCase()
    row.termLines.push('bisha@kali:~$ ' + clean.trim())
    if (lower === 'clear') {
      row.termLines = []
      persist()
      return row.termLines
    }
    let output = ['command not found. type `help`']
    if (lower === 'help') output = COMMANDS.help
    if (lower === 'whoami') output = COMMANDS.whoami
    if (lower === 'pwd') output = COMMANDS.pwd
    if (lower === 'ls' || lower.startsWith('ls ')) output = COMMANDS.ls
    if (lower.startsWith('nmap')) {
      output = COMMANDS.nmap
      mark(row, 'recon')
    }
    if (lower.startsWith('curl') || lower === 'services') {
      output = COMMANDS.curl
      mark(row, 'identify')
    }
    if (lower.startsWith('hydra')) {
      output = COMMANDS.hydra
      mark(row, 'hydra')
      mark(row, 'creds')
    }
    if (lower.includes('wordlist') && (lower.startsWith('cat') || lower.startsWith('less') || lower.startsWith('more'))) {
      output = COMMANDS.wordlist
    }
    if (lower.startsWith('cat flag') || lower === 'cat flag.txt') {
      const issued = runtimeSecrets[sessionId]
      output = row.done.includes('hydra') && issued
        ? [issued]
        : ['cat: flag.txt: Permission denied']
    }
    row.termLines.push(...output, '')
    row.revision += 1
    persist()
    return row.termLines
  },
  getTerminal(sessionId) {
    return getRow(sessionId)?.termLines || []
  },
  getRevision(session) {
    if (session && typeof session === 'object') return Number(session.revision) || 0
    return getRow(session)?.revision || 0
  },
}

export { HYDRA_LAB, DEMO, TARGET }
