import { useEffect, useRef, useState } from 'react'
import { api, DEMO_MODE } from './api/client.js'
import { DEMO, TARGET } from './api/mock.js'

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

function KaliDragon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#0b1220" stroke="#2aa8c8" strokeWidth="2" />
      <path fill="#2ee6c7" d="M18 38c4-10 12-16 22-16 2 6 1 12-3 16 6-1 11 2 14 8-8 1-16-1-22-6-2 4-6 7-11 8 0-4 0-7 0-10z" />
      <circle cx="36" cy="28" r="2" fill="#071018" />
    </svg>
  )
}

function Login({ onSuccess }) {
  const [email, setEmail] = useState(DEMO.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    try {
      onSuccess(await api.login({ email, password }))
    } catch (err) {
      setError(err.message === 'RATE_LIMITED' ? 'Too many attempts' : 'Invalid credentials')
    }
  }
  return (
    <div className="lightdm" dir="ltr">
      <div className="lightdm-panel">
        <span>Kali GNU/Linux Rolling</span>
        <span>{formatClock(new Date())}</span>
      </div>
      <form className="lightdm-card" onSubmit={submit}>
        <KaliDragon size={72} />
        <h1>kali</h1>
        <p className="muted">CyberPod lab session</p>
        <label>Username</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit">Log In</button>
        <small className="muted">demo@cyberpod.local / CyberPodDemo123!</small>
      </form>
    </div>
  )
}

function LabHome({ lab, session, onStart }) {
  const score = session?.score?.earned || 0
  const max = session?.score?.max || lab.max_score
  const progress = session?.progress_percent || 0
  return (
    <div className="page" dir="rtl">
      <section className="hero">
        <span className="badge">{lab.id}</span>
        <h1>{lab.name}</h1>
        <p>{lab.description}</p>
      </section>
      <div className="grid grid-2">
        <article className="card">
          <h2>مختبر Hydra — بوابة ويب</h2>
          <div className="stats">
            <div className="stat"><b>{lab.difficulty}</b>المستوى</div>
            <div className="stat"><b>{score}/{max}</b>النقاط</div>
            <div className="stat"><b>{progress}%</b>التقدم</div>
            <div className="stat"><b>{lab.estimated_duration_minutes}د</b>الوقت</div>
          </div>
          <div className="progress"><span style={{ width: progress + '%' }} /></div>
          <p className="muted">بعد البدء تفتح سطح كالي محاكى: ترمينال + فايرفوكس + موقع Nexora.</p>
          <div style={{ marginTop: 18 }}>
            <button className="btn" onClick={onStart}>Start Kali Desktop</button>
          </div>
        </article>
        <article className="card">
          <h3>الأهداف</h3>
          <ul className="muted">{lab.objectives.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>
    </div>
  )
}

function WindowFrame({ title, icon, z, x, y, w, h, onFocus, onClose, onDragStart, children, className = '' }) {
  return (
    <div
      className={`xfwm ${className}`}
      style={{ zIndex: z, left: x, top: y, width: w, height: h }}
      onMouseDown={onFocus}
    >
      <header className="xfwm-bar" onMouseDown={onDragStart}>
        <span className="xfwm-title">{icon} {title}</span>
        <span className="xfwm-btns">
          <i /><i /><button type="button" onClick={onClose} aria-label="Close">✕</button>
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
        <span className="prompt">┌──(kali㉿kali)-[~]</span>
        <div className="prompt-row">
          <span>└─$</span>
          <input
            ref={inputRef}
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            maxLength={220}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </form>
    </div>
  )
}

function FirefoxApp({ sessionId, onStatus }) {
  const [url, setUrl] = useState(TARGET.url)
  const [page, setPage] = useState('login')
  const [user, setUser] = useState('admin')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [flag, setFlag] = useState(null)

  function go(e) {
    e?.preventDefault()
    const raw = url.trim().toLowerCase()
    if (raw.includes('10.8.0.22') || raw.includes('portal.nexora.lab') || raw.includes('nexora')) {
      api.openPortal?.(sessionId)
      onStatus()
      setPage(flag ? 'inbox' : 'login')
    } else if (!raw || raw === 'about:home') {
      setPage('home')
    } else {
      setPage('fail')
    }
  }

  function submitLogin(e) {
    e.preventDefault()
    const res = api.loginPortal?.(sessionId, user, pass) || { ok: false }
    if (res.ok) {
      setFlag(res.flag)
      setPage('inbox')
      setError('')
      onStatus()
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="fx">
      <div className="fx-chrome">
        <div className="fx-tabs">
          <span className="fx-tab on">{page === 'inbox' ? 'Inbox — Nexora' : 'Nexora Employee Portal'}</span>
          <span className="fx-tab">+</span>
        </div>
        <form className="fx-bar" onSubmit={go}>
          <button type="button" onClick={() => { setUrl(TARGET.url); setPage(flag ? 'inbox' : 'login') }}>⌂</button>
          <input value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit">Go</button>
        </form>
      </div>
      <div className="fx-page">
        {page === 'home' && (
          <div className="fx-home">
            <h2>Firefox ESR</h2>
            <p>Open the lab target:</p>
            <button type="button" className="linkish" onClick={() => { setUrl(TARGET.url); setPage('login'); api.openPortal?.(sessionId); onStatus() }}>
              http://10.8.0.22/login
            </button>
          </div>
        )}
        {page === 'fail' && <div className="fx-home"><h2>Hmm. We can’t find that site.</h2><p>Check the address and try again.</p></div>}
        {page === 'login' && (
          <div className="portal">
            <div className="portal-brand">NEXORA</div>
            <h1>Employee Portal</h1>
            <p>Restricted access. Authorized staff only.</p>
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
            <aside>
              <b>Nexora Mail</b>
              <span className="on">Inbox (1)</span>
              <span>Sent</span>
              <span>Admin</span>
            </aside>
            <section>
              <h2>Welcome, {TARGET.user}</h2>
              <article>
                <header>IT Security — session token</header>
                <p>Do not share this token outside the lab.</p>
                <code>{flag || api.getPortalFlag?.(sessionId) || 'flag issued after Hydra / login'}</code>
              </article>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function FilesApp() {
  return (
    <div className="thunar">
      <aside>
        <b>Places</b>
        <span>Home</span>
        <span>Desktop</span>
        <span>Documents</span>
        <span>Downloads</span>
      </aside>
      <section>
        <div className="file-row">📁 Desktop</div>
        <div className="file-row">📁 wordlists</div>
        <div className="file-row">📄 wordlist.txt</div>
        <div className="file-row">📄 flag.txt</div>
        <pre>{COMMANDS_WORDLIST}</pre>
      </section>
    </div>
  )
}

const COMMANDS_WORDLIST = `admin123
password
letmein
qwerty
summer2024
nexora
welcome1`

function KaliDesktop({ session, lines, onCommand, onFlag, onLeave, flagMsg, receivedAt, onRefresh }) {
  const [menu, setMenu] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [flag, setFlag] = useState('')
  const [wins, setWins] = useState({
    terminal: { open: true, z: 4, x: 70, y: 70, w: 720, h: 430 },
    browser: { open: false, z: 3, x: 180, y: 40, w: 820, h: 540 },
    files: { open: false, z: 2, x: 260, y: 120, w: 560, h: 360 },
    notes: { open: false, z: 2, x: 400, y: 160, w: 360, h: 280 },
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
      setWins((prev) => ({
        ...prev,
        [key]: { ...prev[key], x: Math.max(0, sx + e.clientX - ox), y: Math.max(28, sy + e.clientY - oy) },
      }))
    }
    function up() { drag.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  function focus(key) {
    setWins((prev) => {
      const max = Math.max(...Object.values(prev).map((w) => w.z))
      return { ...prev, [key]: { ...prev[key], open: true, z: max + 1 } }
    })
    setMenu(false)
  }
  function close(key) {
    setWins((prev) => ({ ...prev, [key]: { ...prev[key], open: false } }))
  }
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
          <KaliDragon size={18} /> Applications
        </button>
        <span className="panel-places">Places</span>
        <span className="panel-mid">{session.lab_name} · {mm}:{ss}</span>
        <span className="panel-right">
          <span>{session.score?.earned || 0}/{session.score?.max || 100}</span>
          <span>{formatClock(now)}</span>
          <button type="button" className="ghost" onClick={onLeave}>Leave</button>
        </span>
      </header>
      {menu && (
        <nav className="appmenu" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => focus('terminal')}>⬛ QTerminal</button>
          <button type="button" onClick={() => focus('browser')}>🦊 Firefox ESR</button>
          <button type="button" onClick={() => focus('files')}>📁 Thunar</button>
          <button type="button" onClick={() => focus('notes')}>📝 Mousepad</button>
        </nav>
      )}
      <div className="desk-icons">
        <button type="button" onDoubleClick={() => focus('terminal')} onClick={() => focus('terminal')}>
          <span>⬛</span>Terminal
        </button>
        <button type="button" onDoubleClick={() => focus('browser')} onClick={() => focus('browser')}>
          <span>🦊</span>Firefox ESR
        </button>
        <button type="button" onDoubleClick={() => focus('files')} onClick={() => focus('files')}>
          <span>📁</span>Home
        </button>
        <button type="button" onDoubleClick={() => focus('notes')} onClick={() => focus('notes')}>
          <span>📝</span>Lab Notes
        </button>
      </div>

      {wins.terminal.open && (
        <WindowFrame title="kali@kali: ~" icon="⬛" z={wins.terminal.z} x={wins.terminal.x} y={wins.terminal.y} w={wins.terminal.w} h={wins.terminal.h} onFocus={() => focus('terminal')} onClose={() => close('terminal')} onDragStart={(e) => startDrag('terminal', e)}>
          <TerminalApp lines={lines} onCommand={onCommand} />
        </WindowFrame>
      )}
      {wins.browser.open && (
        <WindowFrame title="Firefox ESR" icon="🦊" z={wins.browser.z} x={wins.browser.x} y={wins.browser.y} w={wins.browser.w} h={wins.browser.h} onFocus={() => focus('browser')} onClose={() => close('browser')} onDragStart={(e) => startDrag('browser', e)}>
          <FirefoxApp sessionId={session.session_id} onStatus={onRefresh} />
        </WindowFrame>
      )}
      {wins.files.open && (
        <WindowFrame title="Home — File Manager" icon="📁" z={wins.files.z} x={wins.files.x} y={wins.files.y} w={wins.files.w} h={wins.files.h} onFocus={() => focus('files')} onClose={() => close('files')} onDragStart={(e) => startDrag('files', e)}>
          <FilesApp />
        </WindowFrame>
      )}
      {wins.notes.open && (
        <WindowFrame title="lab-notes.txt — Mousepad" icon="📝" z={wins.notes.z} x={wins.notes.x} y={wins.notes.y} w={wins.notes.w} h={wins.notes.h} onFocus={() => focus('notes')} onClose={() => close('notes')} onDragStart={(e) => startDrag('notes', e)}>
          <div className="notes">
            <p>Target: {TARGET.host} ({TARGET.hostname})</p>
            <p>Open Firefox → http://10.8.0.22/login</p>
            <p>Scan: nmap 10.8.0.22</p>
            <p>Attack:</p>
            <code>hydra -l admin -P wordlist.txt 10.8.0.22 http-post-form "/login:username=^USER^&password=^PASS^:Invalid"</code>
          </div>
        </WindowFrame>
      )}

      <aside className="lab-tray">
        {session.tasks.map((task, idx) => (
          <div key={task.id} className={task.status === 'COMPLETED' ? 'done' : ''}>
            {idx + 1}. {task.title}
          </div>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); onFlag(flag) }}>
          <input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="CYBERPOD{...}" maxLength={4096} disabled={!session.flag?.can_submit} />
          <button type="submit" disabled={!session.flag?.can_submit}>Submit flag</button>
        </form>
        {flagMsg && <small className={session.flag?.status === 'ACCEPTED' ? 'success' : 'error'}>{flagMsg}</small>}
        <small>{DEMO_MODE ? 'simulated Kali · no real network' : 'LIVE'}</small>
      </aside>
    </div>
  )
}

export default function App() {
  const restored = safeRestore()
  const [auth, setAuth] = useState(restored.auth)
  const [lab, setLab] = useState(restored.lab)
  const [session, setSession] = useState(restored.session)
  const [view, setView] = useState(restored.view || 'login')
  const [lines, setLines] = useState(restored.lines || [])
  const [flagMsg, setFlagMsg] = useState('')
  const [receivedAt, setReceivedAt] = useState(() => performance.now())
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  function acceptSession(next) {
    setSession(next)
    setReceivedAt(performance.now())
  }
  async function refreshStatus() {
    if (!session) return
    const r = await api.getSessionStatus(session.session_id)
    acceptSession(r.session)
    setLines(api.getTerminal(session.session_id))
  }
  if (!auth) return <Login onSuccess={async (next) => {
    setAuth(next)
    setLab((await api.listLabs()).labs[0])
    setView('lab')
  }} />
  return (
    <div className="app-shell">
      {view === 'workspace' && session ? (
        <KaliDesktop
          session={session}
          lines={lines}
          flagMsg={flagMsg}
          receivedAt={receivedAt}
          onLeave={() => { api.setView('lab'); setView('lab') }}
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
      ) : lab ? (
        <div>
          <header className="topbar">
            <div className="brand"><KaliDragon size={22} /><div>CyberPod</div><span className="badge">{DEMO_MODE ? 'DEMO' : 'LIVE'}</span></div>
            <button className="btn secondary" onClick={async () => { await api.logout(); setAuth(null); setSession(null); setLines([]); setFlagMsg(''); setView('login') }}>خروج</button>
          </header>
          <LabHome lab={lab} session={session} onStart={async () => {
            const created = await api.createSession(lab.id)
            const started = created.session?.capabilities?.can_start === false
              ? created
              : await api.startSession(created.session.session_id)
            acceptSession(started.session)
            setLines(api.getTerminal(started.session.session_id))
            setFlagMsg('')
            setView('workspace')
          }} />
        </div>
      ) : <Login onSuccess={async (next) => { setAuth(next); setLab((await api.listLabs()).labs[0]); setView('lab') }} />}
    </div>
  )
}
