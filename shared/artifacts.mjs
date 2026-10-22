import { constants } from 'node:fs'
import { lstat, open, readdir, realpath, mkdir, unlink } from 'node:fs/promises'
import { resolve, relative, isAbsolute, dirname, extname, parse } from 'node:path'
import { homedir } from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { request } from 'node:https'
import { Zip, ZipDeflate } from 'fflate'

export const ZIP_LIMIT=100*1024*1024, COVER_LIMIT=10*1024*1024
// Runtime limits match the server. Source archives retain the stricter ZIP_LIMIT.
export const GAME_ZIP_LIMIT=800*1024*1024, GAME_FILE_LIMIT=20000
const forbidden=new Set(['.git','.hg','.svn','node_modules','.ssh','.aws','.npmrc','.pypirc','credentials','id_rsa','id_ed25519'])
const allowed=new Set('.html .htm .js .mjs .css .json .wasm .data .bin .unityweb .pck .gz .br .png .jpg .jpeg .webp .gif .svg .ico .avif .ktx .ktx2 .basis .mp3 .ogg .wav .m4a .mp4 .webm .woff .woff2 .ttf .otf .glb .gltf .obj .mtl .txt .xml'.split(' '))
export const runtimeFileSupported=name=>allowed.has(extname(name).toLowerCase())
const secret=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:AKIA|ASIA)[A-Z0-9]{16}|\bsk-[A-Za-z0-9_-]{32,}/
const inside=(root,path)=>{const rel=relative(root,path);return rel===''||!rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))&&rel!=='..'&&!isAbsolute(rel)}
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs

/** Check every ancestor, including Windows junctions, before accessing a file. */
export async function unlinkedPath(path) {
  const absolute=resolve(path);let part=absolute
  while(part!==parse(part).root){if((await lstat(part)).isSymbolicLink())throw Error('linked_path_forbidden');part=dirname(part)}
  const canonical=await realpath(absolute)
  // Windows expands ordinary 8.3 names (e.g. RUNNER~1) as well as casing.
  // Accept aliases only when both names identify the very same non-link inode,
  // and check the canonical ancestors too. Never relax junction rejection.
  if(relative(canonical,absolute)!==''){
    if(process.platform!=='win32'||!same(await lstat(canonical),await lstat(absolute)))throw Error('linked_path_forbidden')
    let canonicalPart=canonical
    while(canonicalPart!==parse(canonicalPart).root){if((await lstat(canonicalPart)).isSymbolicLink())throw Error('linked_path_forbidden');canonicalPart=dirname(canonicalPart)}
  }
  return canonical
}
export async function permittedPath(path,roots) {
  if(!Array.isArray(roots)||!roots.length)throw Error('allowed_game_directory_required')
  const absolute=await unlinkedPath(path)
  let permitted=false
  for(const root of roots){const reviewed=await unlinkedPath(root);if(reviewed===parse(reviewed).root||relative(homedir(),reviewed)===''||!(await lstat(reviewed)).isDirectory())throw Error('specific_game_directory_required');if(inside(reviewed,absolute))permitted=true}
  if(!permitted)throw Error('path_outside_allowed_game_directory')
  return absolute
}
export async function readStable(path,limit,expected,allowEmpty=false) {
  const absolute=await unlinkedPath(path),before=expected??await lstat(absolute)
  if(!before.isFile()||before.size>limit||before.size<(allowEmpty?0:1))throw Error('invalid_artifact_size_or_type')
  const handle=await open(absolute,constants.O_RDONLY|(constants.O_NOFOLLOW??0))
  try{if(!same(before,await handle.stat()))throw Error('artifact_changed');const data=await handle.readFile();if(data.length!==before.size||!same(before,await handle.stat())||!same(before,await lstat(absolute))||await unlinkedPath(absolute)!==absolute)throw Error('artifact_changed');return data}finally{await handle.close()}
}
function contentType(data) {
  if(data.length>24&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.subarray(12,16).toString()==='IHDR')return 'image/png'
  if(data.length>4&&data[0]===255&&data[1]===216&&data.at(-2)===255&&data.at(-1)===217)return 'image/jpeg'
  if(data.length>20&&data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP'&&data.readUInt32LE(4)+8===data.length)return 'image/webp'
  throw Error('unsupported_cover_format')
}
function runtimeLimits(limits={}) {
  const cap=(value,max)=>{if(value===undefined)return max;if(!Number.isSafeInteger(value)||value<1)throw Error('invalid_runtime_limits');return Math.min(value,max)}
  return {maxZipBytes:cap(limits.maxZipBytes,GAME_ZIP_LIMIT),maxUnpackedBytes:cap(limits.maxUnpackedBytes,GAME_ZIP_LIMIT),maxFiles:cap(limits.maxFiles,GAME_FILE_LIMIT)}
}
async function inventory(root,limits) {
  const files=[];let total=0
  async function walk(dir){for(const item of (await readdir(dir)).sort()){
    const path=resolve(dir,item),name=relative(root,path).replaceAll('\\','/'),info=await lstat(path)
    if(info.isSymbolicLink()||!inside(root,path))throw Error('linked_path_forbidden')
    if(name.split('/').some(x=>forbidden.has(x.toLowerCase())||x.toLowerCase().startsWith('.env'))||/[\x00-\x1f\x7f\\]/.test(item))throw Error('sensitive_or_unsafe_build_file')
    if(info.isDirectory()){await walk(path);continue}
    if(!info.isFile()||!runtimeFileSupported(path))throw Error('unsupported_build_file')
    total+=info.size;if(info.size>limits.maxUnpackedBytes||total>limits.maxUnpackedBytes||files.length>=limits.maxFiles)throw Error('build_limit_exceeded')
    files.push({path,name,info})
  }}await walk(root);return files
}
async function openStable(path,limit,expected,allowEmpty=false) {
  const absolute=await unlinkedPath(path),before=expected??await lstat(absolute)
  if(!before.isFile()||before.size>limit||before.size<(allowEmpty?0:1))throw Error('invalid_artifact_size_or_type')
  const handle=await open(absolute,constants.O_RDONLY|(constants.O_NOFOLLOW??0))
  const check=async()=>{if(!same(before,await handle.stat())||!same(before,await lstat(absolute))||await unlinkedPath(absolute)!==absolute)throw Error('artifact_changed')}
  try{await check();return {handle,check}}catch(error){await handle.close();throw error}
}
export async function* stableChunks(path,limit,expected,allowEmpty=false) {
  const input=await openStable(path,limit,expected,allowEmpty)
  try{for await(const chunk of input.handle.createReadStream({autoClose:false,highWaterMark:64*1024}))yield chunk;await input.check()}
  finally{await input.handle.close()}
}
async function prepareRuntime(source,destination,limits) {
  const files=await inventory(source,limits)
  if(!files.some(x=>x.name==='index.html'))throw Error('root_index_html_required')
  const output=await open(destination,'wx',0o600),hash=createHash('sha256')
  let bytes=0,chunks=[]
  const zip=new Zip((error,chunk)=>{
    if(error)throw error
    bytes+=chunk.length;if(bytes>limits.maxZipBytes)throw Error('zip_upload_limit_exceeded')
    chunks.push(Buffer.from(chunk))
  })
  const drain=async()=>{for(const chunk of chunks){hash.update(chunk);await output.writeFile(chunk)}chunks=[]}
  try{
    for(const file of files){
      const input=await openStable(file.path,limits.maxUnpackedBytes,file.info,true)
      try{
        const entry=new ZipDeflate(file.name,{level:6,mtime:new Date('2020-01-01T00:00:00Z')});zip.add(entry)
        let overlap=''
        for await(const chunk of input.handle.createReadStream({autoClose:false,highWaterMark:64*1024})){
          const text=overlap+chunk.toString('latin1')
          if(secret.test(text))throw Error('possible_secret_in_build')
          overlap=text.slice(-512);entry.push(chunk);await drain()
        }
        await input.check();entry.push(new Uint8Array(),true);await drain()
      }finally{await input.handle.close()}
    }
    const after=await inventory(source,limits)
    if(after.length!==files.length||after.some((x,i)=>x.name!==files[i].name||!same(x.info,files[i].info)))throw Error('build_changed')
    zip.end();await drain()
    return {sha256:hash.digest('hex'),bytes,files:files.length}
  }catch(error){await output.close();await unlink(destination).catch(()=>{});throw error}
  finally{await output.close()}
}
export async function prepareArtifact({path,purpose,roots,outputDirectory,limits}) {
  const source=await permittedPath(path,roots)
  if(inside(source,resolve(outputDirectory)))throw Error('output_inside_build')
  await mkdir(outputDirectory,{recursive:true,mode:0o700});await unlinkedPath(outputDirectory)
  const artifactHandle=randomUUID()
  let data,type,count,excluded
  if(purpose==='game'){
    if(!(await lstat(source)).isDirectory())throw Error('game_build_directory_required')
    const destination=resolve(outputDirectory,artifactHandle+'.zip')
    return {artifactHandle,path:destination,...await prepareRuntime(source,destination,runtimeLimits(limits)),contentType:'application/zip',purpose}
  }else if(purpose==='source'){
    if(!(await lstat(source)).isDirectory())throw Error('source_directory_required')
    const prepared=await (await import('./source.mjs')).prepareSourceDirectory(source)
    data=prepared.data;count=prepared.files;excluded=prepared.excluded;type='application/zip'
  }else if(purpose==='cover'){data=await readStable(source,COVER_LIMIT);type=contentType(data)}else throw Error('invalid_artifact_purpose')
  const destination=resolve(outputDirectory,artifactHandle+(type==='application/zip'?'.zip':type==='image/png'?'.png':type==='image/jpeg'?'.jpg':'.webp'))
  const handle=await open(destination,'wx',0o600);try{await handle.writeFile(data)}finally{await handle.close()}
  return {artifactHandle,path:destination,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length,contentType:type,purpose,...(count?{files:count}:{}),...(excluded?{excluded}:{})}
}
export function validateReceipt(receipt) {
  if(!receipt||receipt.method!=='PUT'||typeof receipt.uploadUrl!=='string')throw Error('invalid_upload_receipt')
  const url=new URL(receipt.uploadUrl),account=/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname),bucket=/^[a-z0-9][a-z0-9-]*\.[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname)
  const path=bucket?url.pathname:account?url.pathname.replace(/^\/[a-z0-9][a-z0-9-]*(?=\/)/,''):''
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port&&url.port!=='443'||!/^\/(?:packages\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/game\.zip|game-sources\/v1\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/source\.zip|release-media\/v1\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/source\.(?:png|jpg|webp))$/.test(path))throw Error('untrusted_upload_target')
  if(url.searchParams.getAll('X-Amz-Signature').length!==1||!/^[a-f0-9]{64}$/.test(url.searchParams.get('X-Amz-Signature')??''))throw Error('unsigned_upload_target')
  const type=receipt.headers?.['Content-Type']
  if(!['application/zip','image/png','image/jpeg','image/webp'].includes(type)||JSON.stringify(Object.keys(receipt.headers).sort())!==JSON.stringify(['Content-Type','If-None-Match'])||receipt.headers['If-None-Match']!=='*')throw Error('unexpected_upload_headers')
  const game=path.startsWith('/packages/'),source=path.startsWith('/game-sources/')
  if((game||source)!==(type==='application/zip'))throw Error('unexpected_upload_headers')
  const limit=game?GAME_ZIP_LIMIT:source?ZIP_LIMIT:COVER_LIMIT
  if(!/^[a-f0-9]{64}$/.test(receipt.sha256)||!Number.isSafeInteger(receipt.bytes)||receipt.bytes<1||receipt.bytes>limit)throw Error('invalid_artifact_identity')
  return url
}
export async function uploadArtifact(path,receipt,{signal,send=sendPut}={}) {
  signal?.throwIfAborted()
  const url=validateReceipt(receipt),input=await openStable(path,receipt.bytes)
  let stream
  try{
    const hash=createHash('sha256');let bytes=0
    for await(const chunk of input.handle.createReadStream({autoClose:false,highWaterMark:64*1024})){signal?.throwIfAborted();bytes+=chunk.length;hash.update(chunk)}
    await input.check()
    if(bytes!==receipt.bytes||hash.digest('hex')!==receipt.sha256)throw Error('artifact_identity_mismatch')
    stream=input.handle.createReadStream({autoClose:false,start:0,end:receipt.bytes-1,highWaterMark:64*1024})
    const status=await send(url,stream,{...receipt.headers,'Content-Length':String(receipt.bytes)},signal)
    try{await input.check()}catch{throw Error('upload_unconfirmed_query_status')}
    if(status===412)return {status:'object_exists',next:'complete_upload'}
    if(![200,201,204].includes(status))throw Error('upload_unconfirmed_query_status')
    return {status:'uploaded',bytes:receipt.bytes,sha256:receipt.sha256,next:'complete_upload'}
  }finally{stream?.destroy();await input.handle.close()}
}
export function sendPut(url,data,headers,signal,requester=request) {
  return new Promise((resolve,reject)=>{
    const req=requester(url,{method:'PUT',headers,signal},res=>{res.resume();resolve(res.statusCode)})
    // uploadArtifact owns the pinned file handle and must verify it once more
    // after the response. Destroying this stream here would close it too early.
    req.setTimeout(120000,()=>req.destroy());req.on('close',()=>{data.unpipe(req);data.pause()})
    req.on('error',()=>reject(Error('upload_unconfirmed_query_status')))
    data.on('error',()=>req.destroy());data.pipe(req)
  })
}
