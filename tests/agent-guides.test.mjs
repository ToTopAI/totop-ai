import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {agentClients,clientGuides,agentCopy} from '../shared/client-guides.mjs'
import {agentFirstCopy} from '../shared/agent-first-copy.mjs'
import {surfaceCopy} from '../shared/surface-copy.mjs'
import {cursorInstallCopy} from '../shared/cursor-install-copy.mjs'

test('Cursor personal Git marketplace is the default in all 14 locales',()=>{
 assert.equal(Object.keys(cursorInstallCopy).length,14)
 assert.equal(clientGuides.cursor.install,cursorInstallCopy.en.install)
 for(const copy of Object.values(cursorInstallCopy)){
  assert.ok(copy.install.includes('https://github.com/ToTopAI/totop-ai'))
  assert.ok(copy.install.includes('Import from GitHub'))
  assert.ok(copy.install.includes('Personal'))
  assert.ok(!copy.install.includes('~/.cursor/plugins/local'))
  assert.ok(copy.fallback.includes('~/.cursor/plugins/local/totop-ai'))
  for(const value of Object.values(copy))assert.ok(value.trim())
 }
 assert.ok(clientGuides.cursor.download.includes('v0.4.0'))
})

test('Agent-first copy covers all 14 locales and five runtime entries',()=>{
 assert.deepEqual(agentClients,['claude-code','codex','cursor','deepseek','other'])
 assert.deepEqual(Object.keys(clientGuides),agentClients)
 assert.equal(Object.keys(agentFirstCopy).length,14)
 for(const [locale,copy] of Object.entries(agentFirstCopy)){
  for(const value of Object.values(copy))assert.ok(value.trim())
  assert.equal(agentCopy[locale].title,copy.title)
  assert.equal(agentCopy[locale].promptLead,copy.promptLead)
  assert.equal(surfaceCopy[locale].humans,copy.humans)
  assert.equal(surfaceCopy[locale].agents,copy.agents)
  assert.ok(!('desktop' in surfaceCopy[locale]))
  for(const tool of ['get_account','get_submission_requirements'])assert.ok(copy.inspect.includes(tool))
  for(const tool of ['start_upload','complete_upload'])assert.ok(copy.upload.includes(tool))
  assert.ok(copy.confirm.includes('submit_game'))
  for(const tool of ['get_submission','get_review_report','get_launch_steps'])assert.ok(copy.track.includes(tool))
 }
})

test('public and repository docs share an Agent-first workflow without a Desktop-specific section',async()=>{
 const read=relative=>readFile(new URL(relative,import.meta.url),'utf8')
 const docs=await read('../README.md')
 // Companion repositories exist in the local workspace, not in plugin-only CI.
 const optional=async path=>read(path).catch(error=>{if(error.code==='ENOENT')return null;throw error})
 const publicDocs=await optional('../../totop-ai-website/public/mcp.md')
 if(publicDocs!==null)assert.equal(docs,publicDocs)
 assert.ok(docs.includes('## Start here'))
 assert.ok(docs.indexOf('## Start here')<docs.indexOf('## Agent runtime configuration'))
 assert.ok(docs.indexOf('### MCP')<docs.indexOf('### Claude Code'))
 assert.ok(!docs.includes('Claude Desktop'))
 assert.ok(docs.includes('Add Marketplace'))
 const website=await optional('../../totop-ai-website/src/agents/guides.ts')
 const center=await optional('../../totop-creator-center/src/agents/guides.ts')
 if(website!==null&&center!==null)assert.equal(website,center)
 if(website!==null)assert.ok(!website.includes('claude-desktop'))
})
