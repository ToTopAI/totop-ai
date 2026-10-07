import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm, chmod, lstat } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { unzipSync } from 'fflate'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { prepareArtifact, permittedPath, readStable, uploadArtifact, validateReceipt, GAME_ZIP_LIMIT, GAME_FILE_LIMIT, ZIP_LIMIT } from '../shared/artifacts.mjs'
import { CredentialStore } from '../shared/credentials.mjs'
import { serve } from '../shared/bridge.mjs'
const fixture=async t=>{const dir=await mkdtemp(resolve(realpathSync(tmpdir()),'totop-agent-'));t.after(()=>rm(dir,{recursive:true,force:true}));const game=resolve(dir,'game');await mkdir(game);await writeFile(resolve(game,'index.html'),'<html>game</html>');return {dir,game,outputDirectory:resolve(dir,'artifacts')}}
const receipt=data=>({uploadId:'upload-test',method:'PUT',uploadUrl:'https://'+ 'a'.repeat(32)+'.r2.cloudflarestorage.com/bucket/packages/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/game.zip?X-Amz-Signature='+'b'.repeat(64),headers:{'Content-Type':'application/zip','If-None-Match':'*'},sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length,expiresInSeconds:600})
test('runtime receipts support 200 MiB while source receipts retain 100 MiB and reject type confusion',()=>{
  assert.equal(GAME_ZIP_LIMIT,200*1024*1024);assert.equal(GAME_FILE_LIMIT,20000);assert.equal(ZIP_LIMIT,100*1024*1024)
  const r={...receipt(Buffer.from('fixture')),bytes:159400916}
  assert.ok(validateReceipt(r));assert.throws(()=>validateReceipt({...r,bytes:GAME_ZIP_LIMIT+1}),/identity/)
  const source={...r,uploadUrl:r.uploadUrl.replace('/packages/','/game-sources/v1/').replace('/game.zip','/source.zip')}
  assert.throws(()=>validateReceipt(source),/identity/);assert.ok(validateReceipt({...source,bytes:ZIP_LIMIT}))
  assert.throws(()=>validateReceipt({...r,headers:{...r.headers,'Content-Type':'image/png'}}),/headers/)
})
test('runtime inventory accepts more than 5000 files without relaxing source inventory',async t=>{
  const f=await fixture(t)
  for(let i=0;i<5000;i++)await writeFile(resolve(f.game,`asset-${i}.txt`),'')
  const artifact=await prepareArtifact({path:f.game,purpose:'game',roots:[f.game],outputDirectory:f.outputDirectory})
  assert.equal(artifact.files,5001)
})
test('prepare confines paths, excludes secrets/links, checks file changes and produces real ZIP identity',async t=>{
  const f=await fixture(t);await writeFile(resolve(f.game,'empty.txt'),'')
  const artifact=await prepareArtifact({path:f.game,purpose:'game',roots:[f.game],outputDirectory:f.outputDirectory})
  const bytes=await readFile(artifact.path);assert.equal(artifact.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(artifact.bytes,bytes.length);assert.ok(unzipSync(bytes)['index.html'])
  await assert.rejects(permittedPath(f.dir,[f.game]),/outside/)
  await assert.rejects(permittedPath(f.game,[]),/required/)
  await symlink(f.game,resolve(f.dir,'linked'),process.platform==='win32'?'junction':'dir');await assert.rejects(permittedPath(resolve(f.dir,'linked'),[f.game]),/linked/)
  if(process.platform==='win32')assert.equal((await prepareArtifact({path:f.game.toUpperCase(),purpose:'game',roots:[f.game],outputDirectory:f.outputDirectory})).sha256,artifact.sha256)
  await writeFile(resolve(f.game,'.env'),'password');await assert.rejects(prepareArtifact({path:f.game,purpose:'game',roots:[f.game],outputDirectory:f.outputDirectory}),/sensitive/);await rm(resolve(f.game,'.env'))
  const path=resolve(f.game,'index.html'),before=await lstat(path);await writeFile(path,'changed');await assert.rejects(readStable(path,100,before),/changed/)
})
test('upload checks trusted R2 headers and identity, never forwards OAuth, and distinguishes ambiguous failures',async t=>{
  const f=await fixture(t),data=Buffer.from('zip bytes'),path=resolve(f.game,'game.zip');await writeFile(path,data);const r=receipt(data)
  for(const bad of [{uploadUrl:'https://evil.test/upload'},{headers:{...r.headers,Authorization:'private'}},{bytes:1},{uploadUrl:r.uploadUrl.replace('https:','http:')}]){
    await assert.rejects(uploadArtifact(path,{...r,...bad},{send:async()=>{throw Error('must_not_send')}}))
  }
  let headers;assert.equal((await uploadArtifact(path,r,{send:async(_url,_data,h)=>{headers=h;return 200}})).status,'uploaded');assert.equal(headers.Authorization,undefined)
  assert.equal((await uploadArtifact(path,r,{send:async()=>412})).status,'object_exists')
  await assert.rejects(uploadArtifact(path,r,{send:async()=>503}),/unconfirmed/)
  assert.throws(()=>validateReceipt({...r,headers:{...r.headers,Cookie:'session'}}))
})
test('credentials are profile isolated, owner restricted and cleared; keyring preferred without leaking credentials',async t=>{
  const f=await fixture(t),store=new CredentialStore(resolve(f.dir,'credentials'),'one',{entryFactory:()=>null}),other=new CredentialStore(resolve(f.dir,'credentials'),'two',{entryFactory:()=>null})
  await store.save({access_token:'test-value'});assert.equal((await store.load()).access_token,'test-value');assert.equal(await other.load(),null)
  if(process.platform!=='win32'){assert.equal((await lstat(store.file)).mode&0o077,0);await chmod(store.file,0o644);await assert.rejects(store.load(),/unavailable/);await chmod(store.file,0o600)}
  await store.clear();assert.equal(await store.load(),null)
  let secret;const system=new CredentialStore(resolve(f.dir,'credentials'),'system',{entryFactory:()=>({setPassword:v=>secret=v,getPassword:()=>secret,deletePassword:()=>secret=null})});assert.equal(await system.save({refresh_token:'test-value'}),'system');await system.clear();assert.equal(secret,null)
  const stale=new CredentialStore(resolve(f.dir,'credentials'),'stale',{entryFactory:()=>({setPassword:v=>secret=v,getPassword:()=>secret,deletePassword:()=>{throw Error('keyring locked')}})});
  await stale.save({access_token:'old-account'});await stale.clear();assert.equal(await stale.load(),null);await stale.save({access_token:'new-account'});assert.equal((await stale.load()).access_token,'new-account')
  const locked=new CredentialStore(resolve(f.dir,'credentials'),'locked',{entryFactory:()=>({setPassword:()=>{throw Error('locked')},getPassword:()=>JSON.stringify({access_token:'stale-account'})})});await locked.save({access_token:'current-account'});assert.equal((await locked.load()).access_token,'current-account')
})
test('standard SDK discovers unchanged remote schema; bridge receipts/handles are private and account isolated',async t=>{
  const f=await fixture(t);let accountId='one'
  const schema={type:'object',properties:{gameId:{type:'string'},bytes:{type:'integer'}},required:['gameId','bytes']}
  const response=value=>({content:[{type:'text',text:JSON.stringify(value)}]})
  const remote={listTools:async()=>({tools:[{name:'start_upload',description:'upload',inputSchema:schema}]}),callTool:async({name})=>response(name==='get_account'?{accountId}:receipt(Buffer.from('zip'))),close:async()=>{}}
  const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair()
  const bridge=await serve({roots:[f.game],outputDirectory:f.outputDirectory,remote,transport:serverTransport});t.after(()=>bridge.close())
  const client=new Client({name:'unknown-sdk-client',version:'test'});await client.connect(clientTransport)
  assert.deepEqual((await client.listTools()).tools[0].inputSchema,schema)
  const prepared=JSON.parse((await client.callTool({name:'prepare_local_artifact',arguments:{path:f.game,purpose:'game'}})).content[0].text);assert.equal(prepared.path,undefined)
  const upload=JSON.parse((await client.callTool({name:'start_upload',arguments:{gameId:'test',bytes:3}})).content[0].text);assert.equal(upload.uploadUrl,undefined)
  accountId='two';await assert.rejects(client.callTool({name:'upload_local_artifact',arguments:{artifactHandle:prepared.artifactHandle,uploadId:upload.uploadId}}),/account_changed/)
  await assert.rejects(client.callTool({name:'upload_local_artifact',arguments:{artifactHandle:prepared.artifactHandle,uploadId:upload.uploadId}}),/unavailable/)
  await client.close()
})
