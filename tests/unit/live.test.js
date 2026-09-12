import test from 'node:test'
import assert from 'node:assert/strict'
import { liveApi } from '../../src/api/live.js'

test('failed logout retains CSRF so cleanup can be retried', async () => {
  const items = new Map([['cyberpod-csrf', 'test-csrf']])
  globalThis.sessionStorage = { getItem: (key) => items.get(key), removeItem: (key) => items.delete(key) }
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'CLEANUP_INCOMPLETE' } }), { status: 503 })
  try {
    await assert.rejects(liveApi.logout(), /CLEANUP_INCOMPLETE/)
    assert.equal(items.get('cyberpod-csrf'), 'test-csrf')
    globalThis.fetch = async () => new Response('{"ok":true}')
    await liveApi.logout()
    assert.equal(items.has('cyberpod-csrf'), false)
  } finally { globalThis.fetch = previousFetch }
})
