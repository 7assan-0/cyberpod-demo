import { useEffect, useRef, useState } from 'react'
import { api, DEMO_MODE } from './api/client.js'
import { DEMO, TARGET } from './api/mock.js'
import { DragonMark, IconFirefox, IconFolder, IconNotes, IconTerminal } from './icons.jsx'

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

function LockScreen({ onSuccess, hint = true, title = 'bisha' }) {
  const [email, setEmail] = useState(DEMO.email || 'bisha')
  const [password, setPassword] = useState('bisha')
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  async function submit(e) {
    e.preventDefault()
    try {
      onSuccess(await api.login({ email, password }))
    } catch (err) {
      setError(err.message === 'RATE_LIMITED' ? 'Too many attempts' : 'Sorry, that did not work. Please try again.')
    }
  }
  return (
    <div className="lock" dir="ltr">
      <div className="lock-top">
        <span>Kali GNU/Linux Rolling</span>
        <span>{DEMO_MODE ? 'simulated session' : 'LIVE'}</span>
      </div>
      <div className="lock-clock">
        <div className="lock-time">{formatClock(now)}</div>
        <div className="lock-date">{formatDate(now)}</div>
      </div>
      <form className="lock-card" onSubmit={submit}>
        <DragonMark size={86} />
        <h1>{title}</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="Username" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Password" />
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit">Unlock</button>
        {hint && <small>bisha / bisha</small>}
      </form>
    </div>
  )
}

function WindowFrame({ title, icon, z, x, y, w, h, onFocus, onClose, onDragStart, children }) {
  return (
    <div className="xfwm" style={{ zIndex: z, left: x, top: y, width: w, height: h }} onMouseDown={onFocus}>
      <header className="xfwm-bar" onMouseDown={onDragStart}>
        <span className="xfwm-title">{icon} {title}</span>
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
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])
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
          <input ref={inputRef} value={cmd} onChange={(e) => setCmd(e.target.value)} maxLength={220} spellCheck={false} autoComplete="off" />
        </div>
      </form>
    </div>
  )
}

function FirefoxApp({ sessionId, onStatus }) {
  const [url, setUrl] = useState(TARGET.url)
  const [page, setPage] = useState('login')
  const [user, setUser] = useState(TARGET.user)
  const [pass, setPass] = useState(TARGET.pass)
  const [error, setError] = useState('')
  const [flag, setFlag] = useState(null)
  function go(e) {
    e?.preventDefault()
    const raw = url.trim().toLowerCase()
    if (raw.includes('10.8.0.22') || raw.includes('portal.nexora.lab') || raw.includes('nexora')) {
      api.openPortal?.(sessionId)
      onStatus()
      setPage(flag ? 'inbox' : 'login')
    } else if (!raw || raw === 'about:home') setPage('home')
    else setPage('fail')
  }
  function submitLogin(e) {
    e.preventDefault()
    const res = api.loginPortal?.(sessionId, user, pass) || { ok: false }
    if (res.ok) { setFlag(res.flag); setPage('inbox'); setError(''); onStatus() }
    else setError('Invalid credentials')
  }
  return (
    <div className="fx">
      <div className="fx-chrome">
        <div className="fx-tabs">
          <span className="fx-tab on">{page === 'inbox' ? 'Inbox - Nexora' : 'Nexora Employee Portal'}</span>
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
            <button type="button" className="linkish" onClick={() => { setUrl(TARGET.url); setPage('login'); api.openPortal?.(sessionId); onStatus() }}>http://10.8.0.22/login</button>
          </div>
        )}
        {page === 'fail' && <div className="fx-home"><h2>Hmm. We cannot find that site.</h2></div>}
        {page === 'login' && (
          <div className="portal">
            <div className="portal-brand">NEXORA</div>
            <h1>Employee Portal</h1>
            <form onSubmit={submitLogin}>
              <label>Username</label>
              <input value={user} onChange={(e) => setUser(e.target.value)} />
              <label>Password</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
              {error && <div className="portal-err">{error}</div>}
              <button type="submit">Sign in</button>
            </form>
          </div>
        )}
        {page === 'inbox' && (
          <div className="portal-app">
            <aside><b>Nexora Mail</b><span className="on">Inbox (1)</span><span>Sent</span></aside>
            <section>
              <h2>Welcome, {TARGET.user}</h2>
              <article>
                <header>IT Security - session token</header>
                <code>{flag || api.getPortalFlag?.(sessionId) || 'flag issued after Hydra / login'}</code>
              </article>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

const COMMANDS_WORDLIST = 'admin123\npassword\nletmein\nqwerty\nbisha\nnexora\nwelcome1'

function FilesApp() {
  return (
    <div className="thunar">
      <aside><b>Places</b><span>Home</span><span>Desktop</span><span>Documents</span></aside>
      <section>
        <div className="file-row">Desktop</div>
        <div className="file-row">wordlist.txt</div>
        <div className="file-row">flag.txt</div>
        <pre>{COMMANDS_WORDLIST}</pre>
      </section>
    </div>
  )
}

function KaliDesktop({ session, lines, onCommand, onFlag, onLock, flagMsg, receivedAt, onRefresh }) {
  const [menu, setMenu] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [flag, setFlag] = useState('')
  const [wins, setWins] = useState({
    terminal: { open: true, z: 4, x: 92, y: 78, w: 740, h: 440 },
    browser: { open: false, z: 3, x: 210, y: 46, w: 860, h: 560 },
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
          <button type="button" onClick={() => focus('files')}><IconFolder /> Thunar</button>
          <button type="button" onClick={() => focus('notes')}><IconNotes /> Mousepad</button>
        </nav>
      )}
      <div className="desk-icons">
        <button type="button" onClick={() => focus('terminal')}><IconTerminal />Terminal</button>
        <button type="button" onClick={() => focus('browser')}><IconFirefox />Firefox ESR</button>
        <button type="button" onClick={() => focus('files')}><IconFolder />Home</button>
        <button type="button" onClick={() => focus('notes')}><IconNotes />Lab Notes</button>
      </div>
      {wins.terminal.open && (
        <WindowFrame title="bisha@kali: ~" icon="" z={wins.terminal.z} x={wins.terminal.x} y={wins.terminal.y} w={wins.terminal.w} h={wins.terminal.h} onFocus={() => focus('terminal')} onClose={() => close('terminal')} onDragStart={(e) => startDrag('terminal', e)}>
          <TerminalApp lines={lines} onCommand={onCommand} />
        </WindowFrame>
      )}
      {wins.browser.open && (
        <WindowFrame title="Mozilla Firefox ESR" icon="" z={wins.browser.z} x={wins.browser.x} y={wins.browser.y} w={wins.browser.w} h={wins.browser.h} onFocus={() => focus('browser')} onClose={() => close('browser')} onDragStart={(e) => startDrag('browser', e)}>
          <FirefoxApp sessionId={session.session_id} onStatus={onRefresh} />
        </WindowFrame>
      )}
      {wins.files.open && (
        <WindowFrame title="Home" icon="" z={wins.files.z} x={wins.files.x} y={wins.files.y} w={wins.files.w} h={wins.files.h} onFocus={() => focus('files')} onClose={() => close('files')} onDragStart={(e) => startDrag('files', e)}>
          <FilesApp />
        </WindowFrame>
      )}
      {wins.notes.open && (
        <WindowFrame title="lab-notes.txt" icon="" z={wins.notes.z} x={wins.notes.x} y={wins.notes.y} w={wins.notes.w} h={wins.notes.h} onFocus={() => focus('notes')} onClose={() => close('notes')} onDragStart={(e) => startDrag('notes', e)}>
          <div className="notes">
            <p>Target: {TARGET.host}</p>
            <p>Firefox - http://10.8.0.22/login</p>
            <code>hydra -l bisha -P wordlist.txt 10.8.0.22 http-post-form "/login:username=^USER^&password=^PASS^:Invalid"</code>
          </div>
        </WindowFrame>
      )}
      <aside className="lab-tray">
        {session.tasks.map((task, idx) => (
          <div key={task.id} className={task.status === 'COMPLETED' ? 'done' : ''}>{idx + 1}. {task.title}</div>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); onFlag(flag) }}>
          <input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="CYBERPOD{...}" maxLength={4096} disabled={!session.flag?.can_submit} />
          <button type="submit" disabled={!session.flag?.can_submit}>Submit flag</button>
        </form>
        {flagMsg && <small className={session.flag?.status === 'ACCEPTED' ? 'success' : 'error'}>{flagMsg}</small>}
      </aside>
    </div>
  )
}

async function bootLab() {
  const labs = await api.listLabs()
  const lab = labs.labs[0]
  const created = await api.createSession(lab.id)
  const started = created.session?.capabilities?.can_start === false ? created : await api.startSession(created.session.session_id)
  return { lab, session: started.session, lines: api.getTerminal(started.session.session_id) }
}

export default function App() {
  const restored = safeRestore()
  const [auth, setAuth] = useState(restored.auth)
  const [lab, setLab] = useState(restored.lab)
  const [session, setSession] = useState(restored.session)
  const [view, setView] = useState(restored.view === 'workspace' && restored.session ? 'workspace' : 'login')
  const [lines, setLines] = useState(restored.lines || [])
  const [flagMsg, setFlagMsg] = useState('')
  const [receivedAt, setReceivedAt] = useState(() => performance.now())
  useEffect(() => {
    const id = setInterval(() => {}, 1000)
    return () => clearInterval(id)
  }, [])
  function acceptSession(next) {
    setSession(next)
    setReceivedAt(performance.now())
  }
  async function enterDesktop(nextAuth) {
    setAuth(nextAuth)
    const booted = session ? { lab, session, lines: api.getTerminal(session.session_id) } : await bootLab()
    setLab(booted.lab)
    acceptSession(booted.session)
    setLines(booted.lines)
    setView('workspace')
  }
  async function refreshStatus() {
    if (!session) return
    const r = await api.getSessionStatus(session.session_id)
    acceptSession(r.session)
    setLines(api.getTerminal(session.session_id))
  }
  if (!auth || view === 'login') return <LockScreen onSuccess={enterDesktop} />
  return (
    <KaliDesktop
      session={session}
      lines={lines}
      flagMsg={flagMsg}
      receivedAt={receivedAt}
      onLock={async () => {
        await api.logout()
        setAuth(null); setSession(null); setLines([]); setFlagMsg(''); setView('login')
      }}
      onRefresh={refreshStatus}
      onCommand={(cmd) => {
        api.runCommand(session.session_id, cmd)
        api.getSessionStatus(session.session_id).then((r) => {
          acceptSession(r.session)
          setLines(api.getTerminal(session.session_id))
        })
      }}
      onFlag={async (value) => {
        try {
          const res = await api.submitFlag(session.session_id, { flag: value, expected_revision: api.getRevision(session) })
          acceptSession(res.session)
          setFlagMsg(res.result)
        } catch (err) {
          setFlagMsg(err.message || 'ERROR')
        }
      }}
    />
  )
}
