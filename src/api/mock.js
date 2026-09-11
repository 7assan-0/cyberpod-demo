import { COMMANDS } from '../lab.js'
import { credentialsMatch, hashEquals, randomToken, RateGate, sanitizeInput, sha256hex } from '../security.js'

const DEMO = { email: 'demo@cyberpod.local' }
const STORAGE_KEY = 'cyberpod-demo-state'
const SESSION_MS = 30 * 60 * 1000
const logins = new RateGate(5, 5 * 60 * 1000)
const flags = new RateGate(8, 5 * 60 * 1000)
const runtimeSecrets = {}

const HYDRA_LAB = {
  id: 'hydra-ssh-101',
  name: 'Hydra Lab',
  description: 'مختبر تدريب SSH.',
  difficulty: 'Beginner',
  category: 'Brute Force',
  estimated_duration_minutes: 20,
  time_limit_seconds: 20 * 60,
  required_tools: ['nmap', 'hydra'],
  status: 'published',
  objectives: ['اكتشاف خدمة SSH', 'تشغيل Hydra', 'تسليم الـ Flag'],
  tasks: [
    { id: 'recon', title: 'استطلاع الهدف بـ Nmap', description: 'nmap 10.8.0.22', points: 20 },
    { id: 'identify', title: 'تحديد خدمة SSH', description: 'services', points: 15 },
    { id: 'hydra', title: 'تشغيل Hydra على SSH', description: 'hydra -l admin -P wordlist.txt ssh://10.8.0.22', points: 30 },
    { id: 'creds', title: 'الحصول على بيانات الدخول', description: 'بعد نجاح Hydra', points: 15 },
    { id: 'submit', title: 'تسليم الـ Flag', description: 'CYBERPOD{...}', points: 20 },
  ],
  max_score: 100,
  instructions: ['سجّل دخول', 'ابدأ الجلسة', 'نفّذ الأوامر', 'سلّم علم هذه الجلسة'],
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
    return { user: parsed.user || null, csrf: parsed.csrf || null, sessions: parsed.sessions || {}, view: parsed.view || (parsed.user ? 'lab' : 'login'), activeSessionId: parsed.activeSessionId || null, loggedAt: parsed.loggedAt || 0 }
  } catch { return empty() }
}
const db = loadState()
function persist() {
  const safe = JSON.parse(JSON.stringify(db))
  Object.values(safe.sessions || {}).forEach((row) => { delete row.flagPlain })
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
}
function error(code) {
  const err = new Error(code)
  err.payload = { error: { code } }
  throw err
}
function requireAuth() {
  if (!db.user) error('UNAUTHENTICATED')
  if (Date.now() - db.loggedAt > SESSION_MS) { db.user = null; persist(); error('SESSION_EXPIRED') }
}
function getRow(sessionId) { return db.sessions[sessionId] }
function toSession(row) {
  const completed = row.done
  const tasks = HYDRA_LAB.tasks.map((t, i) => {
    const prevDone = i === 0 ? true : completed.includes(HYDRA_LAB.tasks[i - 1].id)
    const status = completed.includes(t.id) ? 'COMPLETED' : i === 0 || prevDone ? 'AVAILABLE' : 'LOCKED'
    return { ...t, status }
  })
  const earned = HYDRA_LAB.tasks.filter((t) => completed.includes(t.id)).reduce((sum, t) => sum + t.points, 0)
  const running = row.status === 'RUNNING' || row.status === 'COMPLETED'
  const session = {
    session_id: row.id, lab_id: HYDRA_LAB.id, lab_name: HYDRA_LAB.name, revision: row.revision, status: row.status,
    server_time: new Date().toISOString(), created_at: row.created_at, started_at: row.started_at, expires_at: row.expires_at,
    completion_state: row.flagAccepted ? 'COMPLETED' : 'IN_PROGRESS',
    progress_percent: Math.round((completed.length / HYDRA_LAB.tasks.length) * 100),
    completed_tasks: completed.length, total_tasks: HYDRA_LAB.tasks.length,
    score: { earned, max: HYDRA_LAB.max_score }, tasks,
    flag: { status: row.flagAccepted ? 'ACCEPTED' : row.flagWrong ? 'INCORRECT' : 'NOT_SUBMITTED', can_submit: row.status === 'RUNNING' },
    desktop: { status: running ? 'READY' : 'UNAVAILABLE', url: running ? '/workspace' : null, expires_at: row.expires_at },
    target: { host: '10.8.0.22', name: 'target.cyberpod.local', ports: ['22/tcp ssh'], status: running ? 'READY' : 'UNKNOWN' },
    error: null,
  }
  if (JSON.stringify(session).includes('CYBERPOD{')) error('SECRET_LEAK')
  return session
}
async function issueFlag(row) {
  const flag = 'CYBERPOD{' + randomToken().slice(0, 16) + '}'
  runtimeSecrets[row.id] = flag
  row.flagHash = await sha256hex(flag)
}

export const mockApi = {
  restore() {
    if (!db.user) return { auth: null, lab: null, session: null, view: 'login', lines: [] }
    const session = db.activeSessionId && getRow(db.activeSessionId) ? toSession(getRow(db.activeSessionId)) : null
    return { auth: { user: db.user, csrf_token: db.csrf }, lab: HYDRA_LAB, session, view: db.view || 'lab', lines: session ? getRow(session.session_id).termLines : [] }
  },
  async login({ email, password }) {
    if (!logins.check()) error('RATE_LIMITED')
    if (!(await credentialsMatch(email, password))) error('INVALID_CREDENTIALS')
    db.user = { id: 'demo-student', display_name: 'Demo Student' }
    db.csrf = randomToken(); db.loggedAt = Date.now(); db.view = 'lab'; persist()
    return { user: db.user, csrf_token: db.csrf }
  },
  async logout() {
    Object.keys(runtimeSecrets).forEach((key) => delete runtimeSecrets[key])
    db.user = null; db.csrf = null; db.sessions = {}; db.view = 'login'; db.activeSessionId = null; db.loggedAt = 0; persist()
    return { ok: true }
  },
  async listLabs() { requireAuth(); return { labs: [HYDRA_LAB] } },
  async createSession(labId) {
    requireAuth()
    const id = 'ses_' + randomToken().slice(0, 10)
    const row = { id, labId, status: 'CREATED', revision: 1, created_at: now(), started_at: null, expires_at: null, done: [], flagAccepted: false, flagWrong: false, flagHash: '', termLines: ['CyberPod Demo Workspace', 'Training target: 10.8.0.22', 'Type `help` to begin.', ''] }
    await issueFlag(row)
    db.sessions[id] = row; db.activeSessionId = id; persist()
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
    if (!row.flagHash) await issueFlag(row)
    row.status = 'RUNNING'; row.started_at = now()
    row.expires_at = new Date(Date.now() + HYDRA_LAB.time_limit_seconds * 1000).toISOString()
    row.revision += 1; db.view = 'workspace'; db.activeSessionId = sessionId; persist()
    return { session: toSession(row) }
  },
  setView(view) { db.view = view; persist() },
  async submitFlag(sessionId, { flag, expected_revision }) {
    requireAuth()
    if (!flags.check()) error('RATE_LIMITED')
    const row = getRow(sessionId)
    if (!row) error('NOT_FOUND')
    if (expected_revision !== row.revision) error('REVISION_CONFLICT')
    const submission_id = 'sub_' + randomToken().slice(0, 8)
    if (await hashEquals(sanitizeInput(flag, 128), row.flagHash)) {
      if (!row.done.includes('submit')) row.done.push('submit')
      row.flagAccepted = true; row.status = 'COMPLETED'; row.revision += 1; persist()
      return { submission_id, result: 'ACCEPTED', session: toSession(row) }
    }
    row.flagWrong = true; row.revision += 1; persist()
    return { submission_id, result: 'INCORRECT', session: toSession(row) }
  },
  runCommand(sessionId, raw) {
    const row = getRow(sessionId)
    if (!row) return ['session not found']
    const clean = sanitizeInput(raw, 180)
    const lower = clean.trim().toLowerCase()
    row.termLines.push('kali@cyberpod:~$ ' + clean.trim())
    if (lower === 'clear') { row.termLines = []; persist(); return row.termLines }
    let output = ['command not found. type `help`']
    if (lower === 'help') output = COMMANDS.help
    if (lower === 'whoami') output = COMMANDS.whoami
    if (lower.startsWith('nmap')) { output = COMMANDS.nmap; if (!row.done.includes('recon')) row.done.push('recon') }
    if (lower === 'services') { output = COMMANDS.services; if (!row.done.includes('identify')) row.done.push('identify') }
    if (lower.startsWith('hydra')) { output = COMMANDS.hydra; if (!row.done.includes('hydra')) row.done.push('hydra'); if (!row.done.includes('creds')) row.done.push('creds') }
    if (lower.startsWith('cat')) {
      const issued = runtimeSecrets[sessionId]
      output = issued ? ['admin@10.8.0.22:~$ cat /root/flag.txt', issued] : ['flag is bound to this session and not in metadata']
      if (!row.done.includes('creds')) row.done.push('creds')
    }
    row.termLines.push(...output, ''); row.revision += 1; persist()
    return row.termLines
  },
  getTerminal(sessionId) { return getRow(sessionId)?.termLines || [] },
  getRevision(sessionId) { return getRow(sessionId)?.revision || 0 },
}

export { HYDRA_LAB, DEMO }
