import { build } from 'esbuild'
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { zipSync } from 'fflate'
const root=resolve(import.meta.dirname,'..'),version='0.4.3',helperVersion='0.2.2'
const json=async(path,value)=>{await mkdir(dirname(resolve(root,path)),{recursive:true});await writeFile(resolve(root,path),JSON.stringify(value,null,2)+'\n')}
const source=await readFile(resolve(root,'shared/submit-game.md'),'utf8'),description='Submit local HTML5 and WebGL games to ToTop using MCP and browser OAuth.'
await mkdir(resolve(root,'dist'),{recursive:true})
await build({entryPoints:[resolve(root,'shared/bin.mjs')],outfile:resolve(root,'dist/totop-agent.mjs'),bundle:true,platform:'node',target:'node22',format:'esm',external:['@napi-rs/keyring'],banner:{js:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);"}})
for(const [directory,variable] of [['plugins/totop-ai','/ABSOLUTE_LOADED_SKILL_DIRECTORY/../..'],['plugins/claude-code','${CLAUDE_PLUGIN_ROOT}'],['plugins/cursor','${CURSOR_PLUGIN_ROOT}']]) {
  const scripts=resolve(root,directory,'skills/submit-game/scripts');await mkdir(scripts,{recursive:true})
  await copyFile(resolve(root,'dist/totop-agent.mjs'),resolve(scripts,'totop-agent.mjs'))
  await writeFile(resolve(root,directory,'skills/submit-game/SKILL.md'),source.replaceAll('@@HELPER@@',variable+'/skills/submit-game/scripts/totop-agent.mjs'))
  await writeFile(resolve(root,directory,'README.md'),`# totop-ai ${version}\n\n${description}\n\nSee https://totop.ai/mcp.md for installation, duplicate-config detection, authentication and submission instructions. Requires Node 22+, not Python. No hooks or auto-approval settings are installed. This package includes its own helper and shared workflow.\n\nOptional OS keyring support (@napi-rs/keyring 2.1.0) can be installed with ignored lifecycle scripts. When unavailable the bridge uses owner-only Unix files or Windows ACL-restricted files. Credentials are never stored in this plugin directory.\n`)
}
const codex=JSON.parse(await readFile(resolve(root,'plugins/totop-ai/.codex-plugin/plugin.json'),'utf8'));codex.version=version
await json('plugins/totop-ai/.codex-plugin/plugin.json',codex)
const native={name:'totop-ai',version,description,author:{name:'ToTop'},homepage:'https://totop.ai/mcp/',repository:'https://github.com/ToTopAI/totop-ai',skills:'./skills/',mcpServers:'./.mcp.json'}
await json('plugins/claude-code/.claude-plugin/plugin.json',native)
await json('plugins/claude-code/.mcp.json',{mcpServers:{'totop-developer':{type:'http',url:'https://api.totop.ai/mcp'}}})
await json('.claude-plugin/marketplace.json',{name:'totop-ai',owner:{name:'ToTop'},plugins:[{name:'totop-ai',source:'./plugins/claude-code',version,description}]})
await json('plugins/cursor/.cursor-plugin/plugin.json',{...native,mcpServers:'./mcp.json'})
await json('plugins/cursor/mcp.json',{mcpServers:{'totop-developer':{url:'https://api.totop.ai/mcp'}}})
await json('.cursor-plugin/marketplace.json',{name:'totop-ai',owner:{name:'ToTop'},plugins:[{name:'totop-ai',source:'plugins/cursor',version,description}]})
const deepseek=resolve(root,'plugins/deepseek-harness');await mkdir(deepseek,{recursive:true})
await copyFile(resolve(root,'dist/totop-agent.mjs'),resolve(deepseek,'totop-agent.mjs'))
await copyFile(resolve(root,'adapters/deepseek/index.mjs'),resolve(deepseek,'index.mjs'))
await writeFile(resolve(deepseek,'WORKFLOW.md'),source.replaceAll('@@HELPER@@','/absolute/installed/bundle/totop-agent.mjs'))
await json('plugins/deepseek-harness/package.json',{name:'totop-ai',version,type:'module',main:'./index.mjs',exports:{'.':'./index.mjs'},engines:{node:'>=22'},dsh:{bundle:{patch:'./cordis.patch.yml'}},dependencies:{'@deepseek-ai/dsh-mcp-client':'0.0.1-rc.1'},files:['index.mjs','totop-agent.mjs','cordis.patch.yml','WORKFLOW.md','README.md']})
await writeFile(resolve(deepseek,'cordis.patch.yml'),'- insert:\n    - id: totop-ai\n      name: totop-ai\n      config:\n        profile: deepseek\n        gameDirectory: /REPLACE_WITH_YOUR_ABSOLUTE_GAME_DIRECTORY\n')
await writeFile(resolve(deepseek,'README.md'),`# ToTop DeepSeek Harness Bundle ${version}\n\nPin the official MCP client to 0.0.1-rc.1. This is a prebuilt Cordis Bundle; no build/install hooks run. Replace the deliberate invalid gameDirectory in the inserted YAML with a specific approved game directory. No existing profile or auto-approval policy is replaced. Run the contained helper's login with --profile deepseek before activation. See WORKFLOW.md and https://totop.ai/mcp.md. Actual client acceptance is tracked separately from packaging tests.\n`)
await writeFile(resolve(root,'dist/README.md'),`# ToTop Agent helper ${helperVersion}\n\nNode 22+. Run node totop-agent.mjs --version. prepare/upload do not take over client OAuth. Bridge login/status/logout/serve are opt-in; serve requires --allow-root for specifically approved game directories. SDK/ZIP dependencies are bundled. Optional OS keyring: @napi-rs/keyring 2.1.0; unavailable keyrings use restricted files. Receipts go through private stdin. See https://totop.ai/mcp.md.\n`)
const files={}
async function collect(dir,prefix=''){for(const entry of (await readdir(resolve(root,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(entry.isSymbolicLink())throw Error('Linked distribution input');const name=prefix+entry.name;if(entry.isDirectory())await collect(dir+'/'+entry.name,name+'/');else files[name]=await readFile(resolve(root,dir,entry.name))}}
for(const [name,dir]of [['codex','plugins/totop-ai'],['claude-code','plugins/claude-code'],['cursor','plugins/cursor']]){for(const k of Object.keys(files))delete files[k];await collect(dir);await writeFile(resolve(root,`dist/totop-ai-${name}-${version}.zip`),zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,[v,{mtime:new Date('2020-01-01')}]]))))}
await writeFile(resolve(root,`dist/totop-agent-${helperVersion}.zip`),zipSync({'totop-agent.mjs':[await readFile(resolve(root,'dist/totop-agent.mjs')),{mtime:new Date('2020-01-01')}],'README.md':[await readFile(resolve(root,'dist/README.md')),{mtime:new Date('2020-01-01')}]}))
// Invoke npm's JS entry point, not the Unix-only `npm` executable. Windows
// supplies npm.cmd, which execFile cannot execute directly without a shell.
if(!process.env.npm_execpath)throw Error('Build through npm run build')
execFileSync(process.execPath,[process.env.npm_execpath,'pack','--ignore-scripts','--pack-destination',resolve(root,'dist')],{cwd:deepseek,stdio:'pipe',env:{...process.env,npm_config_cache:resolve(root,'node_modules/.cache/npm')}})
const hashes={}
for(const dir of ['plugins','.agents','.claude-plugin','.cursor-plugin']){for(const k of Object.keys(files))delete files[k];await collect(dir);for(const [k,v]of Object.entries(files))hashes[dir+'/'+k]=createHash('sha256').update(v).digest('hex')}
await json('distribution.json',{name:'totop-ai',version,helperVersion,files:hashes})
// A reused local dist directory may contain earlier immutable releases.
// Include only this release's artifacts in its checksum and file manifests.
const archives=[`totop-ai-codex-${version}.zip`,`totop-ai-claude-code-${version}.zip`,`totop-ai-cursor-${version}.zip`,`totop-ai-${version}.tgz`,`totop-agent-${helperVersion}.zip`].sort()
await writeFile(resolve(root,'dist/SHA256SUMS'),(await Promise.all(archives.map(async name=>createHash('sha256').update(await readFile(resolve(root,'dist',name))).digest('hex')+'  '+name))).join('\n')+'\n')
await json('dist/FILE-MANIFEST.json',{version,helperVersion,files:hashes,archives})
console.log(`Built ${version} plugins and ${helperVersion} helper with fixed-version archives`)
