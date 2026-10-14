import { build } from 'esbuild'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
const root=resolve(import.meta.dirname,'..'), pkg=JSON.parse(await readFile(resolve(root,'package.json')))
const desktop=JSON.parse(await readFile(resolve(root,'adapters/desktop/package.json')))
await mkdir(resolve(root,'dist'),{recursive:true})
const result=await build({entryPoints:[resolve(root,'shared/desktop.mjs')],bundle:true,write:false,platform:'node',format:'esm',target:'node22',minify:true,external:['@napi-rs/keyring'],banner:{js:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);"}})
const client=await build({entryPoints:[resolve(root,'adapters/desktop/client.js')],bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',loader:{'.png':'dataurl'}})
const agent=result.outputFiles[0].text
const files={'agent.mjs':agent,'plugin.mjs':await readFile(resolve(root,'adapters/desktop/plugin.mjs'),'utf8'),'client.js':client.outputFiles[0].text}
const assets={}
async function collect(directory,prefix='game-assets/'){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(entry.isSymbolicLink())throw Error('linked_desktop_asset')
  if(entry.isDirectory())await collect(resolve(directory,entry.name),prefix+entry.name+'/')
  else{const data=await readFile(resolve(directory,entry.name),'utf8');files[prefix+entry.name]=data;assets[prefix+entry.name]=createHash('sha256').update(data).digest('hex')}
 }
}
await collect(resolve(root,'shared/game-assets'))
files['manifest.json']=JSON.stringify({schema:1,pluginVersion:desktop.version,helperVersion:'0.3.2',sdkVersion:pkg.dependencies['@modelcontextprotocol/sdk'],sha256:createHash('sha256').update(agent).digest('hex'),assets},null,2)+'\n'
files['package.json']=JSON.stringify({name:'totop-ai-desktop',version:desktop.version,type:'module',main:'./plugin.mjs',exports:{'.':'./plugin.mjs','./client':'./client.js','./package.json':'./package.json'},dsh:{client:{platform:'web',inject:['@deepseek-ai/dsh-client-ui-plugin-manager'],external:['react']}}},null,2)+'\n'
const name=`totop-ai-desktop-${desktop.version}.json`
await writeFile(resolve(root,'dist',name),JSON.stringify({schema:1,protocol:2,version:desktop.version,files})+'\n')
console.log(name)
