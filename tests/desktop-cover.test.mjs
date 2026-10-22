import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath, truncate } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { localCover, registerLocalCover, platformCoverUrl, COVER_ROUTE } from '../adapters/desktop/cover-server.mjs'
import { draftEvidence } from '../adapters/desktop/readiness-server.mjs'
import { createGameCover, GAME_COPY } from '../adapters/desktop/game-view.js'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=', 'base64')
const media = 'https://api.totop.ai/v2/release-media/11111111-1111-4111-8111-111111111111'
async function fixture(t) { const root = await mkdtemp(join(tmpdir(), 'totop-cover-')); t.after(() => rm(root, { recursive: true, force: true })); return realpath(root) }
test('local covers use fixed paths, check bytes and size, reject links, and return no project paths to the view', async t => {
  const root = await fixture(t), outside = await fixture(t), signal = new AbortController().signal
  assert.equal(await localCover(root, signal), null)
  await writeFile(join(root, 'cover.png'), '<svg onload="PRIVATE">not a png</svg>'); assert.equal(await localCover(root, signal), null)
  await writeFile(join(root, 'cover.png'), png); const metadata = await localCover(root, signal)
  assert.equal(metadata.type, 'image/png'); assert.doesNotMatch(JSON.stringify(metadata), /path|bytes|totop-cover/)
  assert.deepEqual((await localCover(root, signal, true)).bytes, png)
  await truncate(join(root, 'cover.png'), 10 * 1024 * 1024 + 1); assert.equal(await localCover(root, signal), null)
  await rm(join(root, 'cover.png')); await writeFile(join(outside, 'cover.png'), png); await symlink(join(outside, 'cover.png'), join(root, 'cover.png')); assert.equal(await localCover(root, signal), null)
  await rm(join(root, 'cover.png')); await symlink(outside, join(root, '.cover')); assert.equal(await localCover(root, signal), null)
  await rm(join(root, '.cover')); await mkdir(join(root, '.cover')); await writeFile(join(root, '.cover/cover.png'), png)
  assert.equal((await localCover(root, signal)).type, 'image/png')
  await assert.rejects(localCover(root, AbortSignal.abort()), { name: 'AbortError' })
})
test('local cover HTTP is owner-only, GET-only, tied to the requested Session and never accepts a path argument', async t => {
  const root = await fixture(t); await writeFile(join(root, 'cover.png'), png)
  let route, calls = 0, disposed = 0, admission = { rejection: 401 }
  const ctx = { effect: fn => fn(), connection: { admit: () => admission }, webServer: { register: value => { route = value } }, sessionQuery: { observeSession: async id => { calls++; if (id !== 'A') throw Error('/PRIVATE/path'); return { header: { cwd: root }, [Symbol.dispose]() { disposed++ } } } } }
  registerLocalCover(ctx); assert.equal(route.path, COVER_ROUTE)
  const request = async (query = '?sessionId=A', method = 'GET') => { const res = { headers: {}, setHeader(k,v) { this.headers[k] = v }, writeHead(code,headers) { this.code = code; Object.assign(this.headers, headers); return this }, end(body) { this.body = body } }; await route.handler({ url: COVER_ROUTE + query, method }, res); return res }
  assert.equal((await request()).code, 401)
  admission = { peer: { principal: { kind: 'api' } } }; assert.equal((await request()).code, 403)
  admission = { peer: { principal: { kind: 'owner' } } }; assert.equal((await request('?sessionId=A','POST')).code, 405)
  assert.equal((await request('?sessionId=A&path=/etc/passwd')).code, 400); assert.equal(calls, 0)
  const image = await request(); assert.equal(image.code, 200); assert.deepEqual(image.body, png); assert.equal(image.headers['Content-Type'], 'image/png'); assert.equal(image.headers['Cache-Control'], 'no-store'); assert.equal(disposed, 1)
  const other = await request('?sessionId=B'); assert.equal(other.code, 404); assert.equal(other.body, undefined)
})
test('only canonical public platform cover URLs survive evidence parsing', () => {
  assert.equal(platformCoverUrl(media), media)
  for (const value of [media+'?token=PRIVATE', media+'/../else', media.replace('api.totop.ai','evil.test'), media.replace('https://','http://'), media.replace('api.totop.ai','user:PRIVATE@api.totop.ai'), 'file:///private/cover.png', 'data:image/svg+xml,PRIVATE']) {
    assert.equal(platformCoverUrl(value), null); assert.equal(draftEvidence({ candidate: { cover: { url: value } } }, Date.now()).coverUrl, null)
  }
  assert.equal(draftEvidence({ candidate: { cover: { url: media } }, externalServices: [] }, Date.now()).coverUrl, media)
})
test('cover view falls back from platform to local exactly once, ends with an accessible placeholder, and isolates a new mount', () => {
  let slot, tree
  const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }), useState(initial) { slot ??= initial; return [slot, value => slot = typeof value === 'function' ? value(slot) : value] } }
  const View = createGameCover(React), props = { cover: { platformUrl: media, localUrl: COVER_ROUTE+'?sessionId=A' }, sessionId: 'A', name: '2048', copy: GAME_COPY.zh }
  const render = () => tree = View(props), image = () => tree.children.find(n => n?.type === 'img')
  render(); assert.equal(image().props.src, media); assert.equal(image().props.referrerPolicy, 'no-referrer'); image().props.onError()
  render(); assert.equal(image().props.src, COVER_ROUTE+'?sessionId=A'); assert.equal(tree.children[1].children[0], '本地封面'); image().props.onError()
  render(); assert.equal(image(), undefined); assert.equal(tree.children[0].props['aria-label'], '封面加载失败')
  slot = undefined; props.cover = { platformUrl: 'file:///PRIVATE', localUrl: COVER_ROUTE+'?sessionId=A' }; props.sessionId = 'B'; props.copy = GAME_COPY.en
  render(); assert.equal(image(), undefined); assert.equal(tree.children[0].props['aria-label'], 'No cover yet')
})
