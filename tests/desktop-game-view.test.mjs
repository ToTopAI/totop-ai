import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGameReader, uploadEvidence, registerGameView } from '../adapters/desktop/game-view-server.mjs'
import { statusLabel, sizeLabel, validateGameState, createGameView, reasonLabel, platformFreshness, queryPrompt } from '../adapters/desktop/game-view.js'
import { installPluginLabels } from '../adapters/desktop/plugin-labels.js'

const gameId = '11111111-1111-4111-8111-111111111111', uploadId = '22222222-2222-4222-8222-222222222222'
const wrap = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] })
const config = { args: ['agent.mjs', 'serve-desktop', 'http://127.0.0.1:10000/tools', 'a'.repeat(64)] }
function evidence(directory, accountId = 'A') {
  return [
    { type: 'tool/call', data: { callId: '1', name: 'mcp__totop-desktop__desktop_connection_status', arguments: '{}' } },
    { type: 'tool/result', time: 123, data: { message: { toolCallId: '1', ...wrap({ project: { id: 'project-A', directory, binding: { gameId } }, account: { accountId }, localUploads: [{ gameId, uploadId, version: '1.0.1', completed: true, purpose: 'game', bytes: 17180, receipt: 'NEVER_EXPOSE', path: 'PRIVATE', idempotencyKey: 'PRIVATE' }] }) } } },
  ]
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'totop-game-view-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, '.totop')); await mkdir(join(root, 'src'))
  await writeFile(join(root, '.totop/project.json'), JSON.stringify({ title: '2048', engine: 'html5' }))
  await writeFile(join(root, 'src/totop.game.json'), JSON.stringify({ gameId, sdkVersion: '1.0.0', locales: ['en', 'zh-CN'] }))
  return realpath(root)
}
test('plugin reads exactly the Session project, scopes account/game records and never invokes a cloud or write tool', async t => {
  const root = await fixture(t); let disposed = 0, accountId = 'A', eventsRead = 0, connected = true
  const requests = []
  const ctx = { sessionQuery: { async observeSession(id) { assert.equal(id, 'session-A'); return { header: { cwd: root }, get events() { eventsRead++; return evidence(root) }, [Symbol.dispose]() { disposed++ } } } } }
  const reader = createGameReader(ctx, config, async (_url, options) => {
    requests.push(JSON.parse(options.body))
    return { ok: true, json: async () => wrap({ projects: [ { id: 'other', directory: '/other', binding: { gameId } }, { id: 'project-A', directory: root, binding: { gameId, title: '2048' } } ], publication: { status: connected ? 'connected' : 'disconnected', accountId }, preview: { status: 'running', projectId: 'other' }, tasks: [{ projectId: 'other', gameId, status: 'published' }, { projectId: 'project-A', gameId, status: 'submitted', releaseId: uploadId, updatedAt: '2026-10-22' }] }) }
  })
  const state = await reader('session-A', new AbortController().signal)
  assert.equal(state.project.name, '2048'); assert.equal(state.project.directory, root); assert.equal(state.preview, 'stopped')
  assert.equal(state.uploads.length, 1); assert.equal(state.uploads[0].completed, true); assert.equal(state.submissions.length, 1)
  assert.doesNotMatch(JSON.stringify(state), /NEVER_EXPOSE|PRIVATE|idempotency|receipt/)
  accountId = 'B'; assert.deepEqual((await reader('session-A', new AbortController().signal)).uploads, [])
  connected = false; const signedOut = await reader('session-A', new AbortController().signal)
  assert.deepEqual(signedOut.uploads, []); assert.deepEqual(signedOut.submissions, []); assert.equal(eventsRead, 2)
  assert.equal(disposed, 3)
  assert.ok(requests.every(r => r.name === 'desktop_project' && r.arguments.action === 'list'))
})
test('missing directories, symlink escapes, corrupt/oversize metadata and absent bridge are explicit; Session leases are released', async t => {
  const root = await fixture(t), outside = await fixture(t)
  let cwd = join(root, 'missing'), disposed = 0
  const ctx = { sessionQuery: { observeSession: async () => ({ header: { cwd }, get events() { throw Error('history must not be read') }, [Symbol.dispose]() { disposed++ } }) } }
  const read = createGameReader(ctx, {})
  assert.equal((await read('s', new AbortController().signal)).state, 'project_unavailable')
  cwd = undefined; assert.equal((await read('s', new AbortController().signal)).state, 'no_project')
  cwd = root
  await rm(join(root, '.totop/project.json')); await symlink(join(outside, '.totop/project.json'), join(root, '.totop/project.json'))
  await writeFile(join(root, 'src/totop.game.json'), 'x'.repeat(40000))
  const state = await read('s', new AbortController().signal)
  assert.equal(state.metadataError, true); assert.equal(state.project.manifestPresent, false); assert.equal(state.connection, 'unavailable')
  assert.equal(state.project.sdkVersion, null); assert.equal(disposed, 3)
})
test('upload evidence ignores assistant claims, failed calls, foreign game/account/project and does not infer publication', () => {
  const context = { directory: '/game', gameId, accountId: 'A' }
  assert.equal(uploadEvidence(evidence('/game'), context).length, 1)
  for (const change of [{ directory: '/else' }, { gameId: uploadId }, { accountId: 'B' }]) assert.deepEqual(uploadEvidence(evidence('/game'), { ...context, ...change }), [])
  const failed = evidence('/game'); failed[1].data.message.isError = true; assert.deepEqual(uploadEvidence(failed, context), [])
  assert.deepEqual(uploadEvidence([{ type: 'assistant/message', data: { content: [{ type: 'text', text: 'Published!' }] } }], context), [])
  assert.equal(statusLabel('approved', true), '审核通过，待发布'); assert.equal(statusLabel('bogus', true), '状态待确认')
  assert.equal(sizeLabel(17180), '16.8 KB'); assert.throws(() => validateGameState({ sessionId: 'B', state: 'no_project' }, 'A'))
  const freshId = '33333333-3333-4333-8333-333333333333'
  const events = evidence('/game'), value = JSON.parse(events[1].data.message.content[0].text)
  value.project.id = 'project-A'; events[1].data.message = { toolCallId: '1', ...wrap(value) }
  events.push({ type: 'tool/call', data: { callId: '2', name: 'mcp__totop-desktop__desktop_platform_tool', arguments: JSON.stringify({ name: 'start_upload', arguments: { gameId, purpose: 'game', version: '2.0.0' } }) } })
  const receipt = { uploadId: freshId, accountId: 'A', projectId: 'other-project' }
  events.push({ type: 'tool/result', data: { message: { toolCallId: '2', ...wrap(receipt) } } })
  assert.equal(uploadEvidence(events, context).length, 1)
  receipt.projectId = 'project-A'; events.at(-1).data.message = { toolCallId: '2', ...wrap(receipt) }
  assert.equal(uploadEvidence(events, context).length, 2)
})
test('Harness route requires trusted authenticated owner; GET only; unknown sessions do not leak errors', async () => {
  let route, calls = 0, admit = { rejection: 401 }
  const ctx = { effect: fn => fn(), webServer: { register: value => { route = value; return () => {} } }, connection: { admit: () => admit }, sessionQuery: { observeSession: async () => { calls++; throw Error('/private/secret-path') } } }
  registerGameView(ctx, {})
  const request = async (url = '?sessionId=s', method = 'GET') => {
    const res = { setHeader() {}, writeHead(code) { this.code = code; return this }, end(body = '') { this.body = body; return this } }
    await route.handler({ url: route.path + url, method }, res); return res
  }
  assert.equal((await request()).code, 401)
  admit = { peer: { principal: { kind: 'api' } } }; assert.equal((await request()).code, 403)
  admit = { peer: { principal: { kind: 'owner' } } }; assert.equal((await request('?sessionId=s', 'POST')).code, 405)
  assert.equal((await request('?sessionId=../outside')).code, 400); assert.equal((await request('?sessionId=s&path=/tmp')).code, 400)
  assert.equal(calls, 0)
  const failure = await request(); assert.equal(failure.code, 503); assert.doesNotMatch(failure.body, /private|secret/)
})

test('view cancels stale session reads, retries failures and cleans polling; never displays a different Session response', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const restore = new Map(['document', 'MutationObserver'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  Object.defineProperties(globalThis, { document: { configurable: true, value: { documentElement: { lang: 'zh-CN' }, visibilityState: 'visible' } }, MutationObserver: { configurable: true, value: class { observe() {} disconnect() {} } } })
  t.after(() => { for (const [key, value] of restore) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key] } })
  const slots = [], effects = []; let index = 0, dirty = false, tree
  const React = { Fragment: 'fragment', createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true }] },
    useEffect(fn, deps) { const i = index++, old = slots[i]; if (!old || deps.some((v, n) => !Object.is(v, old.deps[n]))) { old?.cleanup?.(); slots[i] = { deps }; effects.push(() => slots[i].cleanup = fn()) } },
  }
  const pending = [], props = { sessionId: 'A', useSession: select => select({ running: false }), readGame: (id, signal) => new Promise((resolve, reject) => pending.push({ id, signal, resolve, reject })) }
  const View = createGameView(React)
  const render = () => { dirty = false; index = 0; tree = View(props); while (effects.length) effects.shift()() }
  const flush = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (dirty) render() } }
  const content = () => { const visit = v => typeof v === 'string' ? v : v?.children?.map(visit).join(' ') || ''; return visit(tree) }
  render(); props.sessionId = 'B'; render(); assert.equal(pending[0].signal.aborted, true)
  pending[0].resolve({ sessionId: 'A', state: 'no_project' }); await flush(); assert.doesNotMatch(content(), /尚未关联/)
  pending[1].resolve({ sessionId: 'A', state: 'no_project' }); await flush(); assert.match(content(), /暂时无法读取/)
  t.mock.timers.tick(15000); await flush(); pending[2].resolve({ sessionId: 'B', state: 'no_project' }); await flush(); assert.match(content(), /尚未关联/)
  for (const slot of slots) slot?.cleanup?.(); assert.equal(pending[2].signal.aborted, true)
})

test('binding conflicts preserve both IDs; offline, signed-out and unbound records are not empty or stopped facts; versions come from frozen material', async t => {
  const root = await fixture(t)
  const ctx = { sessionQuery: { observeSession: async () => ({ header: { cwd: root }, cursor: -1, events: [], [Symbol.dispose]() {} }) } }
  let offline = false, connected = true, bound = true
  const reader = createGameReader(ctx, config, async () => {
    if (offline) throw Error('offline')
    return { ok: true, json: async () => wrap({ projects: [{ id: 'project-A', directory: root, binding: bound ? { gameId: uploadId } : null }], publication: { status: connected ? 'connected' : 'disconnected', accountId: 'A' },
      preview: { projectId: 'project-A', status: 'starting' }, tasks: [{ projectId: 'project-A', gameId: uploadId, status: 'uncertain', createdAt: '2026-10-22', summary: { material: [{ purpose: 'game', version: '2.0.1', receipt: 'NEVER_EXPOSE' }] } }] }) }
  })
  const read = () => reader('s', new AbortController().signal)
  const conflict = await read()
  assert.equal(conflict.bindingConflict, true); assert.equal(conflict.localGameId, gameId); assert.equal(conflict.platformGameId, uploadId)
  assert.equal(conflict.preview, 'starting'); assert.equal(conflict.submissions[0].version, '2.0.1'); assert.equal(conflict.submissions[0].updatedAt, '2026-10-22')
  assert.doesNotMatch(JSON.stringify(conflict), /receipt|NEVER_EXPOSE/)
  offline = true; const failed = await read(); assert.equal(failed.recordsState, 'unavailable'); assert.equal(failed.preview, 'unknown')
  offline = false; connected = false; assert.equal((await read()).recordsState, 'disconnected')
  connected = true; bound = false; assert.equal((await read()).recordsState, 'unbound')
})

test('long Session history survives 4000 newer events, unchanged cursors skip history, new events are incremental and identity/project changes invalidate summaries', async t => {
  const root = await fixture(t); let eventReads = 0, oldDataReads = 0, account = 'A', projectId = 'project-A'
  const events = evidence(root)
  const oldData = events[0].data
  Object.defineProperty(events[0], 'data', { get() { oldDataReads++; return oldData } })
  events.push(...Array.from({ length: 4100 }, () => ({ type: 'assistant/message' })))
  const ctx = { sessionQuery: { observeSession: async () => ({ header: { cwd: root }, cursor: events.length - 1, get events() { eventReads++; return events }, [Symbol.dispose]() {} }) } }
  const reader = createGameReader(ctx, config, async () => ({ ok: true, json: async () => wrap({ projects: [{ id: projectId, directory: root, binding: { gameId } }], publication: { status: 'connected', accountId: account }, preview: { status: 'stopped' }, tasks: [] }) }))
  const read = () => reader('s', new AbortController().signal)
  assert.equal((await read()).uploads.length, 1)
  const firstPass = oldDataReads
  assert.equal((await read()).uploads.length, 1); assert.equal(eventReads, 1)
  events.push({ type: 'assistant/message' })
  assert.equal((await read()).uploads.length, 1); assert.equal(eventReads, 2); assert.equal(oldDataReads, firstPass)
  account = 'B'; assert.deepEqual((await read()).uploads, [])
  account = 'A'; projectId = 'project-B'; assert.deepEqual((await read()).uploads, [])
  projectId = 'project-A'; assert.equal((await read()).uploads.length, 1)
})

test('cancelling a history scan releases the lease and cannot poison the next summary read', async t => {
  const root = await fixture(t); let disposed = 0
  const ctx = { sessionQuery: { observeSession: async () => ({ header: { cwd: root }, cursor: 1, events: evidence(root), [Symbol.dispose]() { disposed++ } }) } }
  const reader = createGameReader(ctx, config, async () => ({ ok: true, json: async () => wrap({ projects: [{ id: 'project-A', directory: root, binding: { gameId } }], publication: { status: 'connected', accountId: 'A' }, tasks: [] }) }))
  await assert.rejects(reader('s', AbortSignal.abort()), { name: 'AbortError' })
  assert.equal((await reader('s', new AbortController().signal)).uploads.length, 1); assert.equal(disposed, 2)
})

test('plugin labels ignore chat text mutations, update only inserted cards, follow language and clean up observers', () => {
  let documentQueries = 0; const observers = []
  class Observer { constructor(callback) { this.callback = callback; observers.push(this) } observe(_target, options) { this.options = options } disconnect() { this.disconnected = true } }
  const title = { textContent: 'Original' }, label = { value: 'totop-platform-llm details', getAttribute() { return this.value }, setAttribute(_key, value) { this.value = value } }
  const card = { nodeType: 1, matches: () => true, querySelectorAll: () => [], getAttribute: key => key === 'data-plugin-entry' ? 'include:totop-platform-llm' : 'totop-platform-llm', querySelector: selector => selector === 'strong' ? title : selector === 'button' ? label : null }
  const doc = { body: {}, documentElement: { lang: 'zh-CN' }, querySelectorAll() { documentQueries++; return [] } }
  const cleanup = installPluginLabels(doc, Observer)
  assert.equal(observers[0].options.characterData, undefined)
  for (let i = 0; i < 1000; i++) observers[0].callback([{ target: { closest: () => null }, addedNodes: [{ nodeType: 3 }] }])
  assert.equal(documentQueries, 1)
  observers[0].callback([{ target: { closest: () => null }, addedNodes: [card] }]); assert.equal(title.textContent, 'ToTop AI 连接'); assert.equal(documentQueries, 1)
  doc.documentElement.lang = 'en-US'; doc.querySelectorAll = () => { documentQueries++; return [card] }; observers[1].callback()
  assert.equal(title.textContent, 'ToTop AI connection'); assert.equal(label.value, 'ToTop AI connection details')
  cleanup(); assert.ok(observers.every(observer => observer.disconnected))
})

test('rendered game facts distinguish unknown records, show conflict IDs and submission versions, and pause hidden polling with immediate recovery', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const restore = new Map(['document', 'MutationObserver'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)])), observers = [], listeners = new Map()
  const doc = { documentElement: { lang: 'zh-CN' }, visibilityState: 'visible', addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }
  Object.defineProperties(globalThis, { document: { configurable: true, value: doc }, MutationObserver: { configurable: true, value: class { constructor(callback) { observers.push(callback) } observe() {} disconnect() {} } } })
  t.after(() => { for (const [key, value] of restore) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key] } })
  const slots = [], effects = []; let index = 0, dirty = false, tree, requests = 0
  const React = { Fragment: 'fragment', createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true }] },
    useEffect(fn, deps) { const i = index++, old = slots[i]; if (!old || deps.some((v, n) => !Object.is(v, old.deps[n]))) { old?.cleanup?.(); slots[i] = { deps }; effects.push(() => slots[i].cleanup = fn()) } },
  }
  let state = { sessionId: 's', state: 'ready', project: { name: '2048', directory: '/game', engine: 'html5', locales: ['zh-CN'], manifestPresent: true }, preview: 'unknown', recordsState: 'unavailable', connection: 'unavailable', uploads: [], submissions: [] }
  const props = { sessionId: 's', useSession: select => select({ running: false }), readGame: async () => { requests++; return state } }
  const View = createGameView(React), render = () => { dirty = false; index = 0; tree = View(props); while (effects.length) effects.shift()() }
  const flush = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (dirty) render() } }
  const nodes = value => value && typeof value === 'object' ? [value, ...value.children.flatMap(nodes)] : []
  const content = () => { const visit = v => typeof v === 'string' ? v : v?.children?.map(visit).join(' ') || ''; return visit(tree) }
  const refresh = async () => { nodes(tree).find(n => n.type === 'button' && n.props['aria-label']).props.onClick(); await flush() }
  render(); await flush(); assert.match(content(), /暂时无法获取记录/); assert.doesNotMatch(content(), /未运行|暂无此游戏的投稿记录/)
  state = { ...state, recordsState: 'disconnected', connection: 'disconnected' }; await refresh(); assert.match(content(), /请先登录并连接客户端账号/)
  state = { ...state, recordsState: 'unbound' }; await refresh(); assert.match(content(), /绑定平台游戏后/)
  state = { ...state, capturedAt: Date.now(), recordsState: 'ready', connection: 'connected', bindingConflict: true, localGameId: gameId, gameId: uploadId, submissions: [{ status: 'uncertain', version: '2.0.1' }, { status: 'failed', version: '2.0.0', errorCode: 'developer_submission_conflict', platformCheckedAt: '2020-01-01T00:00:00.000Z' }, { status: 'submitting', version: '3.0.0' }] }
  await refresh(); assert.match(content(), /游戏绑定不一致/); assert.match(content(), new RegExp(gameId)); assert.match(content(), new RegExp(uploadId))
  assert.match(content(), /提交结果不确定/); assert.match(content(), /确认前请勿重复提交/); assert.match(content(), /提交失败/); assert.match(content(), /正在提交/); assert.match(content(), /版本 2.0.1/); assert.match(content(), /已有进行中的投稿/); assert.match(content(), /状态可能已过期/); assert.match(content(), /尚无平台核对时间/); assert.doesNotMatch(content(), /复制排查指令/)
  state = { ...state, bindingConflict: false, preparation: { items: [{ id: 'build', status: 'observed', detail: 'entry_present', value: 'dist/index.html' }, { id: 'version', status: 'pending', detail: 'version_confirm' }] } }; await refresh(); assert.match(content(), /投稿准备/); assert.match(content(), /尚未执行构建或试玩/); assert.match(content(), /复制准备检查指令/); assert.match(content(), /复制排查指令/); assert.match(content(), /复制查询指令/);
  doc.visibilityState = 'hidden'; const before = requests; t.mock.timers.tick(15000); await flush(); assert.equal(requests, before)
  doc.visibilityState = 'visible'; listeners.get('visibilitychange')(); await flush(); assert.equal(requests, before + 1)
  doc.documentElement.lang = 'en-US'; observers.forEach(fn => fn()); await flush(); assert.match(content(), /Copy diagnostic prompt/); assert.match(content(), /Submission preparation/); assert.match(content(), /Copy preparation prompt/); assert.match(content(), /Submission result uncertain/)
  for (const slot of slots) slot?.cleanup?.(); assert.equal(listeners.size, 0)
})


test('diagnostics and platform freshness never treat page reads, creation times or unsafe errors as platform checks', async t => {
  const root = await fixture(t), now = Date.now()
  const tasks = [
    { projectId: 'project-A', gameId, status: 'failed', lastErrorCode: 'developer_submission_conflict', platformCheckedAt: new Date(now - 600000).toISOString(), createdAt: new Date().toISOString() },
    { projectId: 'project-A', gameId, status: 'uncertain', lastErrorCode: 'https://private.test/token=SECRET', platformCheckedAt: null, updatedAt: new Date().toISOString() },
    { projectId: 'project-A', gameId, status: 'manual_review', updatedAt: '2026-10-22T01:00:00.000Z' },
    { projectId: 'project-A', gameId, status: 'submitted', createdAt: new Date().toISOString() },
  ]
  const ctx = { sessionQuery: { observeSession: async () => ({ header: { cwd: root }, cursor: -1, events: [], [Symbol.dispose]() {} }) } }
  const reader = createGameReader(ctx, config, async () => ({ ok: true, json: async () => wrap({ projects: [{ id: 'project-A', directory: root, binding: { gameId } }], publication: { status: 'connected', accountId: 'A' }, tasks }) }))
  const first = await reader('s', new AbortController().signal), second = await reader('s', new AbortController().signal)
  const failed = first.submissions.find(t => t.status === 'failed')
  assert.equal(failed.errorCode, 'developer_submission_conflict'); assert.equal(platformFreshness(failed, now), 'stale')
  assert.equal(second.submissions.find(t => t.status === 'failed').platformCheckedAt, failed.platformCheckedAt)
  assert.equal(first.submissions.find(t => t.status === 'uncertain').platformCheckedAt, null)
  assert.equal(first.submissions.find(t => t.status === 'submitted').platformCheckedAt, null)
  assert.equal(first.submissions.find(t => t.status === 'manual_review').platformCheckedAt, '2026-10-22T01:00:00.000Z')
  assert.doesNotMatch(JSON.stringify(first), /SECRET|private.test/)
  assert.equal(platformFreshness({ platformCheckedAt: new Date(now).toISOString() }, now), 'fresh')
  assert.equal(platformFreshness({ platformCheckedAt: 'invalid' }, now), 'unknown')
  assert.equal(platformFreshness({ platformCheckedAt: new Date(now + 120000).toISOString() }, now), 'unknown')
  assert.match(reasonLabel('network_timeout', true), /超时/); assert.equal(reasonLabel('SECRET', true), null)
  for (const zh of [true, false]) {
    const prompt = queryPrompt(gameId, { releaseId: uploadId }, zh)
    assert.ok(prompt.includes(gameId) && prompt.includes(uploadId)); assert.match(prompt, zh ? /不要上传、重试写操作、重新提交或发布/ : /Do not upload, retry writes, resubmit, publish/)
    assert.match(queryPrompt(gameId, {}, zh), zh ? /不要新建投稿/ : /locate the original request/)
  }
})
