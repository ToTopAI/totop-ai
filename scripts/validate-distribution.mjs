import assert from 'node:assert/strict'
import { readFile, lstat, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
const root=resolve(import.meta.dirname,'..'),manifest=JSON.parse(await readFile(resolve(root,'distribution.json')))
assert.equal(manifest.version,'0.3.1');assert.equal(manifest.helperVersion,'0.1.1')
const expected=new Set(['.agents/plugins/marketplace.json','.claude-plugin/marketplace.json','.cursor-plugin/marketplace.json',
 ...['totop-ai','claude-code','cursor'].flatMap(dir=>[`plugins/${dir}/${dir==='totop-ai'?'.codex':dir==='claude-code'?'.claude':'.cursor'}-plugin/plugin.json`,`plugins/${dir}/${dir==='cursor'?'mcp.json':'.mcp.json'}`,`plugins/${dir}/README.md`,`plugins/${dir}/skills/submit-game/SKILL.md`,`plugins/${dir}/skills/submit-game/scripts/totop-agent.mjs`]),
 ...['package_game.py','upload_game.py'].map(name=>'plugins/totop-ai/skills/submit-game/scripts/'+name),
 ...['package.json','index.mjs','totop-agent.mjs','cordis.patch.yml','WORKFLOW.md','README.md'].map(name=>'plugins/deepseek-harness/'+name)])
assert.deepEqual(new Set(Object.keys(manifest.files)),expected,'Unexpected distribution inputs')
async function walk(directory){const paths=[];for(const entry of await readdir(resolve(root,directory),{withFileTypes:true})){assert.equal(entry.isSymbolicLink(),false);const path=directory+'/'+entry.name;paths.push(...entry.isDirectory()?await walk(path):[path])}return paths}
const actual=(await Promise.all(['plugins','.agents','.claude-plugin','.cursor-plugin'].map(walk))).flat()
assert.deepEqual(new Set(actual),expected,'Unexpected plugin files/hooks')
for(const [name,hash]of Object.entries(manifest.files)){
  assert.ok(!name.includes('..')&&!name.startsWith('/'))
  let part=root;for(const component of name.split('/')){part=resolve(part,component);assert.equal((await lstat(part)).isSymbolicLink(),false)}
  const data=await readFile(part);assert.equal(createHash('sha256').update(data).digest('hex'),hash,name)
  assert.equal(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:AKIA|ASIA)[A-Z0-9]{16}|\bsk-[A-Za-z0-9_-]{32,}/.test(data.toString()),false,'Possible credential')
}
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'))
assert.deepEqual(await read('plugins/totop-ai/.mcp.json'),{mcpServers:{'totop-developer':{type:'http',url:'https://api.totop.ai/mcp',oauth:{clientId:'codex:totop',callbackUrl:'http://127.0.0.1/callback'}}}})
assert.deepEqual((await read('plugins/totop-ai/.codex-plugin/plugin.json')).interface.defaultPrompt,['将当前游戏提交到 ToTop，审核通过后自动上架。'])
for(const [dir,type]of [['claude-code','claude'],['cursor','cursor']]){assert.equal((await read(`plugins/${dir}/.${type}-plugin/plugin.json`)).version,manifest.version);assert.ok(manifest.files[`plugins/${dir}/skills/submit-game/scripts/totop-agent.mjs`])}
assert.ok((await read('plugins/deepseek-harness/package.json')).dsh.bundle.patch)
console.log('Validated identities, self-contained helpers, schemas and distribution hashes')
