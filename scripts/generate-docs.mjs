import {readFile,writeFile,access} from 'node:fs/promises'
import {resolve} from 'node:path'
import {clientNames,clientGuides,bridgeConfig} from '../shared/client-guides.mjs'
const root=resolve(import.meta.dirname,'..')
const cursorGit='Git marketplace installation is the primary path, including personal accounts (confirmed in Cursor 3.20.21). In Cursor, open Customize → Add Marketplace → Import from GitHub, paste https://github.com/ToTopAI/totop-ai, choose Personal / user scope, then install totop-ai. The repository .cursor-plugin/marketplace.json selects the self-contained Cursor adapter. Use marketplace refresh controls for updates. Team administration in Dashboard → Plugins & MCPs is a separate option, not a requirement for personal installation. If your Cursor version lacks Git import, use the local ZIP fallback: extract the Cursor package into ~/.cursor/plugins/local/totop-ai and reload after reviewing any existing folder. Do not copy a Codex cache or overwrite existing configuration. Local installs do not track Git updates automatically. Keep one ToTop MCP connection; one-click MCP config is not a full plugin.\n\n'
const clients=Object.entries(clientGuides).sort(([a],[b])=>Number(b==='other')-Number(a==='other')).map(([id,g])=>`### ${clientNames[id]}\n\n${g.connect}\n\n${id==='cursor'?cursorGit:''}${g.native?`Native plugin:\n\n\`\`\`text\n${g.install}\n\`\`\`\n\n`:''}${g.configure?`Explicit local setup:\n\n\`\`\`text\n${g.configure}\n\`\`\`\n\n`:''}Manual MCP:\n\n\`\`\`text\n${g.manual}\n\`\`\`\n\nLocal upload: ${g.upload}`).join('\n\n')
const content=(await readFile(resolve(root,'shared/guide.md'),'utf8')).replace('@@CLIENTS@@',clients).replace('@@BRIDGE@@','```json\n'+bridgeConfig+'\n```')
await writeFile(resolve(root,'README.md'),content)
const target=resolve(root,'../totop-ai-website/public/mcp.md')
if(await access(resolve(root,'../totop-ai-website/public')).then(()=>true,()=>false))await writeFile(target,content)
