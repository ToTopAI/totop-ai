import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { draftEvidence, inspectBuildEntry, preparationOverview } from '../adapters/desktop/readiness-server.mjs'
import { createGameReader } from '../adapters/desktop/game-view-server.mjs'
import { preparationDetail } from '../adapters/desktop/game-view.js'
const gameId = '11111111-1111-4111-8111-111111111111', uploadId = '22222222-2222-4222-8222-222222222222'
const wrap = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] })
async function project(t) {
  const root = await mkdtemp(join(tmpdir(), 'totop-preparation-')); t.after(() => rm(root, { recursive: true, force: true })); return realpath(root)
}
test('entry inspection uses configured build path, never follows links and never falls back from an unsafe or explicit missing build', async t => {
  const root = await project(t), outside = await project(t), signal = new AbortController().signal
  await writeFile(join(root, 'index.html'), 'source'); await mkdir(join(root, 'dist')); await writeFile(join(root, 'dist/index.html'), 'build')
  assert.equal((await inspectBuildEntry(root, {}, signal)).value, 'dist/index.html')
  assert.equal((await inspectBuildEntry(root, { mode: 'static', buildDirectory: '.' }, signal)).value, 'index.html')
  assert.equal((await inspectBuildEntry(root, { mode: 'static', buildDirectory: 'missing' }, signal)).detail, 'entry_missing')
  assert.equal((await inspectBuildEntry(root, { mode: 'static', buildDirectory: '../elsewhere' }, signal)).detail, 'entry_unsafe')
  await rm(join(root, 'dist'), { recursive: true }); await writeFile(join(outside, 'index.html'), 'PRIVATE'); await symlink(outside, join(root, 'dist'))
  assert.equal((await inspectBuildEntry(root, {}, signal)).detail, 'entry_unsafe')
  await rm(join(root, 'dist')); await mkdir(join(root, 'dist')); await symlink(join(outside, 'index.html'), join(root, 'dist/index.html'))
  assert.equal((await inspectBuildEntry(root, {}, signal)).detail, 'entry_unsafe')
  await rm(join(root, 'dist/index.html')); await writeFile(join(root, 'dist/index.html'), '')
  assert.equal((await inspectBuildEntry(root, {}, signal)).detail, 'entry_empty')
  await assert.rejects(inspectBuildEntry(root, {}, AbortSignal.abort()), { name: 'AbortError' })
})
test('preparation never equates observations with submission consent or a confirmed next version; unknown and stale drafts cannot pass', () => {
  const now = Date.now(), options = { manifest: {}, metadataError: false, recordsState: 'ready', bindingConflict: false, build: { status: 'observed', detail: 'entry_present', value: 'dist/index.html' }, uploads: [{ purpose: 'game', completed: true, version: '1.0.1' }], now }
  const byId = value => Object.fromEntries(value.items.map(item => [item.id, item]))
  let rows = byId(preparationOverview(options))
  assert.equal(rows.cover.status, 'pending'); assert.equal(rows.declarations.status, 'pending'); assert.equal(rows.version.status, 'pending'); assert.equal(rows.version.value, '1.0.1')
  const draft = draftEvidence({ candidate: { cover: { url: `https://api.totop.ai/v2/release-media/${uploadId}` } }, externalServices: [] }, now)
  rows = byId(preparationOverview({ ...options, draft })); assert.equal(rows.cover.status, 'observed'); assert.equal(rows.declarations.detail, 'declarations_none')
  rows = byId(preparationOverview({ ...options, draft, now: now + 300001 })); assert.equal(rows.cover.status, 'pending'); assert.equal(rows.cover.detail, 'draft_stale')
  rows = byId(preparationOverview({ ...options, draft: { ...draft, observedAt: null } })); assert.equal(rows.declarations.status, 'pending')
  rows = byId(preparationOverview({ ...options, bindingConflict: true, metadataError: true, creatorReady: false })); assert.equal(rows.binding.status, 'attention'); assert.equal(rows.config.status, 'attention')
  assert.equal(preparationOverview({ ...options, creatorReady: false }).items[0].detail, 'creator_incomplete')
  assert.match(preparationDetail(rows.version, true), /本次投稿版本仍需确认/); assert.match(preparationDetail(rows.version, false), /Confirm the version/)
  assert.equal(draftEvidence({ candidate: {}, externalServices: [{ origin: 'https://test', purpose: 'x' }] }, now).declarations, null)
  assert.doesNotMatch(JSON.stringify(rows), /readyToSubmit|authorized|canSubmit/)
})
test('only account, project and game matched tool results supply draft checks; switching accounts clears private draft evidence', async t => {
  const root = await project(t), requests = [], now = Date.now(); let account = 'A', offline = false
  await mkdir(join(root, 'dist')); await writeFile(join(root, 'dist/index.html'), '<html>build</html>')
  const events = [
    { type: 'tool/call', data: { callId: '1', name: 'mcp__totop-desktop__desktop_connection_status', arguments: '{}' } },
    { type: 'tool/result', time: now, data: { message: { toolCallId: '1', ...wrap({ project: { id: 'P', directory: root, binding: { gameId } }, account: { accountId: 'A' } }) } } },
    { type: 'tool/call', data: { callId: '2', name: 'mcp__totop-desktop__desktop_platform_tool', arguments: JSON.stringify({ name: 'get_game', arguments: { gameId } }) } },
    { type: 'tool/result', time: now, data: { message: { toolCallId: '2', ...wrap({ gameId, candidate: { cover: null }, externalServices: [{ origin: 'https://private.test', purpose: 'PRIVATE purpose', dataCollected: ['PRIVATE'], authentication: false, payments: false }] }) } } },
  ]
  const ctx = { sessionQuery: { observeSession: async () => ({ header: { cwd: root }, cursor: events.length, events, [Symbol.dispose]() {} }) } }
  const reader = createGameReader(ctx, { args: ['serve-desktop', 'http://127.0.0.1:1/tools', 'a'.repeat(64)] }, async (_url, options) => {
    requests.push(JSON.parse(options.body)); if (offline) throw Error('offline')
    return { ok: true, json: async () => wrap({ projects: [{ id: 'P', directory: root, binding: { gameId }, preview: { mode: 'static', buildDirectory: 'dist' } }], publication: { status: 'connected', accountId: account, creatorReady: true }, tasks: [] }) }
  })
  const read = () => reader('S', new AbortController().signal), cover = value => value.preparation.items.find(item => item.id === 'cover'), declarations = value => value.preparation.items.find(item => item.id === 'declarations')
  const first = await read(); assert.equal(cover(first).detail, 'cover_missing'); assert.equal(declarations(first).value, 1); assert.doesNotMatch(JSON.stringify(first), /PRIVATE|private.test/)
  account = 'B'; assert.equal(cover(await read()).detail, 'draft_unknown')
  account = 'A'; events.at(-1).data.message.isError = true; events.push({ type: 'assistant/message', data: { text: 'Everything is ready!' } }); assert.equal(cover(await read()).detail, 'draft_unknown')
  events.at(-2).data.message.isError = false; events.at(-2).data.message.content = wrap({ gameId: uploadId, candidate: { cover: null }, externalServices: [] }).content; events.push({ type: 'assistant/message' }); assert.equal(cover(await read()).detail, 'draft_unknown')
  offline = true; assert.equal(cover(await read()).detail, 'draft_unknown')
  assert.ok(requests.every(request => request.name === 'desktop_project' && request.arguments.action === 'list'))
})
