import {createRequire} from 'node:module'
import { fileURLToPath } from 'node:url'
import { isAbsolute } from 'node:path'
export const name='totop-ai'
export const inject=['tools']
export async function apply(ctx,config={}) {
  // Use the launching Harness's shared services. A second installed copy of
  // dsh-tools has different private scheduler symbols even at the same version.
  const runtimeRequire=createRequire(process.argv[1])
  const module=runtimeRequire.resolve('@deepseek-ai/dsh-mcp-client')
  if(runtimeRequire('@deepseek-ai/dsh-mcp-client/package.json').version!=='0.2.0-rc.2')throw Error('ToTop requires the Harness-provided MCP client 0.2.0-rc.2')
  const mcpClient=await import(module)
  if(typeof config.gameDirectory!=='string'||!isAbsolute(config.gameDirectory))throw Error('ToTop requires an explicit absolute gameDirectory; no local directory is granted by default')
  const profile=config.profile??'deepseek'
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(profile))throw Error('Invalid ToTop profile')
  if(config.cloud!==undefined&&typeof config.cloud!=='boolean')throw Error('Invalid ToTop cloud setting')
  await mcpClient.apply(ctx,{serverName:'totop-developer',transport:'stdio',command:process.execPath,
    args:[fileURLToPath(new URL('./totop-agent.mjs',import.meta.url)),config.cloud===true?'serve':'serve-local','--profile',profile,'--allow-root',config.gameDirectory],
    env:{},cwd:config.gameDirectory,toolCallTimeoutMs:120000,failOnStartupError:true,maxInstructionBytes:32768})
}
