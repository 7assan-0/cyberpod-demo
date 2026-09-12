import { useEffect, useState } from 'react'
import { api } from './api/client.js'

export function LiveWorkspace({ session, busy, message, onLogout, onStart, onLifecycle, onFlag, onRefresh }) {
  const [labs, setLabs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [flag, setFlag] = useState('')
  const [desktop, setDesktop] = useState(null)
  const [accessError, setAccessError] = useState('')
  useEffect(() => {
    let active = true
    api.listLabs().then((data) => { if (active) setLabs(data.labs || []) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    setFlag(''); setDesktop(null); setAccessError('')
    if (!session || !['RUNNING', 'COMPLETED'].includes(session.status)) return
    let active = true
    const existing = session.desktop?.url
    if (existing) { setDesktop(existing); return }
    api.getSessionAccess(session.session_id).then((grant) => {
      if (!active) return
      const candidate = grant.browser_url
      if (candidate) {
        const url = new URL(candidate, window.location.origin)
        if (url.origin !== window.location.origin) throw new Error('Desktop must use the configured same-origin gateway.')
        setDesktop(url.href)
      }
    }).catch((err) => { if (active) setAccessError(err.payload?.error?.message || err.message) })
    return () => { active = false }
  }, [session?.session_id, session?.generation, session?.status])
  return <main className="live-workspace">
    <header><h1>CyberPod</h1><button onClick={onLogout} disabled={busy}>Sign out</button></header>
    {message && <p role="status">{message}</p>}
    {!session ? <>
      <h2>Labs</h2>
      {loading && <p>Loading labs…</p>}
      {error && <p role="alert">Could not load labs: {error}</p>}
      {!loading && !error && !labs.length && <p>No labs are registered.</p>}
      <div className="lab-cards">{labs.map((lab) => <article key={lab.id}>
        <h2>{lab.name}</h2><p>{lab.description}</p>
        <p>{lab.difficulty} · {lab.estimated_duration_minutes} minutes</p>
        <p>Tools: {(lab.required_tools || []).join(', ') || 'None'}</p>
        <button disabled={busy || !['AVAILABLE', 'published'].includes(lab.status)} onClick={() => onStart(lab.id)}>Start {lab.name}</button>
      </article>)}</div>
    </> : <>
      <h2>{session.lab_name}</h2>
      <p>{session.status} · Score {session.score?.earned || 0}/{session.score?.max || 100} · Progress {session.progress_percent || 0}%</p>
      {session.error && <p role="alert">{session.error.code}</p>}
      <div className="session-actions">
        {session.capabilities?.can_start && <button disabled={busy} onClick={() => onLifecycle('start')}>Resume</button>}
        {session.capabilities?.can_stop && <button disabled={busy} onClick={() => onLifecycle('stop')}>Pause</button>}
        {session.capabilities?.can_restart && <button disabled={busy} onClick={() => onLifecycle('restart')}>Restart lab</button>}
        <button disabled={busy} onClick={() => onLifecycle('cleanup')}>End lab</button>
        <button onClick={onRefresh}>Refresh status</button>
      </div>
      {desktop ? <iframe title="Kali desktop" src={desktop} allow="clipboard-read; clipboard-write" />
        : <p>{accessError || 'Waiting for the configured desktop gateway.'}</p>}
      <ol>{(session.tasks || []).map((task) => <li key={task.id}>{task.title} — {task.status}<p>{task.description}</p></li>)}</ol>
      <form onSubmit={(event) => { event.preventDefault(); onFlag(flag) }}>
        <input aria-label="Flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CYBERPOD{…}" maxLength={4096} />
        <button disabled={busy || !session.flag?.can_submit || !flag.trim()}>Submit flag</button>
      </form>
    </>}
  </main>
}
