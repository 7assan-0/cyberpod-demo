import test from 'node:test'
import assert from 'node:assert/strict'

function storage() {
  const items = new Map()
  return { getItem: (key) => items.get(key) || null, setItem: (key, value) => items.set(key, value), removeItem: (key) => items.delete(key) }
}
async function fresh() {
  globalThis.sessionStorage = storage()
  const { mockApi } = await import(`../../src/api/mock.js?test=${Math.random()}`)
  await mockApi.login({ email: 'bisha', password: 'bisha' })
  const { session } = await mockApi.createSession('hydra-ssh-101')
  await mockApi.startSession(session.session_id)
  return { api: mockApi, id: session.session_id }
}
const command = 'hydra -l bisha -P wordlist.txt 10.8.0.22 http-post-form "/login:username=^USER^&password=^PASS^:Invalid"'

test('full attempt survives reload, rejects wrong flag, and scores 100', async () => {
  const { api, id } = await fresh()
  api.runCommand(id, 'nmap 10.8.0.22')
  api.openPortal(id)
  api.runCommand(id, command)
  const { flag } = api.loginPortal(id, 'bisha', 'bisha')
  const { mockApi: reloaded } = await import(`../../src/api/mock.js?reload=${Math.random()}`)
  assert.equal(reloaded.getPortalFlag(id), flag)
  let session = (await reloaded.getSessionStatus(id)).session
  assert.ok(!JSON.stringify(session).includes(flag))
  let response = await reloaded.submitFlag(id, { flag: 'wrong', expected_revision: session.revision })
  assert.equal(response.result, 'INCORRECT')
  response = await reloaded.submitFlag(id, { flag, expected_revision: response.session.revision })
  assert.equal(response.result, 'ACCEPTED')
  assert.equal(response.session.score.earned, 100)
})

test('pause blocks commands and resume preserves the original deadline', async () => {
  const { api, id } = await fresh()
  const deadline = (await api.getSessionStatus(id)).session.expires_at
  await api.stopSession(id)
  assert.throws(() => api.runCommand(id, command), /INVALID_STATE/)
  assert.equal((await api.getSessionStatus(id)).session.desktop.status, 'UNAVAILABLE')
  assert.equal((await api.startSession(id)).session.expires_at, deadline)
})

test('expiry is enforced and restart rotates the attempt secret', async () => {
  const { api, id } = await fresh()
  const oldFlag = api.loginPortal(id, 'bisha', 'bisha').flag
  const now = Date.now
  Date.now = () => now() + 21 * 60 * 1000
  try {
    assert.equal((await api.getSessionStatus(id)).session.status, 'EXPIRED')
    assert.throws(() => api.runCommand(id, command), /SESSION_EXPIRED/)
    await api.restartSession(id)
    assert.notEqual(api.loginPortal(id, 'bisha', 'bisha').flag, oldFlag)
  } finally { Date.now = now }
})

test('wrong target and incomplete Hydra commands do not award tasks', async () => {
  const { api, id } = await fresh()
  api.runCommand(id, 'hydra')
  api.runCommand(id, 'nmap example.com')
  assert.equal((await api.getSessionStatus(id)).session.completed_tasks, 0)
  await api.cleanupSession(id)
  assert.equal(api.getPortalFlag(id), null)
  await assert.rejects(api.startSession(id), /INVALID_STATE/)
})

test('fresh secret and score after restart, terminal snapshots do not alias state', async () => {
  const { api, id } = await fresh()
  const lines = api.getTerminal(id)
  api.runCommand(id, command)
  assert.notDeepEqual(api.getTerminal(id), lines)
  await api.restartSession(id)
  assert.equal((await api.getSessionStatus(id)).session.score.earned, 0)
})
