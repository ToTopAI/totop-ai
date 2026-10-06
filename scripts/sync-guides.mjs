import { agentClients,clientNames,clientGuides,bridgeConfig,agentCopy } from '../shared/client-guides.mjs'
import { surfaceCopy } from '../shared/surface-copy.mjs'
import { consentCopy } from '../shared/consent-copy.mjs'
import { agentFirstCopy } from '../shared/agent-first-copy.mjs'
import { cursorInstallCopy } from '../shared/cursor-install-copy.mjs'
import { mkdir,writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root=resolve(import.meta.dirname,'../..'),data={agentClients,clientNames,clientGuides,bridgeConfig,agentCopy,surfaceCopy,agentFirstCopy,cursorInstallCopy}
for(const project of ['totop-ai-website','totop-creator-center']){
  const dir=resolve(root,project,'src/agents');await mkdir(dir,{recursive:true})
  await writeFile(resolve(dir,'guides.ts'),'// Generated from ToTopAI/totop-ai shared/client-guides.mjs. Do not edit copies.\n'+Object.entries(data).map(([key,value])=>`export const ${key} = ${JSON.stringify(value,null,2)} as const\n`).join('\n'))
}
await writeFile(resolve(root,'totop-platform/src/oidc/agent-consent-copy.ts'),'// Generated from ToTopAI/totop-ai shared/consent-copy.mjs.\nexport const consentCopy = '+JSON.stringify(consentCopy,null,2)+' as const\n')
