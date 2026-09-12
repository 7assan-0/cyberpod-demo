import test from 'node:test'
import assert from 'node:assert/strict'
import { credentialsMatch, sha256hex } from '../../src/security.js'

test('demo credential hashing works without SubtleCrypto on a LAN HTTP origin', async () => {
  const original = globalThis.crypto
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: original.getRandomValues.bind(original) } })
  try {
    assert.equal(await credentialsMatch('bisha', 'bisha'), true)
    assert.equal(await credentialsMatch('bisha', 'wrong'), false)
    assert.equal((await sha256hex('bisha')).length, 64)
  } finally { Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original }) }
})
