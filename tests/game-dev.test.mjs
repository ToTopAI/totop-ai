import{test}from'node:test'
import assert from'node:assert/strict'
import{mkdtemp,readFile,symlink,rm,realpath}from'node:fs/promises'
import{resolve}from'node:path'
import{tmpdir}from'node:os'
import{createGameProject,inspectGameProject,buildHtmlGame,checkGameBuild,bindGameProject}from'../shared/game-dev.mjs'
import {serve} from '../shared/bridge.mjs'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
test('local creation and immutable exports never overwrite projects or imply gameplay/publication',async()=>{
 const parent=await mkdtemp(resolve(await realpath(tmpdir()),'totop-game-dev-'))
 try{const root=resolve(parent,'game');const created=await createGameProject({destination:root,roots:[parent]});assert.equal(created.publicationStatus,'not_submitted');assert.equal((await inspectGameProject({path:root,roots:[parent]})).engine,'html5')
  await assert.rejects(createGameProject({destination:root,roots:[parent]}),{code:'EEXIST'})
  const first=await buildHtmlGame({path:root,roots:[parent]}),second=await buildHtmlGame({path:root,roots:[parent]});assert.notEqual(first.directory,second.directory);assert.equal(first.buildStatus,'pass');assert.equal(first.gameplayStatus,'not_run')
  const checked=await checkGameBuild({path:first.directory,roots:[parent]});assert.equal(checked.checks.find(c=>c.name==='root_entry').status,'pass');assert.equal(checked.checks.find(c=>c.name==='platform_binding').status,'fail');assert.equal(checked.gameplayStatus,'not_run')
  assert.ok((await readFile(resolve(first.directory,'totop-game.global.js'),'utf8')).includes('ToTopGame'))
  const gameId='11111111-1111-4111-8111-111111111111';await bindGameProject({path:root,roots:[parent],gameId})
  assert.equal(JSON.parse(await readFile(resolve(first.directory,'totop.game.json'),'utf8')).gameId,undefined,'Binding must not mutate a frozen export')
  const bound=await buildHtmlGame({path:root,roots:[parent]});assert.equal(JSON.parse(await readFile(resolve(bound.directory,'totop.game.json'),'utf8')).gameId,gameId)
 }finally{await rm(parent,{recursive:true,force:true})}
})
test('project access rejects links and outside directories',async()=>{
 const parent=await mkdtemp(resolve(await realpath(tmpdir()),'totop-game-dev-')),outside=await mkdtemp(resolve(await realpath(tmpdir()),'totop-game-outside-'))
 try{await symlink(outside,resolve(parent,'link'));await assert.rejects(inspectGameProject({path:resolve(parent,'link'),roots:[parent]}),/linked_path_forbidden/);await assert.rejects(createGameProject({destination:resolve(outside,'x'),roots:[parent]}),/path_outside_allowed/)}finally{await rm(parent,{recursive:true,force:true});await rm(outside,{recursive:true,force:true})}
})
test('source templates are available for both engine adapters and do not fake editor acceptance',async()=>{
 const parent=await mkdtemp(resolve(await realpath(tmpdir()),'totop-engine-dev-'))
 try{for(const engine of['unity','godot']){const root=resolve(parent,engine);await createGameProject({destination:root,roots:[parent],engine});const report=await inspectGameProject({path:root,roots:[parent]});assert.equal(report.engine,engine);assert.equal(report.buildStatus,'not_run');await assert.rejects(buildHtmlGame({path:root,roots:[parent]}),/engine_export_required/)}}
 finally{await rm(parent,{recursive:true,force:true})}
})
test('local MCP development does not connect OAuth or expose cloud writes',async()=>{
 const parent=await mkdtemp(resolve(await realpath(tmpdir()),'totop-local-mcp-'))
 const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair()
 const bridge=await serve({roots:[parent],outputDirectory:resolve(parent,'artifacts'),localOnly:true,auth:{tokens(){throw Error('must_not_access_credentials')}},transport:serverTransport})
 const client=new Client({name:'local-game-agent',version:'test'})
 try{
  await client.connect(clientTransport)
  const names=(await client.listTools()).tools.map(tool=>tool.name)
  assert.ok(names.includes('create_game_project'));assert.ok(names.includes('start_game_preview'))
  assert.equal(names.includes('upload_local_artifact'),false);assert.equal(names.includes('download_game_source'),false)
  const result=await client.callTool({name:'create_game_project',arguments:{destination:resolve(parent,'game'),engine:'html5'}})
  assert.equal(JSON.parse(result.content[0].text).publicationStatus,'not_submitted')
  await assert.rejects(client.callTool({name:'submit_game',arguments:{}}),/login_required/)
 }finally{await client.close();await bridge.close();await rm(parent,{recursive:true,force:true})}
})
