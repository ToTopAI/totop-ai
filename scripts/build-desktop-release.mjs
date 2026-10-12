import { build } from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
const root=resolve(import.meta.dirname,'..'), pkg=JSON.parse(await readFile(resolve(root,'package.json')))
const desktop=JSON.parse(await readFile(resolve(root,'adapters/desktop/package.json')))
await mkdir(resolve(root,'dist'),{recursive:true})
const result=await build({entryPoints:[resolve(root,'shared/desktop.mjs')],bundle:true,write:false,platform:'node',format:'esm',target:'node22',minify:true,external:['@napi-rs/keyring'],banner:{js:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);"}})
const client=await build({entryPoints:[resolve(root,'adapters/desktop/client.js')],bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',loader:{'.png':'dataurl'}})
const agent=result.outputFiles[0].text
const files={'agent.mjs':agent,'plugin.mjs':await readFile(resolve(root,'adapters/desktop/plugin.mjs'),'utf8'),'client.js':client.outputFiles[0].text}
files['manifest.json']=JSON.stringify({schema:1,pluginVersion:desktop.version,helperVersion:'0.2.2',sdkVersion:pkg.dependencies['@modelcontextprotocol/sdk'],sha256:createHash('sha256').update(agent).digest('hex')},null,2)+'\n'
files['package.json']=JSON.stringify({name:'totop-ai-desktop',version:desktop.version,type:'module',main:'./plugin.mjs',exports:{'.':'./plugin.mjs','./client':'./client.js','./package.json':'./package.json'},dsh:{client:{platform:'web',inject:['@deepseek-ai/dsh-client-ui-plugin-manager'],external:['react']}}},null,2)+'\n'
const name=`totop-ai-desktop-${desktop.version}.json`
await writeFile(resolve(root,'dist',name),JSON.stringify({schema:1,protocol:1,version:desktop.version,files})+'\n')
console.log(name)
