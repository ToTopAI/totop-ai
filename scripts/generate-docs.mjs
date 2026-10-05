import {readFile,writeFile,access} from 'node:fs/promises'
import {resolve} from 'node:path'
import {clientNames,clientGuides,bridgeConfig} from '../shared/client-guides.mjs'
const root=resolve(import.meta.dirname,'..')
const clients=Object.entries(clientGuides).map(([id,g])=>`### ${clientNames[id]}\n\n${g.connect}\n\n${g.native?`Native plugin:\n\n\`\`\`text\n${g.install}\n\`\`\`\n\n`:''}${g.configure?`Explicit local setup:\n\n\`\`\`text\n${g.configure}\n\`\`\`\n\n`:''}Manual MCP:\n\n\`\`\`text\n${g.manual}\n\`\`\`\n\nLocal upload: ${g.upload}`).join('\n\n')
const content=(await readFile(resolve(root,'shared/guide.md'),'utf8')).replace('@@CLIENTS@@',clients).replace('@@BRIDGE@@','```json\n'+bridgeConfig+'\n```')
await writeFile(resolve(root,'README.md'),content)
const target=resolve(root,'../totop-ai-website/public/mcp.md')
if(await access(resolve(root,'../totop-ai-website/public')).then(()=>true,()=>false))await writeFile(target,content)
