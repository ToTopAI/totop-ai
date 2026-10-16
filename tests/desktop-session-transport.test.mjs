import {test} from 'node:test'
import assert from 'node:assert/strict'
import {connectRemote} from '../shared/bridge.mjs'
test('hosted MCP transport refreshes bearer per request without OAuth',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original});let calls=0,tokens=0
 globalThis.fetch=async(url,init)=>{assert.equal(new URL(url).origin,'https://api.totop.ai');assert.equal(new Headers(init.headers).get('Authorization'),'Bearer child-'+tokens);assert.equal(init.redirect,'error');calls++;const request=JSON.parse(init.body);if(request.id===undefined)return new Response(null,{status:202});return Response.json({jsonrpc:'2.0',id:request.id,result:request.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}:{tools:[]}})}
 const client=await connectRemote({mode:'desktop',async tokens(){return {access_token:'child-'+ ++tokens}},async redirectToAuthorization(){assert.fail('OAuth must not open')}})
 await client.listTools();await client.close();assert.ok(calls>=3);assert.ok(tokens>=calls)
})
test('hosted 401 fails once without OAuth retry; outage remains an outage',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original});for(const status of [401,503]){let calls=0;globalThis.fetch=async()=>{calls++;return new Response('failure',{status})};await assert.rejects(connectRemote({mode:'desktop',async tokens(){return {access_token:'child'}},async redirectToAuthorization(){assert.fail('unexpected OAuth')}}),e=>status===401?e.code===401:!e.message.includes('run_login'));assert.equal(calls,1)}
})
