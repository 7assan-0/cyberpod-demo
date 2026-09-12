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
  const [password, setPassword] = useState('')
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

function WindowFrame({ title, id, z, x, y, w, h, minimized, maximized, onFocus, onClose, onMinimize, onMaximize, onDragStart, onDragMove, onDragEnd, children }) {
  return (
    <section className="xfwm" role="dialog" aria-label={title} data-window={id} hidden={minimized}
      style={{ zIndex: z, left: x, top: y, width: w, height: h }} onPointerDown={onFocus}>
      <header className="xfwm-bar" onPointerDown={onDragStart} onPointerMove={onDragMove}
        onPointerUp={onDragEnd} onPointerCancel={onDragEnd} onLostPointerCapture={onDragEnd} onDoubleClick={onMaximize}>
        <span className="xfwm-title">{title}</span>
        <span className="xfwm-btns" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={onMinimize} aria-label={`Minimize ${title}`} title="Minimize">−</button>
          <button type="button" onClick={onMaximize} aria-label={`${maximized ? 'Restore' : 'Maximize'} ${title}`} title={maximized ? 'Restore' : 'Maximize'}>{maximized ? '❐' : '□'}</button>
          <button type="button" className="xfwm-close" onClick={onClose} aria-label={`Close ${title}`} title="Close">×</button>
        </span>
      </header>
      <div className="xfwm-body">{children}</div>
    </section>
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
  const [url, setUrl] = useState('')
  const [page, setPage] = useState('home')
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [flag, setFlag] = useState(() => api.getPortalFlag?.(sessionId) || null)
  function openBank() {
    api.openPortal?.(sessionId)
    onStatus()
    setUrl(TARGET.url)
    setPage(flag ? 'inbox' : 'login')
  }
  function go(e) {
    e?.preventDefault()
    const raw = url.trim().toLowerCase()
    let hostname = ''
    try { hostname = new URL(raw.includes('://') ? raw : `http://${raw}`).hostname } catch { /* show failure below */ }
    if ([TARGET.host, TARGET.hostname].includes(hostname)) {
      openBank()
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
          <span className="fx-tab on">{page === 'home' ? 'New Tab' : page === 'inbox' ? 'Nirs Staff Console' : 'Nirs Central Bank'}</span>
          <span className="fx-tab">+</span>
        </div>
        <form className="fx-bar" onSubmit={go}>
          <button type="button" onClick={() => { setUrl(''); setPage('home') }}>Home</button>
          <input aria-label="Browser address" placeholder="Enter a lab address" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit">Go</button>
        </form>
      </div>
      <div className="fx-page">
        {page === 'home' && (
          <div className="fx-home">
            <h2>Firefox ESR</h2>
            <p>Enter the training address above or open your lab bookmark.</p>
            <button type="button" className="linkish" onClick={openBank}>{TARGET.url}</button>
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

const DESKTOP_APPS = {
  terminal: { label: 'Terminal', x: 108, y: 300, w: 720, h: 320 },
  browser: { label: 'Firefox ESR', x: 220, y: 46, w: 820, h: 430 },
  net: { label: 'Lab Net', x: 108, y: 46, w: 520, h: 220 },
  files: { label: 'Home', x: 280, y: 130, w: 560, h: 360 },
  notes: { label: 'Lab Notes', x: 420, y: 170, w: 380, h: 280 },
}

function windowRect(win, bounds) {
  const maxWidth = Math.max(1, bounds.width - 16)
  const maxHeight = Math.max(1, bounds.height - 84)
  const w = win.maximized ? maxWidth : Math.min(win.w, maxWidth)
  const h = win.maximized ? maxHeight : Math.min(win.h, maxHeight)
  return {
    w, h,
    x: win.maximized ? 8 : Math.max(8, Math.min(win.x, bounds.width - w - 8)),
    y: win.maximized ? 38 : Math.max(38, Math.min(win.y, bounds.height - h - 46)),
  }
}

function KaliDesktop({ session, lines, onCommand, onFlag, onLock, flagMsg, receivedAt, onRefresh, onLifecycle, busy }) {
  const [menu, setMenu] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [flag, setFlag] = useState('')
  const [wins, setWins] = useState(() => Object.fromEntries(Object.entries(DESKTOP_APPS)
    .map(([key, win]) => [key, { ...win, open: false, minimized: false, maximized: false, z: 1 }])))
  const [bounds, setBounds] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const desktop = useRef(null)
  const drag = useRef(null)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(desktop.current)
    return () => observer.disconnect()
  }, [])
  function focus(key) {
    setWins((prev) => {
      const max = Math.max(...Object.values(prev).map((w) => w.z))
      return { ...prev, [key]: { ...prev[key], open: true, minimized: false, z: max + 1 } }
    })
    setMenu(false)
  }
  function close(key) {
    drag.current = null
    setWins((prev) => ({ ...prev, [key]: { ...prev[key], open: false, minimized: false } }))
  }
  function minimize(key) {
    drag.current = null
    setWins((prev) => ({ ...prev, [key]: { ...prev[key], minimized: true } }))
  }
  function maximize(key) {
    drag.current = null
    focus(key)
    setWins((prev) => ({ ...prev, [key]: { ...prev[key], maximized: !prev[key].maximized } }))
  }
  function startDrag(key, e) {
    if (e.button !== 0 || wins[key].maximized) return
    e.preventDefault()
    e.stopPropagation()
    const rect = windowRect(wins[key], bounds)
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { key, pointerId: e.pointerId, ox: e.clientX, oy: e.clientY, sx: rect.x, sy: rect.y }
    focus(key)
  }
  function moveDrag(e) {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return
    const { key, ox, oy, sx, sy } = drag.current
    setWins((prev) => {
      const { x, y } = windowRect({ ...prev[key], x: sx + e.clientX - ox, y: sy + e.clientY - oy }, bounds)
      return { ...prev, [key]: { ...prev[key], x, y } }
    })
  }
  function endDrag() { drag.current = null }
  function windowProps(key) {
    return { ...wins[key], ...windowRect(wins[key], bounds), id: key,
      onFocus: () => focus(key), onClose: () => close(key), onMinimize: () => minimize(key), onMaximize: () => maximize(key),
      onDragStart: (event) => startDrag(key, event), onDragMove: moveDrag, onDragEnd: endDrag }
  }
  const remain = remainingSeconds(session, receivedAt)
  const mm = String(Math.floor(remain / 60)).padStart(2, '0')
  const ss = String(remain % 60).padStart(2, '0')
  return (
    <div className="kali" ref={desktop} dir="ltr" onClick={() => setMenu(false)}>
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
      <div className="window-layer">
      {wins.net.open && (
        <WindowFrame title="lab-net 10.8.0.0/24" {...windowProps('net')}>
          <NetworkApp />
        </WindowFrame>
      )}
      {wins.terminal.open && (
        <WindowFrame title="bisha@kali: ~" {...windowProps('terminal')}>
          <TerminalApp lines={lines} onCommand={onCommand} />
        </WindowFrame>
      )}
      {wins.browser.open && (
        <WindowFrame title="Mozilla Firefox ESR" {...windowProps('browser')}>
          <FirefoxApp sessionId={session.session_id} onStatus={onRefresh} />
        </WindowFrame>
      )}
      {wins.files.open && (
        <WindowFrame title="Home" {...windowProps('files')}>
          <FilesApp />
        </WindowFrame>
      )}
      {wins.notes.open && (
        <WindowFrame title="lab-notes.txt" {...windowProps('notes')}>
          <div className="notes">
            <p>tun0 {TARGET.client}/24</p>
            <p>{TARGET.url}</p>
            <code>hydra -l bisha -P wordlist.txt 10.8.0.22 http-post-form "/login:username=^USER^&password=^PASS^:Invalid"</code>
          </div>
        </WindowFrame>
      )}
      </div>
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
      <footer className="desktop-taskbar" aria-label="Open applications">
        {!Object.values(wins).some((win) => win.open) && <span>Open an app from the desktop or Applications menu.</span>}
        {Object.entries(wins).filter(([, win]) => win.open).map(([key, win]) => (
          <button key={key} type="button" aria-label={`Show ${win.label}`} aria-pressed={!win.minimized} onClick={() => focus(key)}>{win.label}</button>
        ))}
      </footer>
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
