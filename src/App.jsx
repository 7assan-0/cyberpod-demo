import { useEffect, useRef, useState } from 'react'
import { api, DEMO_MODE } from './api/client.js'
import { DEMO } from './api/mock.js'

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

function Topbar({ user, view, onLogout }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">⬡</div>
        <div>CyberPod</div>
        <span className="badge">{DEMO_MODE ? 'DEMO MODE' : 'LIVE'}</span>
      </div>
      <div className="muted" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span>{view}</span>
        {user && <span className="mono">{user.display_name}</span>}
        {user && <button className="btn secondary" onClick={onLogout}>خروج</button>}
      </div>
    </header>
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
      setError(err.message === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'INVALID_CREDENTIALS')
    }
  }
  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <span className="badge">CHROME DEMO MVP</span>
        <h1>تسجيل الدخول</h1>
        <label>البريد</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label>كلمة المرور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <div className="error">{error}</div>}
        <div style={{ marginTop: 18 }}><button className="btn" type="submit">دخول</button></div>
      </form>
    </div>
  )
}

function LabHome({ lab, session, onStart }) {
  const score = session?.score?.earned || 0
  const max = session?.score?.max || lab.max_score
  const progress = session?.progress_percent || 0
  return (
    <div className="page">
      <section className="hero">
        <span className="badge">{lab.id}</span>
        <h1>{lab.name}</h1>
        <p>{lab.description}</p>
      </section>
      <div className="grid grid-2">
        <article className="card">
          <h2>{lab.name}</h2>
          <div className="stats">
            <div className="stat"><b>{lab.difficulty}</b>المستوى</div>
            <div className="stat"><b>{score}/{max}</b>النقاط</div>
            <div className="stat"><b>{progress}%</b>التقدم</div>
            <div className="stat"><b>{lab.estimated_duration_minutes}د</b>الوقت</div>
          </div>
          <div className="progress"><span style={{ width: progress + '%' }} /></div>
          <div style={{ marginTop: 18 }}>
            <button className="btn" onClick={onStart}>Start Lab</button>
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

function Workspace({ session, lines, onCommand, onFlag, onBack, flagMsg, receivedAt }) {
  const [flag, setFlag] = useState('')
  const [cmd, setCmd] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])
  const remain = remainingSeconds(session, receivedAt)
  const mm = String(Math.floor(remain / 60)).padStart(2, '0')
  const ss = String(remain % 60).padStart(2, '0')
  return (
    <div className="workspace">
      <aside className="side">
        <button className="btn secondary" onClick={onBack}>← Hydra Lab</button>
        <h3>المهام</h3>
        {session.tasks.map((task, idx) => (
          <div className={`task ${task.status === 'COMPLETED' ? 'done' : ''}`} key={task.id}>
            <strong>{idx + 1}. {task.title}</strong>
            <small>{task.status} • {task.points} pts</small>
          </div>
        ))}
      </aside>
      <section className="main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Kali Workspace</h2>
          <div className="mono warn">TIMER {mm}:{ss}</div>
        </div>
        <div className="term">
          {(lines || []).map((line, i) => <p key={i} style={{ margin: '0 0 4px' }}>{line}</p>)}
          <div ref={endRef} />
        </div>
        <form className="term-input" onSubmit={(e) => { e.preventDefault(); if (!cmd.trim()) return; onCommand(cmd); setCmd('') }}>
          <input className="mono" value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="kali@cyberpod:~$" maxLength={180} />
          <button className="btn" type="submit">Run</button>
        </form>
        <form className="flag-box" onSubmit={(e) => { e.preventDefault(); onFlag(flag) }}>
          <strong>Submit Flag</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="CYBERPOD{...}" maxLength={4096} disabled={!session.flag?.can_submit} />
            <button className="btn" type="submit" disabled={!session.flag?.can_submit}>Submit</button>
          </div>
          {flagMsg && <p className={session.flag?.status === 'ACCEPTED' ? 'success' : 'error'}>{flagMsg}</p>}
        </form>
      </section>
      <aside className="side">
        <div className="stat"><b>{session.score?.earned || 0}/{session.score?.max || 100}</b>Score</div>
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
  if (!auth) return <Login onSuccess={async (next) => {
    setAuth(next)
    setLab((await api.listLabs()).labs[0])
    setView('lab')
  }} />
  return (
    <div className="app-shell">
      <Topbar user={auth.user} view={view === 'workspace' ? 'Kali Workspace' : 'Hydra Lab'} onLogout={async () => {
        await api.logout(); setAuth(null); setSession(null); setLines([]); setFlagMsg(''); setView('login')
      }} />
      {view === 'workspace' && session ? (
        <Workspace session={session} lines={lines} flagMsg={flagMsg} receivedAt={receivedAt} onBack={() => { api.setView('lab'); setView('lab') }}
          onCommand={(cmd) => {
            api.runCommand(session.session_id, cmd)
            api.getSessionStatus(session.session_id).then((r) => {
              acceptSession(r.session)
              setLines(api.getTerminal(session.session_id))
            })
          }}
          onFlag={async (flag) => {
            try {
              const res = await api.submitFlag(session.session_id, { flag, expected_revision: api.getRevision(session) })
              acceptSession(res.session)
              setFlagMsg(res.result)
            } catch (err) {
              setFlagMsg(err.message || 'ERROR')
            }
          }}
        />
      ) : lab ? (
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
      ) : <Login onSuccess={async (next) => { setAuth(next); setLab((await api.listLabs()).labs[0]); setView('lab') }} />}
    </div>
  )
}
