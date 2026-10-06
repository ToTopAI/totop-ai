import {createHash} from 'node:crypto'
import {inflateRawSync} from 'node:zlib'
import {lstat,mkdir,open,readdir,rm} from 'node:fs/promises'
import {resolve,dirname,relative,extname,basename} from 'node:path'
import {zipSync} from 'fflate'
import {permittedPath,readStable,unlinkedPath,ZIP_LIMIT} from './artifacts.mjs'
import {ENDPOINT} from './oauth.mjs'

export const SOURCE_SECRET=/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\b(?:sk|rk)-(?:live-)?[A-Za-z0-9_-]{24,}\b|\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b|\bAIza[A-Za-z0-9_-]{30,}\b|\bgh[opsu]_[A-Za-z0-9]{30,}\b|\bxox[baprs]-[A-Za-z0-9-]{20,}\b|\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/
export const sourceForbidden=/(?:^|\/)(?:\.env[^/]*|\.git|\.hg|\.svn|node_modules|vendor|\.ssh|\.aws|\.npmrc|\.pypirc|credentials|secrets|id_rsa|id_ed25519)(?:\/|$)|\.(?:zip|gz|tgz|bz2|xz|7z|rar|tar|exe|msi|dmg|pkg|deb|rpm|bat|cmd|ps1|pem|key|p12|pfx)$/i
const sourceExtensions=new Set('.html .htm .js .mjs .cjs .ts .tsx .jsx .css .scss .sass .less .json .md .txt .yaml .yml .toml .xml .csv .svg .png .jpg .jpeg .webp .gif .ico .avif .mp3 .ogg .wav .m4a .mp4 .webm .woff .woff2 .ttf .otf .glb .gltf .obj .mtl .wgsl .glsl .vert .frag .c .h .cpp .hpp .rs .py .sh .lua .gd .godot .tres .tscn'.split(' '))
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const hash=data=>createHash('sha256').update(data).digest('hex')
const table=Array.from({length:256},(_,i)=>{for(let n=0;n<8;n++)i=(i&1)?0xedb88320^(i>>>1):i>>>1;return i>>>0})
const crc=data=>{let value=0xffffffff;for(const byte of data)value=table[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0}
function safeName(name){const parts=name.replace(/\/$/,'').split('/');if(name.length>512||/[\\\x00-\x1f\x7f%?#:]/.test(name)||parts.some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))||sourceForbidden.test(name))throw Error('source_unsafe_file');return parts}
export function checkSourceContent(data){
  const hex=data.subarray(0,8).toString('hex')
  if(/^(?:4d5a|7f454c46|504b(?:0304|0506|0708)|1f8b|377abcaf271c|526172211a07|425a68|fd377a585a00|cafebabe|bebafeca|feedface|cefaedfe|feedfacf|cffaedfe|edabeedb|213c617263683e0a)/.test(hex)||data.subarray(257,262).toString()==='ustar'||SOURCE_SECRET.test(data.toString('utf8')))throw Error('source_unsafe_content')
}
/** ZIP central/local agreement, bounded inflate and CRC: never execute archive content. */
export function inspectSourceZip(input,expectedHash){
  const data=Buffer.from(input);if(!data.length||data.length>ZIP_LIMIT||hash(data)!==expectedHash)throw Error('source_integrity')
  let end=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(data.readUInt32LE(i)===0x06054b50&&i+22+data.readUInt16LE(i+20)===data.length){end=i;break}
  if(end<0||data.readUInt16LE(end+4)||data.readUInt16LE(end+6)||data.readUInt16LE(end+8)!==data.readUInt16LE(end+10))throw Error('source_invalid_zip')
  const count=data.readUInt16LE(end+10),start=data.readUInt32LE(end+16),size=data.readUInt32LE(end+12)
  if(!count||count>10000||start+size!==end||start>=end)throw Error('source_limits')
  let cursor=start,total=0;const entries=[],names=new Set(),intervals=[]
  for(let i=0;i<count;i++){
    if(cursor+46>end||data.readUInt32LE(cursor)!==0x02014b50)throw Error('source_invalid_zip')
    const flags=data.readUInt16LE(cursor+8),method=data.readUInt16LE(cursor+10),checksum=data.readUInt32LE(cursor+16),packed=data.readUInt32LE(cursor+20),unpacked=data.readUInt32LE(cursor+24),n=data.readUInt16LE(cursor+28),extra=data.readUInt16LE(cursor+30),comment=data.readUInt16LE(cursor+32),mode=(data.readUInt32LE(cursor+38)>>>16)&0xf000,offset=data.readUInt32LE(cursor+42)
    if(cursor+46+n+extra+comment>end||data.readUInt16LE(cursor+34)||flags&1||![0,8].includes(method)||![0,0x8000,0x4000].includes(mode)||unpacked===0xffffffff||packed===0xffffffff)throw Error('source_unsafe_file')
    const rawName=data.subarray(cursor+46,cursor+46+n),name=new TextDecoder('utf-8',{fatal:true}).decode(rawName),parts=safeName(name),key=parts.join('/').toLowerCase()
    if(names.has(key))throw Error('source_duplicate_path');names.add(key)
    if(offset+30>start||data.readUInt32LE(offset)!==0x04034b50||data.readUInt16LE(offset+6)!==flags||data.readUInt16LE(offset+8)!==method)throw Error('source_invalid_zip')
    const ln=data.readUInt16LE(offset+26),le=data.readUInt16LE(offset+28),begin=offset+30+ln+le,finish=begin+packed
    if(finish>start||!data.subarray(offset+30,offset+30+ln).equals(rawName)||!(flags&8)&&(data.readUInt32LE(offset+14)!==checksum||data.readUInt32LE(offset+18)!==packed||data.readUInt32LE(offset+22)!==unpacked))throw Error('source_invalid_zip')
    intervals.push([offset,finish]);cursor+=46+n+extra+comment
    if(name.endsWith('/')){if(unpacked||packed)throw Error('source_invalid_zip');continue}
    total+=unpacked;if(unpacked>ZIP_LIMIT||total>500*1024*1024||entries.length>=5000)throw Error('source_limits')
    const compressed=data.subarray(begin,finish),content=method===0?compressed:inflateRawSync(compressed,{maxOutputLength:Math.max(1,unpacked)})
    if(content.length!==unpacked||crc(content)!==checksum)throw Error('source_corrupt_entry')
    checkSourceContent(content);entries.push({name,data:content})
  }
  if(cursor!==end)throw Error('source_invalid_zip')
  intervals.sort((a,b)=>a[0]-b[0]);if(intervals[0][0]!==0||intervals.some((v,i)=>i&&v[0]<intervals[i-1][1]))throw Error('source_invalid_zip')
  const files=new Set(entries.map(x=>x.name.toLowerCase()));for(const {name}of entries){const parts=name.toLowerCase().split('/');for(let i=1;i<parts.length;i++)if(files.has(parts.slice(0,i).join('/')))throw Error('source_duplicate_path')}
  const license=entries.find(x=>x.name==='LICENSE')?.data,readme=entries.find(x=>x.name==='README.md')?.data
  if(!license||license.length>16384||!readme||readme.length>65536)throw Error('source_license_or_readme_required')
  const text=license.toString('utf8').replace(/\s+/g,' ')
  if(!['Permission is hereby granted, free of charge, to any person obtaining a copy','to deal in the Software without restriction','The above copyright notice and this permission notice shall be included','THE SOFTWARE IS PROVIDED "AS IS"','IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE'].every(x=>text.includes(x))||!/Copyright\s+(?:\(c\)\s*)?\S/i.test(text))throw Error('source_license_required')
  if(!/(?:build|run|start|运行|构建|启动)/i.test(readme.toString('utf8')))throw Error('source_readme_required')
  return entries
}
export async function prepareSourceDirectory(root){
  const files=[],excluded=[];let total=0,visited=0
  async function walk(dir){for(const item of (await readdir(dir)).sort()){
    if(++visited>10000)throw Error('source_limits')
    const path=resolve(dir,item),name=relative(root,path).replaceAll('\\','/'),info=await lstat(path)
    if(info.isSymbolicLink())throw Error('linked_path_forbidden')
    if(sourceForbidden.test(name)||item==='.DS_Store'){excluded.push(name+(info.isDirectory()?'/':''));continue}
    safeName(name)
    if(info.isDirectory()){await walk(path);continue}
    if(!info.isFile()||!sourceExtensions.has(extname(item).toLowerCase())&&!/^(?:LICENSE|COPYING|NOTICE|Makefile|\.gitignore|\.gitattributes)$/i.test(item))throw Error('unsupported_source_file')
    total+=info.size;if(info.size>ZIP_LIMIT||total>500*1024*1024||files.length>=5000)throw Error('source_limits')
    const content=await readStable(path,ZIP_LIMIT,info,true);checkSourceContent(content);files.push({name,path,info,content})
  }}await walk(root)
  // Re-read every included file, then compare names to detect additions/deletions too.
  const original=new Map(files.map(x=>[x.name,hash(x.content)]));const names=[]
  async function verify(dir){for(const item of (await readdir(dir)).sort()){const path=resolve(dir,item),name=relative(root,path).replaceAll('\\','/'),info=await lstat(path);if(info.isSymbolicLink())throw Error('linked_path_forbidden');if(sourceForbidden.test(name)||item==='.DS_Store')continue;if(info.isDirectory())await verify(path);else names.push(name)}}await verify(root)
  if(JSON.stringify(names)!==JSON.stringify(files.map(x=>x.name)))throw Error('source_changed')
  for(const file of files)if(hash(await readStable(file.path,ZIP_LIMIT,file.info,true))!==original.get(file.name))throw Error('source_changed')
  const data=Buffer.from(zipSync(Object.fromEntries(files.map(x=>[x.name,[x.content,{mtime:new Date('2020-01-01')}]])),{level:6}));inspectSourceZip(data,hash(data))
  return {data,files:files.length,excluded}
}
export async function extractSourceNewDirectory(data,sha256,destination,roots){
  const entries=inspectSourceZip(data,sha256),requested=resolve(destination),parent=await permittedPath(dirname(requested),roots)
  // Canonical parent may expand a legitimate Windows 8.3 alias. Its ancestry
  // was already checked for links/junctions; create only the validated new child.
  const name=basename(requested);safeName(name);const target=resolve(parent,name)
  await mkdir(target,{mode:0o700}) // exclusive: never replace or merge an existing project
  try{await unlinkedPath(target);for(const entry of entries){const path=resolve(target,entry.name);await mkdir(dirname(path),{recursive:true,mode:0o700});await unlinkedPath(dirname(path));const fd=await open(path,'wx',0o600);try{await fd.writeFile(entry.data)}finally{await fd.close()}}return {directory:target,files:entries.length,sha256}}
  catch(error){await unlinkedPath(target);await rm(target,{recursive:true});throw error}
}
export async function downloadGameSource({remote,auth,gameId,releaseId,destination,roots,signal,fetcher=fetch}){
  if(!uuid.test(gameId??'')||!uuid.test(releaseId??''))throw Error('invalid_source_identity')
  await permittedPath(dirname(resolve(destination)),roots)
  try{await lstat(resolve(destination));throw Error('source_destination_exists')}catch(error){if(error.code!=='ENOENT')throw error}
  const response=await remote.callTool({name:'get_game_source',arguments:{gameId,releaseId}},undefined,{signal,timeout:120000})
  if(response.isError)throw Error('source_unavailable')
  const metadata=response.structuredContent??JSON.parse(response.content.find(x=>x.type==='text').text)
  if(metadata.gameId!==gameId||metadata.releaseId!==releaseId||!uuid.test(metadata.sourceId??'')||!/^[a-f0-9]{64}$/.test(metadata.sha256??'')||metadata.license!=='MIT'||!Number.isSafeInteger(metadata.bytes)||metadata.bytes<1||metadata.bytes>ZIP_LIMIT)throw Error('invalid_source_identity')
  const token=(await auth.tokens())?.access_token;if(!token)throw Error('login_required')
  const download=await fetcher(new URL(`/v2/games/${gameId}/releases/${releaseId}/source`,ENDPOINT),{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000)})
  if(!download.ok||Number(download.headers.get('Content-Length'))!==metadata.bytes||!download.body)throw Error('source_download_failed')
  let size=0;const chunks=[];for await(const chunk of download.body){size+=chunk.length;if(size>metadata.bytes)throw Error('source_integrity');chunks.push(chunk)}
  if(size!==metadata.bytes)throw Error('source_integrity')
  // A concurrent logout/login in another process must not carry a download into the next account.
  if(auth.store&&(await auth.store.load())?.access_token!==token)throw Error('account_changed_retry_download')
  signal?.throwIfAborted()
  return {...await extractSourceNewDirectory(Buffer.concat(chunks),metadata.sha256,destination,roots),sourceId:metadata.sourceId,releaseId,license:'MIT'}
}
