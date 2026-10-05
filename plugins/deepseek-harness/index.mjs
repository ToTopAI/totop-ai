import * as mcpClient from '@deepseek-ai/dsh-mcp-client'
import { fileURLToPath } from 'node:url'
import { isAbsolute } from 'node:path'
export const name='totop-ai'
export const inject=['tools']
export async function apply(ctx,config={}) {
  if(typeof config.gameDirectory!=='string'||!isAbsolute(config.gameDirectory))throw Error('ToTop requires an explicit absolute gameDirectory; no local directory is granted by default')
  const profile=config.profile??'deepseek'
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(profile))throw Error('Invalid ToTop profile')
  await mcpClient.apply(ctx,{serverName:'totop-developer',transport:'stdio',command:process.execPath,
    args:[fileURLToPath(new URL('./totop-agent.mjs',import.meta.url)),'serve','--profile',profile,'--allow-root',config.gameDirectory],
    env:{},cwd:config.gameDirectory,toolCallTimeoutMs:120000,failOnStartupError:true,maxInstructionBytes:32768})
}
