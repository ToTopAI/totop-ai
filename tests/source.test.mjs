import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises'
import {realpathSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {zipSync,strToU8} from 'fflate'
import {prepareArtifact} from '../shared/artifacts.mjs'
import {inspectSourceZip,extractSourceNewDirectory,downloadGameSource} from '../shared/source.mjs'
const license='Copyright (c) 2026 Original Author\nPermission is hereby granted, free of charge, to any person obtaining a copy\nto deal in the Software without restriction\nThe above copyright notice and this permission notice shall be included\nTHE SOFTWARE IS PROVIDED "AS IS"\nIN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE'
const entries={'LICENSE':strToU8(license),'README.md':strToU8('# Build\nRun npm run build with approval.'),'src/game.ts':strToU8('export const game = 1')}
const hash=x=>createHash('sha256').update(x).digest('hex')
const zip=(extra={})=>Buffer.from(zipSync({...entries,...extra}))
async function fixture(t){const root=await mkdtemp(resolve(realpathSync(tmpdir()),'totop-source-'));t.after(()=>rm(root,{recursive:true,force:true}));return root}
test('source validation: no index needed, CRC/hash/paths/secrets/nested archives and MIT/readme checks',()=>{
 const good=zip();assert.equal(inspectSourceZip(good,hash(good)).length,3)
 assert.throws(()=>inspectSourceZip(good,'a'.repeat(64)),/integrity/)
 for(const extra of [{'../outside.ts':strToU8('bad')},{'.env':strToU8('bad')},{'node_modules/x.js':strToU8('bad')},{'LICENSE':strToU8('Not MIT')},{'README.md':strToU8('Hello')},{'nested.txt':new Uint8Array([0x50,0x4b,3,4])},{'key.txt':strToU8('-----BEGIN PRIVATE KEY-----')},{'CON.txt':strToU8('bad')},{'Src/game.ts':strToU8('duplicate')}]){const data=zip(extra);assert.throws(()=>inspectSourceZip(data,hash(data)))}
 const corrupt=Buffer.from(good);const central=corrupt.indexOf(Buffer.from([0x50,0x4b,1,2]));corrupt.writeUInt32LE(0,central+16);assert.throws(()=>inspectSourceZip(corrupt,hash(corrupt)),/zip|corrupt/)
 const encrypted=Buffer.from(good);encrypted.writeUInt16LE(encrypted.readUInt16LE(central+8)|1,central+8);assert.throws(()=>inspectSourceZip(encrypted,hash(encrypted)),/unsafe/)
 const bomb=Buffer.from(good);bomb.writeUInt32LE(0x30000000,central+24);assert.throws(()=>inspectSourceZip(bomb,hash(bomb)),/zip|limits/)
})
test('clean preparation lists exclusions, preserves attribution, rejects links and refuses existing extraction targets',async t=>{
 const root=await fixture(t),project=resolve(root,'project');await mkdir(project);await mkdir(resolve(project,'src'));for(const [name,data]of Object.entries(entries))await writeFile(resolve(project,name),data)
 await mkdir(resolve(project,'.git'));await writeFile(resolve(project,'.env'),'excluded secret');await mkdir(resolve(project,'node_modules'));await writeFile(resolve(project,'node_modules/private.js'),'excluded')
 const artifact=await prepareArtifact({path:project,purpose:'source',roots:[root],outputDirectory:resolve(root,'artifacts')});assert.deepEqual(artifact.excluded,['.env','.git/','node_modules/'])
 const data=await readFile(artifact.path);assert.equal(inspectSourceZip(data,artifact.sha256).length,3)
 const target=resolve(root,'remix');await extractSourceNewDirectory(data,artifact.sha256,target,[root]);assert.equal((await readFile(resolve(target,'LICENSE'))).toString(),license)
 await assert.rejects(extractSourceNewDirectory(data,artifact.sha256,target,[root]),/EEXIST/)
 await assert.rejects(extractSourceNewDirectory(data,artifact.sha256,resolve(root,'..','escape'),[project]),/outside/)
 await symlink(resolve(project,'LICENSE'),resolve(project,'linked.txt'));await assert.rejects(prepareArtifact({path:project,purpose:'source',roots:[root],outputDirectory:resolve(root,'artifacts')}),/linked/)
})
test('authenticated source download pins identity and hash, uses only API OAuth and does not execute source',async t=>{
 const root=await fixture(t),data=zip(),gameId=randomUUID(),releaseId=randomUUID(),sourceId=randomUUID(),metadata={gameId,releaseId,sourceId,sha256:hash(data),bytes:data.length,license:'MIT'}
 const remote={callTool:async request=>{assert.equal(request.name,'get_game_source');assert.deepEqual(request.arguments,{gameId,releaseId});return {structuredContent:metadata}}},auth={tokens:async()=>({access_token:'test-token'})}
 const fetcher=async(url,options)=>{assert.equal(url.origin,'https://api.totop.ai');assert.ok(url.pathname.includes(releaseId));assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer test-token');return new Response(data,{headers:{'Content-Length':String(data.length)}})}
 const result=await downloadGameSource({remote,auth,gameId,releaseId,destination:resolve(root,'new'),roots:[root],fetcher});assert.equal(result.sourceId,sourceId);assert.equal(result.sha256,metadata.sha256)
 await assert.rejects(downloadGameSource({remote,auth,gameId,releaseId,destination:resolve(root,'bad'),roots:[root],fetcher:async()=>new Response('wrong',{headers:{'Content-Length':String(data.length)}})}),/integrity/)
 await assert.rejects(downloadGameSource({remote,auth,gameId,releaseId,destination:resolve(root,'unavailable'),roots:[root],fetcher:async()=>new Response(null,{status:404})}),/download/)
})
