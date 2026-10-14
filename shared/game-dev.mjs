import {mkdir,readFile,readdir,writeFile,lstat,copyFile,rename,rm} from 'node:fs/promises'
import {resolve,dirname,relative,isAbsolute,extname} from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {createServer} from 'node:http'
import {permittedPath,unlinkedPath,readStable} from './artifacts.mjs'
import {validateGameManifest} from './game-manifest.mjs'
const assets=new URL('./game-assets/',import.meta.url)
const sdkVersion='1.0.0'
const json=value=>JSON.stringify(value,null,2)+'\n'
const manifest=engine=>({schemaVersion:1,sdkVersion,engine,orientation:'any',locales:['en'],saveSchemaVersion:1,capabilities:['cloudSave','analytics']})
const index=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Orbit Catch</title><link rel="stylesheet" href="game.css"><main><header><span>ORBIT CATCH</span><button id="mute">Sound off</button></header><h1>Catch a little light.</h1><p>Tap the glowing orbit. You have 30 seconds.</p><div class="stats"><span id="score">0 points</span><span id="time">30s</span><span id="best">Best 0</span></div><canvas id="board" aria-label="Tap the glowing circles"></canvas><footer><button id="start">Play</button><button id="pause">Pause</button><button id="reward">Try rewarded ad</button></footer><p id="status" role="status">Connecting to ToTop…</p></main><script src="totop-game.global.js"></script><script type="module" src="game.js"></script></html>`
const css=`*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:#08151b;color:#e5f6ee;font:16px system-ui;display:grid;place-items:center}main{display:flex;flex-direction:column;width:min(100%,780px);height:min(100dvh,850px);padding:max(18px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}header,.stats,footer{display:flex;gap:12px;align-items:center;justify-content:space-between;flex:none}header span{color:#99c9b5;font-size:12px;letter-spacing:3px}h1{flex:none;font-size:clamp(27px,5vw,48px);margin:20px 0 6px}p{flex:none;color:#a5c4b8;margin:8px 0}.stats{margin:18px 0 12px;font-size:14px}canvas{flex:1;min-height:80px;display:block;width:100%;height:0;background:#10262e;border-radius:20px;touch-action:none}footer{justify-content:flex-start;margin-top:14px;flex-wrap:wrap}button{border:1px solid #355d59;background:#173e41;color:#e5f6ee;padding:10px 17px;border-radius:12px;font:inherit;cursor:pointer}#start{background:#bbe7aa;color:#132329;border:0}button:disabled{opacity:.45;cursor:default}#status{min-height:20px;font-size:13px}@media(max-height:500px){main{padding:10px 18px}h1{font-size:25px;margin:9px 0 3px}p{font-size:13px;margin:5px 0}.stats{margin:8px 0}button{padding:7px 12px;font-size:13px}footer{margin-top:8px}}`
const game=`const sdk=window.ToTopGame,board=document.querySelector('#board'),ctx=board.getContext('2d'),status=document.querySelector('#status');
let score=0,best=0,remaining=30,active=false,paused=false,hostPaused=false,saveRevision=0,target={x:.5,y:.5},last=performance.now();
function update(){document.querySelector('#score').textContent=score+' points';document.querySelector('#best').textContent='Best '+best;document.querySelector('#time').textContent=Math.ceil(remaining)+'s'}
function move(){target={x:.12+Math.random()*.76,y:.15+Math.random()*.7}}
function draw(now){const rect=board.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(board.width!==Math.round(rect.width*dpr)||board.height!==Math.round(rect.height*dpr)){board.width=Math.round(rect.width*dpr);board.height=Math.round(rect.height*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);ctx.fillStyle='#1d3940';for(let x=22;x<rect.width;x+=36)for(let y=20;y<rect.height;y+=36){ctx.beginPath();ctx.arc(x,y,1.1,0,Math.PI*2);ctx.fill()}ctx.fillStyle=active?'#b7edb0':'#527672';ctx.shadowColor='#94dfb8';ctx.shadowBlur=active?22:0;ctx.beginPath();ctx.arc(target.x*rect.width,target.y*rect.height,22+Math.sin(now/250)*2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(active&&!paused&&!hostPaused){remaining-=Math.min((now-last)/1000,.1);if(remaining<=0)void finish()}last=now;update();requestAnimationFrame(draw)}
async function finish(){active=false;remaining=0;best=Math.max(best,score);await sdk.lifecycle.gameplayStop();try{const saved=await sdk.storage.save(0,{best},{schemaVersion:1,baseRevision:saveRevision});saveRevision=saved.revision;status.textContent='Round complete · '+score+' points · '+saved.sync}catch(error){status.textContent='Round complete · save: '+error.code}document.querySelector('#start').textContent='Play again'}
board.addEventListener('pointerdown',event=>{if(!active||paused||hostPaused)return;const rect=board.getBoundingClientRect();if(Math.hypot(event.clientX-rect.left-target.x*rect.width,event.clientY-rect.top-target.y*rect.height)<42){score++;move();status.textContent='Nice catch!'}});
document.querySelector('#start').onclick=async()=>{score=0;remaining=30;paused=false;active=true;move();last=performance.now();await sdk.lifecycle.gameplayStart();status.textContent='Catch the light!'};
document.querySelector('#pause').onclick=async()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Resume':'Pause';if(active)await sdk.lifecycle[paused?'gameplayStop':'gameplayStart']()};
let muted=true;document.querySelector('#mute').onclick=()=>{muted=!muted;document.querySelector('#mute').textContent=muted?'Sound off':'Sound on'};
document.querySelector('#reward').onclick=async()=>{try{const result=await sdk.ads.rewarded('bonus');status.textContent=(result.mock?'TEST · ':'')+result.status;if(result.status==='completed'){score+=5;update()}}catch(error){status.textContent=error.code}};
try{const manifest=await fetch('./totop.game.json').then(r=>r.json());await sdk.init({gameId:manifest.gameId});sdk.on('pauseChanged',value=>hostPaused=value);sdk.on('audioChanged',()=>{});sdk.on('playerChanged',async()=>{active=false;score=0;remaining=30;await sdk.lifecycle.gameplayStop();const current=await sdk.storage.load(0);best=Number(current?.payload.best??0);saveRevision=current?.revision??0;status.textContent='Account changed · progress restored';update()});const save=await sdk.storage.load(0);best=Number(save?.payload.best??0);saveRevision=save?.revision??0;await sdk.lifecycle.ready();status.textContent='Ready. Tap Play.';document.querySelector('#reward').disabled=!['available','mock'].includes(sdk.getCapabilities().rewarded.state);if(sdk.getContext().environment!=='production')window.__totopQA__={state:()=>({score,best,remaining,active,paused,hostPaused,saveRevision,target}),finish};requestAnimationFrame(draw)}catch(error){status.textContent='SDK: '+error.code;document.querySelector('#start').disabled=true}
`
export async function inspectGameProject({path,roots}){
 const root=await permittedPath(path,roots);if(!(await lstat(root)).isDirectory())throw Error('project_directory_required')
 const exists=async name=>{try{const file=resolve(root,name);await permittedPath(file,roots);return(await lstat(file)).isFile()}catch(error){if(error.code==='ENOENT')return false;throw error}}
 let engine='html5'
 if(await exists('project.godot'))engine='godot';else if(await exists('ProjectSettings/ProjectVersion.txt')||await exists('Assets/ToTop/ToTopGame.cs'))engine='unity'
 let config=null;try{config=JSON.parse((await readStable(resolve(root,'.totop/project.json'),32768)).toString());if(!['html5','unity','godot'].includes(config.engine)||config.schemaVersion!==1)throw Error('invalid_project_config');engine=config.engine}catch(error){if(error.code!=='ENOENT')throw error}
 return{root,engine,projectId:config?.projectId??null,sdkVersion,config,buildStatus:'not_run',gameplayStatus:'not_run'}
}
export async function createGameProject({destination,roots,engine='html5',title='My ToTop Game'}){
 if(!['html5','unity','godot'].includes(engine))throw Error('unsupported_engine')
 const parent=await permittedPath(dirname(resolve(destination)),roots),directory=resolve(parent,relative(parent,resolve(destination)))
 if(directory===parent||relative(parent,directory).startsWith('..')||isAbsolute(relative(parent,directory)))throw Error('invalid_new_project_directory')
 await mkdir(directory,{recursive:false})
 await mkdir(resolve(directory,'.totop'));await writeFile(resolve(directory,'.totop/project.json'),json({schemaVersion:1,projectId:randomUUID(),engine,sdkVersion,title}),{flag:'wx'})
 if(engine==='html5'){
  await mkdir(resolve(directory,'src'));for(const[name,body]of Object.entries({'index.html':index,'game.js':game,'game.css':css,'totop.game.json':json(manifest(engine))}))await writeFile(resolve(directory,'src',name),body,{flag:'wx'})
  await copyFile(new URL('totop-game.global.js',assets),resolve(directory,'src/totop-game.global.js'))
 }else{
  const from=new URL(`engines/${engine}/`,assets)
  async function copy(source,dest){await mkdir(dest,{recursive:true});for(const entry of await readdir(source,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('linked_template_forbidden');const input=new URL(entry.name+(entry.isDirectory()?'/':''),source),output=resolve(dest,entry.name);if(entry.isDirectory())await copy(input,output);else await copyFile(input,output)}}
  await copy(from,directory);await writeFile(resolve(directory,'totop.game.json'),json(manifest(engine)),{flag:'wx'})
 }
 await writeFile(resolve(directory,'README.md'),`# ${title.replace(/[\r\n]/g,' ')}\n\nToTop ${engine} SDK ${sdkVersion}. Use your Agent's ToTop develop-game workflow to inspect, build, preview and test. No platform game is created or submitted by scaffolding. Assets in the HTML5 starter are generated shapes and system fonts. Engine editor/license availability must be checked before claiming build acceptance.\n`,{flag:'wx'})
 return{directory,engine,sdkVersion,status:'created',next:'inspect / build / dev / check',publicationStatus:'not_submitted'}
}
export async function checkGameBuild({path,roots}){
 const root=await permittedPath(path,roots),checks=[]
 const check=(name,passed,detail)=>checks.push({name,status:passed?'pass':'fail',detail})
 try{await readStable(resolve(root,'index.html'),1048576);check('root_entry',true,'Root index.html exists')}catch{check('root_entry',false,'Export the game with root index.html')}
 try{const value=JSON.parse((await readStable(resolve(root,'totop.game.json'),32768)).toString()),valid=validateGameManifest(value);check('sdk_manifest',valid.valid,valid.valid?'Pinned SDK manifest matches the full schema':valid.errorMessage);check('platform_binding',typeof value.gameId==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value.gameId),'Binding required before publication; local prototype can omit it')}catch{check('sdk_manifest',false,'Missing/invalid totop.game.json')}
 const files=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,entry.name);if(entry.isSymbolicLink())throw Error('linked_path_forbidden');if(entry.isDirectory())await walk(file);else if(entry.isFile())files.push({name:relative(root,file).replaceAll('\\','/'),bytes:(await lstat(file)).size})}}await walk(root)
 const bytes=files.reduce((total,file)=>total+file.bytes,0);check('unpacked_limit',bytes<=524288000&&files.length<=20000,'Current runtime maximum 500 MiB / 20,000 files; recheck server before upload')
 return{root,sdkVersion,checks,files:files.length,unpackedBytes:bytes,staticStatus:checks.every(check=>check.status==='pass')?'pass':'fail',buildStatus:'not_run',gameplayStatus:'not_run',next:'Run actual browser/engine QA; static checks do not prove gameplay'}
}
export async function buildHtmlGame({path,roots}){
 const project=await inspectGameProject({path,roots});if(project.engine!=='html5')throw Error('engine_export_required')
 const source=await permittedPath(resolve(project.root,'src'),roots),outParent=resolve(project.root,'.totop/builds');await mkdir(outParent,{recursive:true});await unlinkedPath(outParent)
 const output=resolve(outParent,randomUUID());await mkdir(output)
 const hashes={};async function copy(from,to){for(const entry of await readdir(from,{withFileTypes:true})){const input=resolve(from,entry.name),dest=resolve(to,entry.name);if(entry.isSymbolicLink())throw Error('linked_path_forbidden');if(entry.isDirectory()){await mkdir(dest);await copy(input,dest)}else{const data=await readStable(input,200*1024*1024,undefined,true);await writeFile(dest,data,{flag:'wx'});hashes[relative(output,dest).replaceAll('\\','/')]=createHash('sha256').update(data).digest('hex')}}}await copy(source,output)
 return{directory:output,engine:'html5',sdkVersion,buildStatus:'pass',gameplayStatus:'not_run',files:hashes}
}
export async function bindGameProject({path,roots,gameId}){
 if(typeof gameId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(gameId))throw Error('invalid_game_binding')
 const project=await inspectGameProject({path,roots}),file=resolve(project.root,project.engine==='html5'?'src/totop.game.json':'totop.game.json')
 let before
 try{before=await lstat(file)}catch(error){if(error.code==='ENOENT')return{status:'not_configured',gameId,next:'Integrate the SDK before binding its manifest'};throw error}
 const value=JSON.parse((await readStable(file,32768,before)).toString())
 if(!validateGameManifest({...value,gameId}).valid||value.engine!==project.engine)throw Error('invalid_sdk_manifest')
 const temporary=resolve(dirname(file),`.totop-bind-${randomUUID()}.json`)
 try{
  await writeFile(temporary,json({...value,gameId}),{flag:'wx',mode:before.mode&0o777})
  await unlinkedPath(file);const current=await lstat(file)
  if(current.ino!==before.ino||current.size!==before.size||current.mtimeMs!==before.mtimeMs)throw Error('project_changed_retry')
  await rename(temporary,file)
 }finally{await rm(temporary,{force:true})}
 return{status:'bound',gameId,manifest:file,next:'Rebuild/export; existing immutable builds are unchanged',publicationStatus:'not_submitted'}
}
export async function startGamePreview({path,roots,port=0,config={}}){
 const root=await permittedPath(path,roots)
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('invalid_preview_port')
 if(!config||typeof config!=='object'||Array.isArray(config)||Buffer.byteLength(JSON.stringify(config))>32768)throw Error('invalid_preview_config')
 const diagnostics={environment:'local',sdkVersion,connected:false,ready:false,started:false,stopped:false,customEvents:0,errors:[],evidence:'preview_reported; does not prove gameplay or production persistence'}
 let gameId='local:'+createHash('sha256').update(root).digest('hex').slice(0,16)
 try{
  const value=JSON.parse((await readStable(resolve(root,'totop.game.json'),32768)).toString())
  if(value.gameId!==undefined){if(typeof value.gameId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value.gameId))throw Error('invalid_game_binding');gameId=value.gameId}
 }catch(error){if(error.code!=='ENOENT')throw error}
 const host=`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>ToTop SDK Preview</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body{display:flex;flex-direction:column;background:#08151b;color:#e4f4ec;font:14px system-ui}header{flex:none;padding:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}button,select{padding:8px}iframe{flex:1;min-height:0;width:100%;border:0}</style><header><b>ToTop · Local SDK test</b><button id="pause">Pause host</button><button id="audio">Mute host</button><select id="account"><option value="">Guest</option><option value="a">Mock user A</option><option value="b">Mock user B</option></select><select id="scenario"><option>completed</option><option>cancelled</option><option>unfilled</option><option>failed</option></select><span id="events">No SDK events yet</span></header><iframe src="/game/index.html" sandbox="allow-scripts allow-same-origin allow-pointer-lock" title="Game preview"></iframe><script type="module">import{attachGameHost,createIndexedDbSaveStore,createCloudSimulator}from'/_totop/host.js';const store=createIndexedDbSaveStore();let muted=false,paused=false;const logs=[];const observe=event=>fetch('/_totop/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event})}).catch(()=>{});const host=attachGameHost(document.querySelector('iframe'),{gameOrigin:location.origin,gameId:${JSON.stringify(gameId)},environment:'local',store,config:${JSON.stringify(config).replaceAll('<','\\u003c')},cloudMock:true,onConnected:()=>observe('connected'),onError:()=>observe('error'),report:async(name,data)=>{observe(name);logs.push({name,data,at:Date.now()});document.querySelector('#events').textContent=name},products:[{id:'test_coins',title:'Test coins',price:'0',currency:'TEST',consumable:true}],simulate:async()=>document.querySelector('#scenario').value});document.querySelector('#account').onchange=event=>{const id=event.target.value;host.runtime.setPlayer(id?{id:'mock-user-'+id,nickname:'Mock '+id,avatarUrl:''}:null,id?createCloudSimulator(store,host.runtime.getContext().gameId,'mock-user-'+id):undefined)};document.querySelector('#pause').onclick=()=>{paused=!paused;host.runtime.setPause('test',paused)};document.querySelector('#audio').onclick=()=>{muted=!muted;host.runtime.setAudio(!muted)};window.__totopPreview={logs,context:()=>host.runtime.getContext(),runtime:host.runtime};</script></html>`
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.pck':'application/octet-stream'}
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff')
  try{if(req.headers.host!==`127.0.0.1:${server.address().port}`)throw Error('untrusted_host');const url=new URL(req.url??'/', 'http://127.0.0.1');
   if(req.method==='POST'&&url.pathname==='/_totop/report'&&!url.search){
    if(req.headers.origin!==`http://127.0.0.1:${server.address().port}`||req.headers['content-type']!=='application/json')throw Error('not_found')
    let body='';for await(const chunk of req){body+=chunk;if(body.length>256)throw Error('not_found')}
    const value=JSON.parse(body);if(Object.keys(value).join(',')!=='event'||!['connected','ready','start','stop','custom','error','loading','level_started','level_completed','level_failed'].includes(value.event))throw Error('not_found')
    if(value.event==='connected')diagnostics.connected=true
    if(value.event==='ready')diagnostics.ready=true
    if(value.event==='start')diagnostics.started=true
    if(value.event==='stop')diagnostics.stopped=true
    if(value.event==='custom')diagnostics.customEvents++
    if(value.event==='error'&&diagnostics.errors.length<20)diagnostics.errors.push('host_protocol_error')
    res.statusCode=204;res.end();return
   }
   if(req.method!=='GET'||url.search)throw Error('not_found')
   if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(host);return}
   if(url.pathname==='/_totop/host.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(await readFile(new URL('totop-host.esm.js',assets)));return}
   if(!url.pathname.startsWith('/game/'))throw Error('not_found');const name=decodeURIComponent(url.pathname.slice(6));if(!name||name.split('/').some(part=>part==='..'||part.startsWith('.'))||name.includes('\\'))throw Error('not_found')
   const file=await permittedPath(resolve(root,name),[root]),compression=extname(file)
   const original=compression==='.br'||compression==='.gz'?file.slice(0,-compression.length):file
   if(compression==='.br'||compression==='.gz')res.setHeader('Content-Encoding',compression==='.br'?'br':'gzip')
   res.setHeader('Content-Type',types[extname(original)]??'application/octet-stream');res.end(await readStable(file,200*1024*1024,undefined,true))
  }catch{res.statusCode=404;res.end('Not found')}
 })
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})
 return{server,url:`http://127.0.0.1:${server.address().port}/`,diagnostics:()=>structuredClone(diagnostics),close:()=>new Promise(resolve=>server.close(resolve))}
}
