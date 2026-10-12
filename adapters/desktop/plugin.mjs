import { pathToFileURL } from 'node:url'
import { isAbsolute } from 'node:path'
export const name = 'totop-ai'
export const inject = ['tools']
export async function apply(ctx, config = {}) {
  if (!isAbsolute(config.mcpClientEntry || '')) throw Error('totop_builtin_runtime_missing')
  const client = await import(pathToFileURL(config.mcpClientEntry).href)
  const { mcpClientEntry, ...options } = config
  await client.apply(ctx, options)
}
