import { open, realpath } from 'node:fs/promises'
import { resolve, relative, isAbsolute, basename } from 'node:path'
import { setImmediate as yieldToHost } from 'node:timers/promises'
import { draftEvidence, inspectBuildEntry, preparationOverview } from './readiness-server.mjs'
import { COVER_ROUTE, localCover, registerLocalCover } from './cover-server.mjs'

export const GAME_ROUTE = '/totop-plugin/current-game'
const text = (value, limit = 200) => typeof value === 'string' ? value.slice(0, limit) : null
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value) ? value : null
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null
const ERROR_CODES = new Set(['developer_submission_conflict', 'developer_version_conflict', 'developer_upload_version_conflict', 'developer_upload_incomplete', 'developer_package_invalid', 'developer_creator_profile_required', 'developer_unavailable', 'network_timeout', 'publication_authorization_required', 'publication_account_mismatch', 'creator_context_changed', 'insufficient_scope', 'platform_request_failed', 'platform_tool_failed', 'developer_game_quota_exceeded', 'developer_submission_quota_exceeded', 'developer_pending_quota_exceeded', 'developer_upload_quota_exceeded', 'developer_storage_quota_exceeded'])
const safeErrorCode = value => ERROR_CODES.has(value) ? value : null
const within = (root, file) => { const r = relative(root, file); return !isAbsolute(r) && r !== '..' && !r.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) }

// Fixed metadata files only. Never execute a build or follow a link outside the Session.
async function jsonFile(root, name) {
  let handle
  try {
    const file = await realpath(resolve(root, name))
    if (!within(root, file)) throw Error('project_metadata_outside_root')
    handle = await open(file, 'r')
    const before = await handle.stat()
    if (!before.isFile() || before.size > 32768) throw Error('project_metadata_invalid')
    const bytes = Buffer.alloc(32769), { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
    if (bytesRead > 32768) throw Error('project_metadata_invalid')
    const value = JSON.parse(bytes.subarray(0, bytesRead).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('project_metadata_invalid')
    return value
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw Error('project_metadata_invalid')
  } finally { await handle?.close() }
}

export function resultObject(value) {
  for (let i = 0; i < 4; i++) {
    if (!value || typeof value !== 'object' || value.isError) return null
    if (!Array.isArray(value.content)) return value
    const raw = value.content.find(block => block.type === 'text')?.text
    if (typeof raw !== 'string' || raw.length > 512000) return null
    try { value = JSON.parse(raw) } catch { return null }
  }
  return null
}

// Session evidence is deliberately distinct from live platform state. Ignore assistant prose,
// failed calls, another game's records, and another account's history after an account switch.
export function createUploadTracker({ directory, accountId, gameId, projectId }) {
  const calls = new Map(), uploads = new Map()
  let context = null, draft = null
  const remember = (id, row) => {
    uploads.delete(id); uploads.set(id, row)
    if (uploads.size > 100) uploads.delete(uploads.keys().next().value)
  }
  function consume(event) {
    if (!accountId || !gameId) return
    if (event.type === 'tool/call' && /^mcp__totop-desktop__desktop_(?:connection_status|platform_tool)$/.test(event.data?.name || '')) {
      try {
        if (event.data.arguments.length <= 32768) calls.set(event.data.callId, { name: event.data.name, args: JSON.parse(event.data.arguments) })
        if (calls.size > 256) calls.delete(calls.keys().next().value)
      } catch { /* incomplete call */ }
    }
    if (event.type !== 'tool/result') return
    const message = event.data?.message, call = calls.get(message?.toolCallId)
    calls.delete(message?.toolCallId)
    if (!call || message.isError) return
    const value = resultObject(message)
    if (!value) return
    if (call.name.endsWith('__desktop_connection_status')) {
      context = value.project?.directory === directory && (!projectId || value.project?.id === projectId) && value.account?.accountId === accountId && value.project?.binding?.gameId === gameId ? { project: { id: value.project.id } } : null
      if (!context) draft = null
      if (context) for (const upload of Array.isArray(value.localUploads) ? value.localUploads : []) {
        if (upload.gameId === gameId && uuid(upload.uploadId)) remember(upload.uploadId, { uploadId: upload.uploadId, version: upload.version, purpose: upload.purpose, bytes: upload.bytes, completed: upload.completed === true, time: event.time })
      }
    } else if (context && call.args.name === 'get_game' && call.args.arguments?.gameId === gameId && value.gameId === gameId) {
      draft = draftEvidence(value, event.time)
    } else if (context && call.args.name === 'complete_upload') {
      const id = call.args.arguments?.uploadId, previous = uploads.get(id)
      if (previous && value.status === 'uploaded') remember(id, { ...previous, completed: true, time: event.time })
    } else if (context && call.args.name === 'start_upload' && call.args.arguments?.gameId === gameId && typeof context.project.id === 'string' && value.projectId === context.project.id && value.accountId === accountId && uuid(value.uploadId)) {
      remember(value.uploadId, { uploadId: value.uploadId, version: call.args.arguments.version, purpose: call.args.arguments.purpose, bytes: call.args.arguments.bytes, completed: false, time: event.time })
    }
  }
  const values = () => [...uploads.values()].slice(-10).reverse().map(row => ({
    uploadId: uuid(row.uploadId), version: text(row.version, 80), purpose: ['game', 'cover', 'source'].includes(row.purpose) ? row.purpose : 'game',
    bytes: Number.isSafeInteger(row.bytes) && row.bytes >= 0 ? row.bytes : null, completed: row.completed === true,
    time: typeof row.time === 'number' ? row.time : null,
  }))
  return { consume, values, draft: () => draft }
}

export function uploadEvidence(events, scope) {
  const tracker = createUploadTracker(scope)
  for (const event of events) tracker.consume(event)
  return tracker.values()
}

function desktopReader(config, fetchImpl) {
  const args = config.args || [], index = args.indexOf('serve-desktop')
  if (index < 0 || !args[index + 1] || !args[index + 2]) return null
  const endpoint = new URL(args[index + 1]), key = args[index + 2]
  if (endpoint.protocol !== 'http:' || endpoint.hostname !== '127.0.0.1' || endpoint.pathname !== '/tools' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !/^[a-f0-9]{64}$/.test(key)) return null
  return async signal => {
    const response = await fetchImpl(endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ operation: 'call', name: 'desktop_project', arguments: { action: 'list' } }) })
    if (!response.ok) throw Error('desktop_status_unavailable')
    const value = resultObject(await response.json())
    if (!value || !Array.isArray(value.projects)) throw Error('desktop_status_unavailable')
    return value
  }
}

export function createGameReader(ctx, config, fetchImpl = fetch) {
  const readDesktop = desktopReader(config, fetchImpl)
  const summaries = new Map()
  async function history(sessionId, lease, scope, signal) {
    const key = JSON.stringify(scope), cursor = lease.cursor
    let entry = summaries.get(sessionId)
    // Identity/project changes invalidate the entire Session summary; never share private rows.
    if (!entry || entry.key !== key || !Number.isSafeInteger(cursor) || cursor < entry.cursor) entry = { key, tracker: createUploadTracker(scope), offset: 0, cursor: -2 }
    if (Number.isSafeInteger(cursor) && cursor === entry.cursor) return { uploads: entry.tracker.values(), draft: entry.tracker.draft() }
    try {
      const events = lease.events
      if (entry.offset > events.length) entry = { key, tracker: createUploadTracker(scope), offset: 0, cursor: -2 }
      for (let i = entry.offset; i < events.length; i++) {
        signal.throwIfAborted()
        entry.tracker.consume(events[i])
        if ((i + 1) % 256 === 0) await yieldToHost(undefined, { signal })
      }
      entry.offset = events.length; entry.cursor = cursor
      summaries.delete(sessionId); summaries.set(sessionId, entry)
      if (summaries.size > 16) summaries.delete(summaries.keys().next().value)
      return { uploads: entry.tracker.values(), draft: entry.tracker.draft() }
    } catch (error) { summaries.delete(sessionId); throw error }
  }
  return async (sessionId, signal) => {
    const lease = await ctx.sessionQuery.observeSession(sessionId, { signal, projectionMode: 'none' })
    try {
      const cwd = lease.header.cwd
      if (!cwd || !isAbsolute(cwd)) return { sessionId, state: 'no_project' }
      let root
      try { root = await realpath(cwd) } catch { return { sessionId, state: 'project_unavailable' } }
      let metadataError = false
      const read = name => jsonFile(root, name).catch(() => { metadataError = true; return null })
      const [project, rootManifest, srcManifest, desktop] = await Promise.all([
        read('.totop/project.json'), read('totop.game.json'), read('src/totop.game.json'),
        readDesktop ? readDesktop(signal).catch(() => null) : null,
      ])
      const manifest = srcManifest || rootManifest
      const matched = desktop?.projects.find(item => item.directory === root)
      const connected = desktop?.publication?.status === 'connected'
      const binding = connected ? matched?.binding : null
      const platformGameId = uuid(binding?.gameId), localGameId = uuid(manifest?.gameId)
      const gameId = platformGameId || localGameId
      const bindingConflict = !!(platformGameId && localGameId && platformGameId !== localGameId)
      const recordsState = !desktop ? 'unavailable' : !connected ? 'disconnected' : !platformGameId ? 'unbound' : 'ready'
      if (recordsState !== 'ready' || bindingConflict) summaries.delete(sessionId)
      const tasks = connected && binding ? (desktop.tasks || []).filter(task => task.projectId === matched.id && task.gameId === gameId).slice(-8).reverse() : []
      const [evidence, build, image] = await Promise.all([
        recordsState === 'ready' && !bindingConflict ? history(sessionId, lease, { directory: root, projectId: matched.id, gameId: platformGameId, accountId: desktop.publication.accountId }, signal) : { uploads: [], draft: null },
        inspectBuildEntry(root, matched?.preview, signal),
        localCover(root, signal),
      ])
      const capturedAt = Date.now()
      return { sessionId, state: 'ready', capturedAt, metadataError,
        project: { name: text(project?.title) || text(binding?.title) || basename(root), directory: root, engine: text(project?.engine || manifest?.engine, 24), sdkVersion: text(manifest?.sdkVersion || project?.sdkVersion, 40),
          locales: Array.isArray(manifest?.locales) ? manifest.locales.filter(v => typeof v === 'string').slice(0, 20).map(v => v.slice(0, 24)) : [], manifestPresent: !!manifest },
        gameId, localGameId, platformGameId, bindingConflict, recordsState, connection: desktop ? connected ? 'connected' : 'disconnected' : 'unavailable',
        uploads: evidence.uploads,
        cover: { platformUrl: evidence.draft?.coverUrl ?? null, observedAt: evidence.draft?.observedAt ?? null,
          localUrl: image ? `${COVER_ROUTE}?sessionId=${encodeURIComponent(sessionId)}` : null, localVersion: image?.version ?? null },
        preparation: preparationOverview({ manifest, metadataError, recordsState, bindingConflict, creatorReady: desktop?.publication?.creatorReady, build, draft: evidence.draft, uploads: evidence.uploads, now: capturedAt }),
        submissions: tasks.map(task => ({ releaseId: uuid(task.releaseId), version: text(task.version || task.summary?.material?.find(item => item.purpose === 'game')?.version, 80), status: text(task.status, 60), updatedAt: text(task.updatedAt || task.createdAt, 40),
          // Old updatedAt was written only after a successful platform refresh; never use createdAt.
          platformCheckedAt: timestamp(Object.hasOwn(task, 'platformCheckedAt') ? task.platformCheckedAt : task.updatedAt), errorCode: safeErrorCode(task.lastErrorCode) })),
        preview: !desktop || !matched ? 'unknown' : desktop.preview?.projectId === matched.id ? ['running', 'starting', 'failed', 'stopped'].includes(desktop.preview.status) ? desktop.preview.status : 'unknown' : desktop.preview?.status === 'stopped' || desktop.preview?.projectId ? 'stopped' : 'unknown',
      }
    } finally { lease[Symbol.dispose]() }
  }
}

export function registerGameView(ctx, config) {
  const read = createGameReader(ctx, config), flights = new Map()
  registerLocalCover(ctx)
  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: GAME_ROUTE, handler: async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    const admission = ctx.connection.admit(req)
    if ('rejection' in admission) { res.writeHead(admission.rejection).end(); return }
    // This local project view belongs to the authenticated Host owner, never a shared/API peer.
    if (admission.peer.principal.kind !== 'owner') { res.writeHead(403).end(); return }
    if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }).end(); return }
    const url = new URL(req.url, 'http://localhost'), sessionId = url.searchParams.get('sessionId')
    if (!sessionId || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId) || [...url.searchParams.keys()].some(key => key !== 'sessionId')) { res.writeHead(400).end(); return }
    try {
      // Concurrent refreshes share one read. No cache survives an account/project change.
      if (!flights.has(sessionId)) {
        if (flights.size >= 8) { res.writeHead(429).end(); return }
        const flight = read(sessionId, AbortSignal.timeout(10000)).finally(() => flights.delete(sessionId))
        flights.set(sessionId, flight)
      }
      const value = await flights.get(sessionId)
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(value))
    } catch { res.writeHead(503, { 'Content-Type': 'application/json' }).end('{"error":"game_status_unavailable"}') }
  } }))
}
