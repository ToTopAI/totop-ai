import { constants } from 'node:fs'
import { lstat, open, readdir, realpath, mkdir } from 'node:fs/promises'
import { resolve, relative, isAbsolute, dirname, extname, parse } from 'node:path'
import { homedir } from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { request } from 'node:https'
import { zipSync } from 'fflate'

export const ZIP_LIMIT=100*1024*1024, COVER_LIMIT=10*1024*1024
const forbidden=new Set(['.git','.hg','.svn','node_modules','.ssh','.aws','.npmrc','.pypirc','credentials','id_rsa','id_ed25519'])
const allowed=new Set('.html .htm .js .mjs .css .json .wasm .data .bin .unityweb .pck .gz .br .png .jpg .jpeg .webp .gif .svg .ico .avif .ktx .ktx2 .basis .mp3 .ogg .wav .m4a .mp4 .webm .woff .woff2 .ttf .otf .glb .gltf .obj .mtl .txt .xml'.split(' '))
const secret=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:AKIA|ASIA)[A-Z0-9]{16}|\bsk-[A-Za-z0-9_-]{32,}/
const inside=(root,path)=>{const rel=relative(root,path);return rel===''||!rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))&&rel!=='..'&&!isAbsolute(rel)}
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs

/** Check every ancestor, including Windows junctions, before accessing a file. */
export async function unlinkedPath(path) {
  const absolute=resolve(path);let part=absolute
  while(part!==parse(part).root){if((await lstat(part)).isSymbolicLink())throw Error('linked_path_forbidden');part=dirname(part)}
  if(await realpath(absolute)!==absolute)throw Error('linked_path_forbidden')
  return absolute
}
export async function permittedPath(path,roots) {
  if(!Array.isArray(roots)||!roots.length)throw Error('allowed_game_directory_required')
  const absolute=await unlinkedPath(path)
  let permitted=false
  for(const root of roots){const reviewed=await unlinkedPath(root);if(reviewed===parse(reviewed).root||reviewed===homedir()||!(await lstat(reviewed)).isDirectory())throw Error('specific_game_directory_required');if(inside(reviewed,absolute))permitted=true}
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
async function inventory(root) {
  const files=[];let total=0
  async function walk(dir){for(const item of (await readdir(dir)).sort()){
    const path=resolve(dir,item),name=relative(root,path).replaceAll('\\','/'),info=await lstat(path)
    if(info.isSymbolicLink()||!inside(root,path))throw Error('linked_path_forbidden')
    if(name.split('/').some(x=>forbidden.has(x.toLowerCase())||x.toLowerCase().startsWith('.env'))||/[\x00-\x1f\x7f\\]/.test(item))throw Error('sensitive_or_unsafe_build_file')
    if(info.isDirectory()){await walk(path);continue}
    if(!info.isFile()||!allowed.has(extname(path).toLowerCase()))throw Error('unsupported_build_file')
    total+=info.size;if(info.size>ZIP_LIMIT||total>500*1024*1024||files.length>=5000)throw Error('build_limit_exceeded')
    files.push({path,name,info})
  }}await walk(root);return files
}
export async function prepareArtifact({path,purpose,roots,outputDirectory}) {
  const source=await permittedPath(path,roots)
  let data,type,count
  if(purpose==='game'){
    if(!(await lstat(source)).isDirectory())throw Error('game_build_directory_required')
    const files=await inventory(source);if(!files.some(x=>x.name==='index.html'))throw Error('root_index_html_required')
    const entries={}
    for(const file of files){const bytes=await readStable(file.path,ZIP_LIMIT,file.info,true);if(secret.test(bytes.toString('latin1')))throw Error('possible_secret_in_build');entries[file.name]=[bytes,{mtime:new Date('2020-01-01T00:00:00Z')}]}
    const after=await inventory(source)
    if(after.length!==files.length||after.some((x,i)=>x.name!==files[i].name||!same(x.info,files[i].info)))throw Error('build_changed')
    data=Buffer.from(zipSync(entries,{level:6}));type='application/zip';count=files.length
    if(data.length>ZIP_LIMIT)throw Error('zip_upload_limit_exceeded')
  }else if(purpose==='cover'){data=await readStable(source,COVER_LIMIT);type=contentType(data)}else throw Error('invalid_artifact_purpose')
  await mkdir(outputDirectory,{recursive:true,mode:0o700});await unlinkedPath(outputDirectory)
  if(inside(source,resolve(outputDirectory)))throw Error('output_inside_build')
  const artifactHandle=randomUUID(),destination=resolve(outputDirectory,artifactHandle+(purpose==='game'?'.zip':type==='image/png'?'.png':type==='image/jpeg'?'.jpg':'.webp'))
  const handle=await open(destination,'wx',0o600);try{await handle.writeFile(data)}finally{await handle.close()}
  return {artifactHandle,path:destination,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length,contentType:type,purpose,...(count?{files:count}:{})}
}
export function validateReceipt(receipt) {
  if(!receipt||receipt.method!=='PUT'||typeof receipt.uploadUrl!=='string')throw Error('invalid_upload_receipt')
  const url=new URL(receipt.uploadUrl),account=/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname),bucket=/^[a-z0-9][a-z0-9-]*\.[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname)
  const path=bucket?url.pathname:account?url.pathname.replace(/^\/[a-z0-9][a-z0-9-]*(?=\/)/,''):''
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port&&url.port!=='443'||!/^\/(?:packages\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/game\.zip|release-media\/v1\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/source\.(?:png|jpg|webp))$/.test(path))throw Error('untrusted_upload_target')
  if(url.searchParams.getAll('X-Amz-Signature').length!==1||!/^[a-f0-9]{64}$/.test(url.searchParams.get('X-Amz-Signature')??''))throw Error('unsigned_upload_target')
  const type=receipt.headers?.['Content-Type']
  if(!['application/zip','image/png','image/jpeg','image/webp'].includes(type)||JSON.stringify(Object.keys(receipt.headers).sort())!==JSON.stringify(['Content-Type','If-None-Match'])||receipt.headers['If-None-Match']!=='*')throw Error('unexpected_upload_headers')
  if(!/^[a-f0-9]{64}$/.test(receipt.sha256)||!Number.isSafeInteger(receipt.bytes)||receipt.bytes<1||receipt.bytes>(type==='application/zip'?ZIP_LIMIT:COVER_LIMIT))throw Error('invalid_artifact_identity')
  return url
}
export async function uploadArtifact(path,receipt,{signal,send=sendPut}={}) {
  const url=validateReceipt(receipt),data=await readStable(path,receipt.bytes)
  if(data.length!==receipt.bytes||createHash('sha256').update(data).digest('hex')!==receipt.sha256)throw Error('artifact_identity_mismatch')
  const status=await send(url,data,{...receipt.headers,'Content-Length':String(data.length)},signal)
  if(status===412)return {status:'object_exists',next:'complete_upload'}
  if(![200,201,204].includes(status))throw Error('upload_unconfirmed_query_status')
  return {status:'uploaded',bytes:receipt.bytes,sha256:receipt.sha256,next:'complete_upload'}
}
function sendPut(url,data,headers,signal) {
  return new Promise((resolve,reject)=>{const req=request(url,{method:'PUT',headers,signal},res=>{res.resume();resolve(res.statusCode)});const timer=setTimeout(()=>req.destroy(),120000);req.on('close',()=>clearTimeout(timer));req.on('error',()=>reject(Error('upload_unconfirmed_query_status')));req.end(data)})
}
