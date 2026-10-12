import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BridgeAuth } from '../shared/oauth.mjs'
test('desktop OAuth does not resurrect in-memory credentials when secure persistence fails', async () => {
  const auth = new BridgeAuth({ load: async () => null, save: async () => { throw Error('storage_unavailable') }, clear: async () => {} })
  await assert.rejects(auth.saveTokens({ access_token: 'synthetic-test-token' }), /storage_unavailable/)
  assert.equal(await auth.tokens(), null)
})
test('cancelled desktop login never opens a callback listener or clears existing credentials', async () => {
  let cleared = false
  const auth = new BridgeAuth({ clear: async () => { cleared = true } })
  const abort = new AbortController(); abort.abort()
  await assert.rejects(auth.login({ signal: abort.signal }), { name: 'AbortError' })
  assert.equal(cleared, false)
})
