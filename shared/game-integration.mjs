import {readFile,readdir,mkdir,writeFile,copyFile,rename,rm,lstat} from 'node:fs/promises'
import {resolve,relative,dirname,isAbsolute} from 'node:path'
import {randomUUID} from 'node:crypto'
import {permittedPath,readStable,unlinkedPath} from './artifacts.mjs'
import {inspectGameProject} from './game-dev.mjs'

const assets=new URL('./game-assets/',import.meta.url)
export const sdkPages=['overview','agent','checklist','unity','godot','capabilities','integration','preview']
export const sdkCapabilities=['lifecycle','device','player','cloudSave','config','analytics','interstitial','rewarded','banner','payments','leaderboards','achievements','tasks','dailyRewards','social','notifications','crossPromo','clipboard']
export async function getLocalGameSdkDocs({page='overview',engine='html5'}={}) {
 if(!sdkPages.includes(page)||!['html5','unity','godot'].includes(engine))throw Error('invalid_sdk_docs_arguments')
 return {family:'game',version:'1.0.0',engine,page,pages:sdkPages,content:await readFile(new URL(`docs/${page==='overview'?'README':page}.md`,assets),'utf8'),credentialsRequired:false}
}

export async function planGameSdkIntegration({path,roots,capabilities=['cloudSave','config','analytics']}) {
 if(!Array.isArray(capabilities)||capabilities.length>sdkCapabilities.length||capabilities.some(value=>!sdkCapabilities.includes(value)))throw Error('invalid_sdk_capabilities')
 const project=await inspectGameProject({path,roots}),files=[]
 async function walk(directory,depth=0) {
  if(depth>6||files.length>=200)return
  for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
   if(files.length>=200)break
   if(entry.isSymbolicLink())continue
   if(entry.name.startsWith('.')||['node_modules','Library','Temp','obj','build','dist','vendor'].includes(entry.name))continue
   const file=resolve(directory,entry.name)
   if(entry.isDirectory())await walk(file,depth+1)
   else if(/\.(?:html|js|ts|tsx|cs|gd|godot|json)$/.test(entry.name)&&!/(?:lock|credentials?|secrets?|token)/i.test(entry.name))files.push(relative(project.root,file))
  }
 }
 await walk(project.root)
 const entries=files.filter(file=>/(?:^|\/)(?:index\.html|main\.(?:js|ts|gd)|game\.(?:js|ts)|project\.godot|.*Game.*\.cs)$/.test(file))
 const hooks=[]
 for(const file of files.filter(file=>/\.(?:js|ts|tsx|cs|gd)$/.test(file)).slice(0,60)) {
  try{const source=(await readStable(resolve(project.root,file),65536)).toString();const found=[]
   for(const [name,pattern] of [['sdk',/ToTopGame|ToTop\.(?:Initialize|Ready)/],['play',/gameplayStart|startGame|start_game|func.*start|void.*Start/],['stop',/gameplayStop|gameOver|game_over|endGame/],['save',/localStorage|storage\.(?:save|load)|SaveGame|FileAccess/]])if(pattern.test(source))found.push(name)
   if(found.length)hooks.push({file,candidates:found})
  }catch(error){if(error.message!=='invalid_artifact_size_or_type'&&error.code!=='ENOENT')throw error}
 }
 return {root:project.root,engine:project.engine,sdkVersion:'1.0.0',requestedCapabilities:[...new Set(capabilities)],entryCandidates:entries,hookCandidates:hooks,inventoryTruncated:files.length>=200,
  sdkDirectory:project.engine==='unity'?'Assets/ToTop':project.engine==='godot'?'addons/totop':'totop-sdk',
  steps:['Read get_local_game_sdk_docs: integration, capabilities and the engine page.','Install fixed SDK assets with install_game_sdk; inspect returned paths.','Wire initialization and restore into the real loading flow, ready when interactable, start/stop at actual gameplay boundaries.','Wire pause/audio and playerChanged; preserve existing save keys and implement an explicit data migration.','Use capability state and error handling for requested platform APIs; disabled services cannot pass as live.','Run the project own build/export; copy totop.game.json into the export root.','Start the SDK host preview; play a round and test reload, pause, account switch and relevant capabilities.','Bind a real owned game UUID, rebuild, then use existing authorized submission workflow.'],
  buildStatus:'not_run',gameplayStatus:'not_run',integrationStatus:'requires_game_hooks'}
}

// Installs only a NEW SDK folder. The Agent must wire actual game states itself.
export async function installGameSdk({path,roots,sdkDirectory}) {
 const project=await inspectGameProject({path,roots})
 const name=sdkDirectory??(project.engine==='unity'?'Assets/ToTop':project.engine==='godot'?'addons/totop':'totop-sdk')
 if(typeof name!=='string'||isAbsolute(name)||name.split(/[\\/]/).some(part=>!part||part==='..'||part==='.')||name.includes('\\'))throw Error('invalid_sdk_directory')
 const destination=resolve(project.root,name)
 let parent=project.root
 for(const part of name.split('/').slice(0,-1)){
  parent=resolve(parent,part)
  try{await lstat(parent)}catch(error){if(error.code!=='ENOENT')throw error;await mkdir(parent,{recursive:false})}
  await permittedPath(parent,roots)
 }
 try{await unlinkedPath(destination);throw Error('sdk_directory_exists_inspect_before_update')}catch(error){if(error.code!=='ENOENT')throw error}
 const staging=resolve(dirname(destination),`.totop-sdk-install-${randomUUID()}`),files=[]
 await mkdir(staging)
 async function copy(source,output,prefix='') {
  await mkdir(output,{recursive:true})
  for(const entry of await readdir(source,{withFileTypes:true})) {
   if(entry.isSymbolicLink())throw Error('linked_template_forbidden')
   const input=new URL(entry.name+(entry.isDirectory()?'/':''),source),target=resolve(output,entry.name)
   if(entry.isDirectory())await copy(input,target,prefix+entry.name+'/')
   else{await copyFile(input,target);files.push(prefix+entry.name)}
  }
 }
 try{
  if(project.engine==='unity'){
   await copy(new URL('engines/unity/Assets/ToTop/',assets),staging)
   await copy(new URL('engines/unity/Assets/WebGLTemplates/',assets),resolve(staging,'Templates'),'Templates/')
  }
  else if(project.engine==='godot'){
   await copy(new URL('engines/godot/addons/totop/',assets),staging)
   for(const file of ['totop-game.global.js','engine-bridge.js']){await copyFile(new URL(`engines/godot/${file}`,assets),resolve(staging,file));files.push(file)}
  }else {
   for(const file of ['totop-game.global.js','totop-game.esm.js','index.d.ts','protocol.d.ts','transport.d.ts']){await copyFile(new URL(file,assets),resolve(staging,file));files.push(file)}
   await writeFile(resolve(staging,'totop-game.esm.d.ts'),"export * from './index.js'\n",{flag:'wx'});files.push('totop-game.esm.d.ts')
  }
  await writeFile(resolve(staging,'INTEGRATION.md'),(await getLocalGameSdkDocs({page:'integration',engine:project.engine})).content,{flag:'wx'});files.push('INTEGRATION.md')
  // Recheck immediately before installing; never replace an existing SDK folder.
  await mkdir(destination,{recursive:false})
  for(const entry of await readdir(staging))await rename(resolve(staging,entry),resolve(destination,entry))
 }finally{await rm(staging,{recursive:true,force:true})}
 const manifestPath=resolve(project.root,'totop.game.json')
 try{await unlinkedPath(manifestPath)}catch(error){if(error.code!=='ENOENT')throw error}
 let manifestStatus='preserved'
 try{await writeFile(manifestPath,JSON.stringify({schemaVersion:1,sdkVersion:'1.0.0',engine:project.engine,orientation:'any',locales:['en'],saveSchemaVersion:1,capabilities:['cloudSave','config','analytics']},null,2)+'\n',{flag:'wx'});manifestStatus='created'}catch(error){if(error.code!=='EEXIST')throw error}
 return {status:'assets_installed',engine:project.engine,sdkVersion:'1.0.0',directory:destination,files,manifest:manifestPath,manifestStatus,integrationStatus:'requires_game_hooks',gameplayStatus:'not_run',next:'Use the integration plan to wire actual game hooks; installing files is not acceptance.'}
}
