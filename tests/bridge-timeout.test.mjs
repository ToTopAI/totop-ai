import test from 'node:test'
import assert from 'node:assert/strict'
import {setImmediate} from 'node:timers/promises'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {ErrorCode, McpError} from '@modelcontextprotocol/sdk/types.js'
import {connectRemote, serve} from '../shared/bridge.mjs'
import {ENDPOINT, ISSUER, safeFetch} from '../shared/oauth.mjs'

function clock(t) {
  t.mock.timers.enable({apis:['setTimeout']})
  // AbortSignal.timeout uses native timers, so connect it to the test clock.
  t.mock.method(AbortSignal,'timeout',ms=>{
    const controller=new AbortController()
    setTimeout(()=>controller.abort(new DOMException('timed out','TimeoutError')),ms)
    return controller.signal
  })
}
function delayed(signal,ms,value) {
  return new Promise((resolve,reject)=>{
    signal.throwIfAborted()
    const abort=()=>{clearTimeout(timer);reject(signal.reason)}
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve(value)},ms)
    signal.addEventListener('abort',abort,{once:true})
  })
}

for(const mode of ['oauth','desktop'])test(`${mode} MCP confirmation survives a 30-second HTTP response without retrying`,async t=>{
  clock(t)
  let confirmations=0,started
  const requested=new Promise(resolve=>{started=resolve})
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    assert.equal(new URL(url).origin,new URL(ENDPOINT).origin)
    assert.equal(init.redirect,'error')
    if(init.method==='GET')return new Response(null,{status:405})
    assert.equal(new Headers(init.headers).get('Authorization'),'Bearer synthetic-token')
    const request=JSON.parse(init.body)
    if(request.id===undefined)return new Response(null,{status:202})
    if(request.method==='initialize')return Response.json({jsonrpc:'2.0',id:request.id,result:{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}})
    assert.equal(request.params.name,'complete_upload');confirmations++;started()
    return delayed(init.signal,30000,Response.json({jsonrpc:'2.0',id:request.id,result:{content:[{type:'text',text:'{"status":"uploaded"}'}]}}))
  })
  const client=await connectRemote({mode,async tokens(){return {access_token:'synthetic-token'}},async redirectToAuthorization(){assert.fail('unexpected login')}})
  t.after(()=>client.close())
  let settled=false
  const pending=client.callTool({name:'complete_upload',arguments:{}},undefined,{timeout:120000})
  pending.then(()=>{settled=true},()=>{settled=true})
  await requested
  t.mock.timers.tick(15001);await setImmediate()
  assert.equal(settled,false,'the shared OAuth HTTP timeout must not abort MCP')
  t.mock.timers.tick(14999)
  assert.equal(JSON.parse((await pending).content[0].text).status,'uploaded')
  assert.equal(confirmations,1)
})

test('OAuth and non-MCP HTTP requests still stop at 15 seconds; MCP remains bounded at 120 seconds',async t=>{
  clock(t)
  t.mock.method(globalThis,'fetch',(_url,init)=>delayed(init.signal,180000,Response.json({})))
  const authorization=safeFetch(ISSUER+'/oauth/token')
  const metadata=safeFetch('https://api.totop.ai/.well-known/oauth-protected-resource/mcp')
  const confirmation=safeFetch(ENDPOINT)
  let completed=false;confirmation.then(()=>{completed=true},()=>{completed=true})
  const short=Promise.all([assert.rejects(authorization,{name:'TimeoutError'}),assert.rejects(metadata,{name:'TimeoutError'})])
  t.mock.timers.tick(15000);await short
  assert.equal(completed,false)
  const long=assert.rejects(confirmation,{name:'TimeoutError'})
  t.mock.timers.tick(104999);await setImmediate();assert.equal(completed,false)
  t.mock.timers.tick(1);await long
})

test('caller cancellation and the trusted origin restriction still apply',async t=>{
  t.mock.method(globalThis,'fetch',(_url,init)=>delayed(init.signal,30000,Response.json({})))
  for(const asRequest of [false,true]){
    const controller=new AbortController()
    const pending=asRequest?safeFetch(new Request(ENDPOINT,{signal:controller.signal})):safeFetch(ENDPOINT,{signal:controller.signal})
    const rejected=assert.rejects(pending,{name:'AbortError'})
    controller.abort();await rejected
  }
  const calls=globalThis.fetch.mock.callCount()
  await assert.rejects(safeFetch('https://untrusted.example/mcp'),/untrusted_oauth_endpoint/)
  assert.equal(globalThis.fetch.mock.callCount(),calls)
})

test('bridge classifies both timeout layers safely and never retries ambiguous writes',async t=>{
  const failures=[new DOMException('private URL and token','TimeoutError'),new McpError(ErrorCode.RequestTimeout,'private URL and token'),new Error('private URL and token')]
  let confirmations=0
  const remote={async callTool({name}){
    if(name==='get_account')return {content:[{type:'text',text:'{"accountId":"fixture"}'}]}
    confirmations++;throw failures.shift()
  },async close(){}}
  const [local,peer]=InMemoryTransport.createLinkedPair()
  const bridge=await serve({remote,roots:[],transport:peer})
  const client=new Client({name:'fixture',version:'1'})
  t.after(async()=>{await client.close();await bridge.close()})
  await client.connect(local)
  for(const code of ['bridge_request_timeout_query_status','bridge_request_timeout_query_status','bridge_operation_failed_query_status']){
    await assert.rejects(client.callTool({name:'complete_upload',arguments:{}}),error=>{
      assert.match(error.message,new RegExp(code));assert.doesNotMatch(error.message,/private URL|token/);return true
    })
  }
  assert.equal(confirmations,3)
})
