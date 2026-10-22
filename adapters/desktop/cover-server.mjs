import { constants } from 'node:fs'
import { lstat, open, realpath } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'

const LIMIT = 10 * 1024 * 1024
const CANDIDATES = ['.cover/cover.png', '.cover/cover.jpg', '.cover/cover.jpeg', '.cover/cover.webp', 'cover.png', 'cover.jpg', 'cover.jpeg', 'cover.webp']
export const COVER_ROUTE = '/totop-plugin/current-game/cover'
export const platformCoverUrl = value => typeof value === 'string' && /^https:\/\/api\.totop\.ai\/v2\/release-media\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value) ? value : null
function imageType(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.subarray(12,16).toString() === 'IHDR') return 'image/png'
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (bytes.length >= 20 && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP') return 'image/webp'
  return null
}
const unchanged = (a, b) => a.ino === b.ino && a.dev === b.dev && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs

// Only conventional cover locations inside this Session's project. No arbitrary
// path input, SVG/HTML, links or project enumeration is exposed by the image route.
export async function localCover(root, signal, full = false) {
  for (const candidate of CANDIDATES) {
    let handle
    try {
      let file = root
      for (const part of candidate.split('/')) {
        signal.throwIfAborted(); file = resolve(file, part)
        if ((await lstat(file)).isSymbolicLink()) throw Error('linked_cover')
      }
      if (await realpath(file) !== file) continue
      const before = await lstat(file)
      if (!before.isFile() || before.size < 4 || before.size > LIMIT) continue
      handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
      if (!unchanged(before, await handle.stat())) continue
      const bytes = Buffer.alloc(full ? before.size + 1 : Math.min(before.size, 32))
      const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
      const body = bytes.subarray(0, bytesRead), type = imageType(body)
      if (!type || full && bytesRead !== before.size || !unchanged(before, await handle.stat()) || !unchanged(before, await lstat(file)) || await realpath(file) !== file) continue
      return { type, version: `${before.mtimeMs}-${before.size}`, ...(full ? { bytes: body } : {}) }
    } catch (error) { if (signal.aborted) throw error }
    finally { await handle?.close() }
  }
  return null
}

export function registerLocalCover(ctx) {
  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: COVER_ROUTE, handler: async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    const admission = ctx.connection.admit(req)
    if ('rejection' in admission) { res.writeHead(admission.rejection).end(); return }
    if (admission.peer.principal.kind !== 'owner') { res.writeHead(403).end(); return }
    if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }).end(); return }
    const url = new URL(req.url, 'http://localhost'), sessionId = url.searchParams.get('sessionId')
    if (!sessionId || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId) || [...url.searchParams.keys()].some(key => key !== 'sessionId')) { res.writeHead(400).end(); return }
    let lease
    try {
      const signal = AbortSignal.timeout(5000)
      lease = await ctx.sessionQuery.observeSession(sessionId, { signal, projectionMode: 'none' })
      const cwd = lease.header.cwd
      if (!cwd || !isAbsolute(cwd)) { res.writeHead(404).end(); return }
      const root = await realpath(cwd), cover = await localCover(root, signal, true)
      if (!cover) { res.writeHead(404).end(); return }
      res.writeHead(200, { 'Content-Type': cover.type, 'Content-Length': cover.bytes.length }).end(cover.bytes)
    } catch { res.writeHead(404).end() }
    finally { lease?.[Symbol.dispose]() }
  } }))
}
