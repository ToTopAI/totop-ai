import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm,realpath,symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {getLocalGameSdkDocs,planGameSdkIntegration,installGameSdk} from '../shared/game-integration.mjs'
import {serve} from '../shared/bridge.mjs'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'

test('existing game integration preserves gameplay, old saves, manifests and build scripts',async()=>{
 const root=await mkdtemp(resolve(await realpath(tmpdir()),'totop-existing-sdk-'))
 try{
  const original='function startGame(){}; localStorage.setItem("old-save","5");'
  await writeFile(resolve(root,'game.js'),original)
  await writeFile(resolve(root,'index.html'),'<script src="game.js"></script>')
  await writeFile(resolve(root,'package.json'),'{"scripts":{"build":"custom-builder"}}')
  await writeFile(resolve(root,'totop.game.json'),'{"keep":"existing"}')
  const plan=await planGameSdkIntegration({path:root,roots:[root]})
  assert.equal(plan.engine,'html5');assert.ok(plan.hookCandidates.some(hook=>hook.file==='game.js'&&hook.candidates.includes('save')))
  const installed=await installGameSdk({path:root,roots:[root]})
  assert.equal(installed.integrationStatus,'requires_game_hooks');assert.equal(installed.gameplayStatus,'not_run')
  assert.equal(installed.manifestStatus,'preserved')
  assert.equal(await readFile(resolve(root,'game.js'),'utf8'),original)
  assert.equal(await readFile(resolve(root,'package.json'),'utf8'),'{"scripts":{"build":"custom-builder"}}')
  assert.equal(await readFile(resolve(root,'totop.game.json'),'utf8'),'{"keep":"existing"}')
  assert.ok((await readFile(resolve(root,'totop-sdk/totop-game.esm.js'),'utf8')).includes('ToTopGame'))
  await assert.rejects(installGameSdk({path:root,roots:[root]}),/sdk_directory_exists/)
  await assert.rejects(installGameSdk({path:root,roots:[root],sdkDirectory:'../outside'}),/invalid_sdk_directory/)
  await symlink('/private/tmp',resolve(root,'linked'))
  await assert.rejects(installGameSdk({path:root,roots:[root],sdkDirectory:'linked/sdk'}),/linked_path_forbidden/)
 }finally{await rm(root,{recursive:true,force:true})}
})

test('engine installs do not overwrite scenes, autoloads or export settings',async()=>{
 const parent=await mkdtemp(resolve(await realpath(tmpdir()),'totop-engine-integrate-'))
 try{for(const engine of ['unity','godot']){
  const root=resolve(parent,engine);await mkdir(root)
  if(engine==='godot')await writeFile(resolve(root,'project.godot'),'[application]\nconfig/name="Existing"\n')
  else{await mkdir(resolve(root,'ProjectSettings'));await writeFile(resolve(root,'ProjectSettings/ProjectVersion.txt'),'m_EditorVersion: 6000.3.26f1')}
  await writeFile(resolve(root,'old.scene'),'untouched')
  const result=await installGameSdk({path:root,roots:[parent]});assert.equal(result.engine,engine)
  assert.equal(await readFile(resolve(root,'old.scene'),'utf8'),'untouched')
  if(engine==='unity')assert.ok((await readFile(resolve(result.directory,'Templates/ToTop/index.html'),'utf8')).includes('ToTop'))
  else assert.ok((await readFile(resolve(result.directory,'totop.gd'),'utf8')).includes('JavaScriptBridge'))
 }}finally{await rm(parent,{recursive:true,force:true})}
})

test('offline MCP docs and integration tools work without touching platform credentials',async()=>{
 const root=await mkdtemp(resolve(await realpath(tmpdir()),'totop-offline-sdk-'))
 const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair()
 const bridge=await serve({roots:[root],localOnly:true,transport:serverTransport,auth:{tokens(){throw Error('credentials_must_not_be_read')}}})
 const client=new Client({name:'sdk-agent-test',version:'1'})
 try{
  await client.connect(clientTransport)
  const names=(await client.listTools()).tools.map(tool=>tool.name)
  for(const name of ['get_local_game_sdk_docs','plan_game_sdk_integration','install_game_sdk'])assert.ok(names.includes(name))
  const docs=await client.callTool({name:'get_local_game_sdk_docs',arguments:{page:'capabilities'}})
  assert.ok(JSON.parse(docs.content[0].text).content.includes('config.get'))
  const installed=await client.callTool({name:'install_game_sdk',arguments:{path:root}})
  assert.equal(JSON.parse(installed.content[0].text).status,'assets_installed')
  await assert.rejects(getLocalGameSdkDocs({page:'../../secrets'}),/invalid_sdk_docs/)
  await assert.rejects(planGameSdkIntegration({path:root,roots:[root],capabilities:['invented']}),/invalid_sdk_capabilities/)
 }finally{await client.close();await bridge.close();await rm(root,{recursive:true,force:true})}
})
