import { useEffect, useRef, useState } from 'react'
import { api, DEMO_MODE } from './api/client.js'
import { LiveWorkspace } from './LiveWorkspace.jsx'
import { DEMO, TARGET } from './api/mock.js'
import { DragonMark, IconFirefox, IconFolder, IconNet, IconNotes, IconTerminal } from './icons.jsx'

function safeRestore() {
  try {
    return api.restore()
  } catch {
    return { auth: null, lab: null, session: null, view: 'login', lines: [] }
  }
}

function remainingSeconds(session, receivedAt) {
  if (!session?.expires_at || !session?.server_time) return 0
  const exp = Date.parse(session.expires_at)
  const server = Date.parse(session.server_time)
  if (Number.isNaN(exp) || Number.isNaN(server)) return 0
  const elapsed = (performance.now() - receivedAt) / 1000
  return Math.max(0, Math.floor((exp - server) / 1000 - elapsed))
}

function formatClock(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function LockScreen({ onSuccess, title = DEMO_MODE ? 'bisha' : 'CyberPod' }) {
  const [email, setEmail] = useState(DEMO_MODE ? DEMO.email : '')
  const [password, setPassword] = useState(DEMO_MODE ? 'bisha' : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  async function submit(e) {
    e.preventDefault()
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await onSuccess(await api.login({ email, password }))
    } catch (err) {
      setError(errorMessage(err))
    } finally { pending.current = false; setBusy(false) }
  }
  return (
    <div className="lock" dir="ltr">
      <div className="lock-top">
        <span>Kali GNU/Linux Rolling</span>
        <span>{formatClock(now)}</span>
      </div>
      <div className="lock-clock">
        <div className="lock-time">{formatClock(now)}</div>
        <div className="lock-date">{formatDate(now)}</div>
      </div>
      <form className="lock-card" onSubmit={submit}>
        <DragonMark size={86} />
        <h1>{title}</h1>
        <input aria-label="Username" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="Username" required />
        <input aria-label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Password" required />
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Starting…' : 'Unlock'}</button>
      </form>
    </div>
  )
}

function WindowFrame({ title, z, x, y, w, h, onFocus, onClose, onDragStart, children }) {
  return (
    <div className="xfwm" style={{ zIndex: z, left: x, top: y, width: w, height: h }} onMouseDown={onFocus}>
      <header className="xfwm-bar" onMouseDown={onDragStart}>
        <span className="xfwm-title">{title}</span>
        <span className="xfwm-btns">
          <i /><i /><button type="button" onClick={onClose} aria-label="Close">X</button>
        </span>
      </header>
      <div className="xfwm-body">{children}</div>
    </div>
  )
}

function TerminalApp({ lines, onCommand }) {
  const [cmd, setCmd] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)
  useEffect(() => { const output = endRef.current?.parentElement; if (output) output.scrollTop = output.scrollHeight }, [lines])
  return (
    <div className="qterm" onClick={() => inputRef.current?.focus()}>
      <div className="qterm-out">
        {(lines || []).map((line, i) => <p key={i}>{line}</p>)}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!cmd.trim()) return; onCommand(cmd); setCmd('') }}>
        <span className="prompt">bisha@kali:~</span>
        <div className="prompt-row">
          <span>$</span>
          <input aria-label="Terminal command" ref={inputRef} value={cmd} onChange={(e) => setCmd(e.target.value)} maxLength={220} spellCheck={false} autoComplete="off" />
        </div>
      </form>
    </div>
  )
}

function FirefoxApp({ sessionId, onStatus }) {
  const [url, setUrl] = useState(TARGET.url)
  const [page, setPage] = useState('login')
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [flag, setFlag] = useState(() => api.getPortalFlag?.(sessionId) || null)
  useEffect(() => {
    if (flag) setPage('inbox')
    onStatus()
  }, [sessionId])
  function go(e) {
    e?.preventDefault()
    const raw = url.trim().toLowerCase()
    let hostname = ''
    try { hostname = new URL(raw.includes('://') ? raw : `http://${raw}`).hostname } catch { /* show failure below */ }
    if ([TARGET.host, TARGET.hostname].includes(hostname)) {
      api.openPortal?.(sessionId)
      onStatus()
      setPage(flag ? 'inbox' : 'login')
    } else if (!raw || raw === 'about:home') setPage('home')
    else setPage('fail')
  }
  function submitLogin(e) {
    e.preventDefault()
    let res
    try { res = api.loginPortal?.(sessionId, user, pass) || { ok: false } }
    catch { setError('Session is unavailable'); return }
    if (res.ok) { setFlag(res.flag); setPage('inbox'); setError(''); onStatus() }
    else setError('Invalid credentials')
  }
  return (
    <div className="fx">
      <div className="fx-chrome">
        <div className="fx-tabs">
          <span className="fx-tab on">{page === 'inbox' ? 'Nirs Staff Console' : 'Nirs Central Bank'}</span>
          <span className="fx-tab">+</span>
        </div>
        <form className="fx-bar" onSubmit={go}>
          <button type="button" onClick={() => { setUrl(TARGET.url); setPage(flag ? 'inbox' : 'login') }}>Home</button>
          <input value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit">Go</button>
        </form>
      </div>
      <div className="fx-page">
        {page === 'home' && (
          <div className="fx-home">
            <h2>Firefox ESR</h2>
            <button type="button" className="linkish" onClick={() => { setUrl(TARGET.url); setPage('login'); api.openPortal?.(sessionId); onStatus() }}>{TARGET.url}</button>
          </div>
        )}
        {page === 'fail' && <div className="fx-home"><h2>Hmm. We cannot find that site.</h2></div>}
        {page === 'login' && (
          <div className="portal">
            <div className="portal-brand">NIRS</div>
            <h1>Central Bank</h1>
            <p>Staff Online Banking</p>
            <form onSubmit={submitLogin}>
              <label>Username</label>
              <input aria-label="Bank username" autoComplete="off" value={user} onChange={(e) => setUser(e.target.value)} />
              <label>Password</label>
              <input aria-label="Bank password" autoComplete="off" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
              {error && <div className="portal-err">{error}</div>}
              <button type="submit">Sign in</button>
            </form>
          </div>
        )}
        {page === 'inbox' && (
          <div className="portal-app">
            <aside><b>Nirs Central Bank</b><span className="on">Accounts</span><span>Transfers</span><span>Audit</span></aside>
            <section>
              <h2>Welcome, {TARGET.user}</h2>
              <article>
                <header>Treasury token</header>
                <code>{flag || api.getPortalFlag?.(sessionId) || ''}</code>
              </article>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function NetworkApp() {
  return (
    <div className="netmap">
      <p>lab net {TARGET.cidr}  tun0 UP</p>
      <div className="net-row">
        <div className="net-node"><b>kali</b>{TARGET.client}</div>
        <div className="net-line" />
        <div className="net-node"><b>gw</b>{TARGET.gateway}</div>
        <div className="net-line" />
        <div className="net-node target"><b>bank.nirs.lab</b>{TARGET.host}:80</div>
      </div>
    </div>
  )
}

const COMMANDS_WORDLIST = 'admin123\npassword\nletmein\nqwerty\nbisha\nnirs\nwelcome1'

function FilesApp() {
  return (
    <div className="thunar">
      <aside><b>Places</b><span>Home</span><span>Desktop</span><span>Documents</span></aside>
      <section>
        <div className="file-row">wordlist.txt</div>
        <div className="file-row">flag.txt</div>
        <pre>{COMMANDS_WORDLIST}</pre>
      </section>
    </div>
  )
}

function KaliDesktop({ session, lines, onCommand, onFlag, onLock, flagMsg, receivedAt, onRefresh, onLifecycle, busy }) {
  const [menu, setMenu] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [flag, setFlag] = useState('')
  const [wins, setWins] = useState({
    terminal: { open: true, z: 5, x: 108, y: 300, w: 720, h: 320 },
    browser: { open: true, z: 4, x: 220, y: 46, w: 820, h: 430 },
    net: { open: true, z: 3, x: 108, y: 46, w: 520, h: 180 },
    files: { open: false, z: 2, x: 280, y: 130, w: 560, h: 360 },
    notes: { open: false, z: 2, x: 420, y: 170, w: 380, h: 280 },
  })
  const drag = useRef(null)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    function move(e) {
      if (!drag.current) return
      const { key, ox, oy, sx, sy } = drag.current
      setWins((prev) => ({ ...prev, [key]: { ...prev[key], x: Math.max(0, sx + e.clientX - ox), y: Math.max(28, sy + e.clientY - oy) } }))
    }
    function up() { drag.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])
  function focus(key) {
    if (key === 'browser') {
      try { api.openPortal?.(session.session_id); onRefresh() } catch { onRefresh() }
    }
    setWins((prev) => {
      const max = Math.max(...Object.values(prev).map((w) => w.z))
      return { ...prev, [key]: { ...prev[key], open: true, z: max + 1 } }
    })
    setMenu(false)
  }
  function close(key) { setWins((prev) => ({ ...prev, [key]: { ...prev[key], open: false } })) }
  function startDrag(key, e) {
    if (e.button !== 0) return
    drag.current = { key, ox: e.clientX, oy: e.clientY, sx: wins[key].x, sy: wins[key].y }
    focus(key)
  }
  const remain = remainingSeconds(session, receivedAt)
  const mm = String(Math.floor(remain / 60)).padStart(2, '0')
  const ss = String(remain % 60).padStart(2, '0')
  return (
    <div className="kali" dir="ltr" onClick={() => setMenu(false)}>
      <header className="panel">
        <button type="button" className="panel-apps" onClick={(e) => { e.stopPropagation(); setMenu((v) => !v) }}>
          <DragonMark size={16} /> Applications
        </button>
        <span className="panel-places">Places</span>
        <span className="wifi">tun0 10.8.0.10</span>
        <span className="panel-mid">{mm}:{ss}</span>
        <span className="panel-right">
          <span>{formatClock(now)}</span>
          <button type="button" className="ghost" onClick={onLock}>Lock</button>
        </span>
      </header>
      {menu && (
        <nav className="appmenu" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => focus('terminal')}><IconTerminal /> QTerminal</button>
          <button type="button" onClick={() => focus('browser')}><IconFirefox /> Firefox ESR</button>
          <button type="button" onClick={() => focus('net')}><IconNet /> Lab Network</button>
          <button type="button" onClick={() => focus('files')}><IconFolder /> Thunar</button>
          <button type="button" onClick={() => focus('notes')}><IconNotes /> Mousepad</button>
        </nav>
      )}
      <div className="desk-icons">
        <button type="button" onClick={() => focus('terminal')}><IconTerminal />Terminal</button>
        <button type="button" onClick={() => focus('browser')}><IconFirefox />Firefox ESR</button>
        <button type="button" onClick={() => focus('net')}><IconNet />Lab Net</button>
        <button type="button" onClick={() => focus('files')}><IconFolder />Home</button>
        <button type="button" onClick={() => focus('notes')}><IconNotes />Lab Notes</button>
      </div>
      {wins.net.open && (
        <WindowFrame title="lab-net 10.8.0.0/24" z={wins.net.z} x={wins.net.x} y={wins.net.y} w={wins.net.w} h={wins.net.h} onFocus={() => focus('net')} onClose={() => close('net')} onDragStart={(e) => startDrag('net', e)}>
          <NetworkApp />
        </WindowFrame>
      )}
      {wins.terminal.open && (
        <WindowFrame title="bisha@kali: ~" z={wins.terminal.z} x={wins.terminal.x} y={wins.terminal.y} w={wins.terminal.w} h={wins.terminal.h} onFocus={() => focus('terminal')} onClose={() => close('terminal')} onDragStart={(e) => startDrag('terminal', e)}>
          <TerminalApp lines={lines} onCommand={onCommand} />
        </WindowFrame>
      )}
      {wins.browser.open && (
        <WindowFrame title="Mozilla Firefox ESR" z={wins.browser.z} x={wins.browser.x} y={wins.browser.y} w={wins.browser.w} h={wins.browser.h} onFocus={() => focus('browser')} onClose={() => close('browser')} onDragStart={(e) => startDrag('browser', e)}>
          <FirefoxApp sessionId={session.session_id} onStatus={onRefresh} />
        </WindowFrame>
      )}
      {wins.files.open && (
        <WindowFrame title="Home" z={wins.files.z} x={wins.files.x} y={wins.files.y} w={wins.files.w} h={wins.files.h} onFocus={() => focus('files')} onClose={() => close('files')} onDragStart={(e) => startDrag('files', e)}>
          <FilesApp />
        </WindowFrame>
      )}
      {wins.notes.open && (
        <WindowFrame title="lab-notes.txt" z={wins.notes.z} x={wins.notes.x} y={wins.notes.y} w={wins.notes.w} h={wins.notes.h} onFocus={() => focus('notes')} onClose={() => close('notes')} onDragStart={(e) => startDrag('notes', e)}>
          <div className="notes">
            <p>tun0 {TARGET.client}/24</p>
            <p>{TARGET.url}</p>
            <code>hydra -l bisha -P wordlist.txt 10.8.0.22 http-post-form "/login:username=^USER^&password=^PASS^:Invalid"</code>
          </div>
        </WindowFrame>
      )}
      <aside className="lab-tray">
        <b>{session.status} · Score {session.score?.earned || 0}/{session.score?.max || 100}</b>
        {(session.tasks || []).map((task, idx) => (
          <div key={task.id} className={task.status === 'COMPLETED' ? 'done' : ''}>{idx + 1}. {task.title}</div>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); onFlag(flag) }}>
          <input aria-label="Flag" value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="CYBERPOD{...}" maxLength={4096} disabled={!session.flag?.can_submit || busy} />
          <button type="submit" disabled={!session.flag?.can_submit || busy || !flag.trim()}>Submit flag</button>
        </form>
        {flagMsg && <small className={session.flag?.status === 'ACCEPTED' ? 'success' : 'error'}>{flagMsg}</small>}
        <div className="session-actions">
          {session.capabilities?.can_start && <button disabled={busy} onClick={() => onLifecycle('start')}>Resume</button>}
          {session.capabilities?.can_stop && <button disabled={busy} onClick={() => onLifecycle('stop')}>Pause</button>}
          {session.capabilities?.can_restart && <button disabled={busy} onClick={() => onLifecycle('restart')}>Restart lab</button>}
          <button disabled={busy} onClick={() => onLifecycle('cleanup')}>End lab</button>
        </div>
      </aside>
    </div>
  )
}

async function bootLab() {
  const labs = await api.listLabs()
  const lab = labs.labs[0]
  if (!lab) throw new Error('NO_LABS')
  const created = await api.createSession(lab.id)
  const started = created.session?.capabilities?.can_start === false ? created : await api.startSession(created.session.session_id)
  return { lab, session: started.session, lines: api.getTerminal(started.session.session_id) }
}

function errorMessage(error) {
  return ({
    INVALID_CREDENTIALS: 'Incorrect username or password.',
    RATE_LIMITED: 'Too many attempts. Please wait and try again.',
    NO_LABS: 'No labs are available. Check the backend lab configuration.',
    INVALID_API_RESPONSE: 'The API did not return JSON. Check the API address and proxy.',
    AUTH_REQUIRED: 'Your login expired. Please sign in again.',
    SESSION_EXPIRED: 'This session has expired. Start a new lab.',
    INVALID_STATE: 'The session changed. Refresh its status and try again.',
    TASKS_INCOMPLETE: 'Complete the lab tasks before submitting the flag.',
  })[error?.message] || error?.payload?.error?.message || error?.message || 'The request failed. Please try again.'
}

export default function App() {
  const [restored] = useState(safeRestore)
  const [auth, setAuth] = useState(restored.auth)
  const [lab, setLab] = useState(restored.lab)
  const [session, setSession] = useState(restored.session)
  const [lines, setLines] = useState(restored.lines || [])
  const [flagMsg, setFlagMsg] = useState('')
  const [receivedAt, setReceivedAt] = useState(() => performance.now())
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  function acceptSession(next) {
    if (!mounted.current || !next) return
    setSession((prev) => prev?.session_id === next.session_id && prev.revision > next.revision ? prev : next)
    setReceivedAt(performance.now())
    setLines(api.getTerminal(next.session_id))
  }
  async function enterDesktop(nextAuth) {
    if (!DEMO_MODE) { setAuth(nextAuth); return }
    const current = session && !['CLEANED', 'EXPIRED'].includes(session.status) ? session : null
    const booted = current ? { lab, session: (await api.getSessionStatus(current.session_id)).session } : await bootLab()
    setLab(booted.lab)
    acceptSession(booted.session)
    setAuth(nextAuth)
  }
  useEffect(() => {
    if (DEMO_MODE) return
    let active = true
    api.me().then(async (nextAuth) => {
      const { sessions } = await api.listSessions()
      if (!active) return
      setAuth(nextAuth)
      const current = sessions.find((row) => !['CLEANED', 'ERROR', 'EXPIRED'].includes(row.status))
      if (current) acceptSession(current)
    }).catch(() => { /* Normal signed-out state; login surfaces connection errors. */ })
    return () => { active = false }
  }, [])

  function report(error) {
    if (['AUTH_REQUIRED', 'UNAUTHENTICATED', 'UNAUTHORIZED'].includes(error.message) || error.status === 401) {
      setAuth(null); setSession(null); setLines([])
    }
    setFlagMsg(errorMessage(error))
  }
  async function refreshStatus() {
    if (!session) return
    try { acceptSession((await api.getSessionStatus(session.session_id)).session) }
    catch (error) { report(error) }
  }
  useEffect(() => {
    if (!auth || !session) return
    const timer = setInterval(refreshStatus, 3000)
    return () => clearInterval(timer)
  }, [auth, session?.session_id])

  async function action(fn) {
    if (pending.current) return
    pending.current = true; setBusy(true); setFlagMsg('')
    try { await fn() } catch (error) { report(error) }
    finally { pending.current = false; setBusy(false) }
  }
  async function lifecycle(name) {
    await action(async () => {
      const method = { start: 'startSession', stop: 'stopSession', restart: 'restartSession', cleanup: 'cleanupSession' }[name]
      const response = await api[method](session.session_id)
      if (name === 'cleanup') {
        setSession(null); setLines([])
        if (DEMO_MODE) setAuth(null)
      } else acceptSession(response.session)
    })
  }
  async function logout() {
    await action(async () => {
      await api.logout()
      setAuth(null); setSession(null); setLines([]); setLab(null)
    })
  }
  async function submitFlag(value) {
    await action(async () => {
      const latest = (await api.getSessionStatus(session.session_id)).session
      acceptSession(latest)
      const response = await api.submitFlag(session.session_id, { flag: value, expected_revision: latest.revision })
      acceptSession(response.session)
      setFlagMsg(response.result)
    })
  }
  if (!auth) return <LockScreen onSuccess={enterDesktop} />
  if (!DEMO_MODE) return <LiveWorkspace session={session} busy={busy} message={flagMsg}
    onLogout={logout} onLifecycle={lifecycle} onFlag={submitFlag} onRefresh={refreshStatus}
    onStart={(id) => action(async () => {
      const created = await api.createSession(id)
      // Keep the created session visible even if starting it fails.
      acceptSession(created.session)
      acceptSession((await api.startSession(created.session.session_id)).session)
    })} />
  if (!session) return <LockScreen onSuccess={enterDesktop} />
  return <KaliDesktop key={`${session.session_id}:${session.generation}:${session.status === 'STOPPED'}`}
    session={session} lines={lines} busy={busy} flagMsg={flagMsg} receivedAt={receivedAt}
    onLock={logout} onRefresh={refreshStatus} onLifecycle={lifecycle} onFlag={submitFlag}
    onCommand={(cmd) => action(async () => { api.runCommand(session.session_id, cmd); await refreshStatus() })} />
}
