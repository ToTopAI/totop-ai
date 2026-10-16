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

test('account recovery forces provider login rather than reusing another browser session',async()=>{
 const auth=new BridgeAuth({})
 const url=new URL('https://auth.totop.ai/oauth/authorize?state=original&code_challenge=challenge&redirect_uri=http%3A%2F%2F127.0.0.1%3A1234%2Ftotop%2Fcallback')
 await auth.redirectToAuthorization(new URL(url));assert.equal(auth.authorizationUrl.searchParams.has('prompt'),false)
 auth.forceLogin=true
 await auth.redirectToAuthorization(new URL(url))
 assert.equal(auth.authorizationUrl.searchParams.get('prompt'),'login')
 for(const key of ['state','code_challenge','redirect_uri'])assert.equal(auth.authorizationUrl.searchParams.get(key),url.searchParams.get(key))
 await assert.rejects(auth.redirectToAuthorization(new URL('https://example.com/oauth/authorize')),/untrusted_oauth_endpoint/)
})
