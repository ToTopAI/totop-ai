// Bundled by the desktop build from the same audited OAuth/artifact implementation.
export { BridgeAuth } from './oauth.mjs'
export { connectRemote } from './bridge.mjs'
export { prepareArtifact, uploadArtifact, validateReceipt, permittedPath, readStable } from './artifacts.mjs'
export { downloadGameSource } from './source.mjs'

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'

export async function serveDesktop(endpoint, key) {
  const url = new URL(endpoint)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !key) throw Error('invalid_desktop_endpoint')
  const call = async body => {
    const response = await fetch(url, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(360000) })
    if (!response.ok) throw Error('desktop_connection_unavailable')
    return response.json()
  }
  const server = new Server({ name: 'totop-desktop', version: '1.0.0' }, { capabilities: { tools: {} }, instructions:
    'Use desktop_connection_status first. All local paths are restricted to the project selected in ToTop desktop. Preparation and upload are not publication consent. submit_game is guarded by a frozen, account-bound desktop authorization; valid explicit authorization is not requested twice. Use the platform schemas returned by connection status. On uncertain writes, query before retrying with the same idempotency key. Published means get_launch_steps confirms the exact release is public.' })
  server.setRequestHandler(ListToolsRequestSchema, () => call({ operation: 'list' }))
  server.setRequestHandler(CallToolRequestSchema, request => call({ operation: 'call', ...request.params }))
  await server.connect(new StdioServerTransport())
  return server
}
if (process.argv[2] === 'serve-desktop') {
  serveDesktop(process.argv[3], process.argv[4]).catch(() => { process.stderr.write('desktop_connection_failed\n'); process.exitCode = 1 })
}
