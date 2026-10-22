export const COPY = {
  zh: {
    summary: '用对话连接游戏开发、试玩与发布。', workflow: '游戏创作流程',
    steps: [['开发与修改', '新建游戏，或继续完善已有项目。'], ['本地试玩', '预览游戏，检查运行与 SDK 接入。'], ['上传与投稿', '准备上传材料，查询审核与发布状态。']],
    examples: '在对话中这样开始', prompts: ['开发一款小游戏，并在本地试玩。', '检查当前游戏的投稿准备情况，先不要提交。'],
    copy: '复制', copied: '已复制', copyHint: '复制后，粘贴到对话中开始。', copySuccess: '已复制到剪贴板，可粘贴到对话中。', copyFailed: '复制未完成，请选择示例文字手动复制。',
    info: '插件信息', version: '版本', source: '来源', bundled: '客户端内置', official: '官方更新', loading: '正在读取…',
    check: '检查更新', checking: '正在检查更新', checkingHelp: '检查完成前，你仍可继续创作。',
    auto: '自动检查更新', current: '已是最新版本', autoHelp: '更新就绪后，下次启动生效。', staged: '新版已就绪', stagedHelp: '下次启动客户端时自动启用。',
    failed: '暂时无法检查更新', failedHelp: '当前版本仍可使用，可稍后重试。', unavailable: '暂时无法读取状态', unavailableHelp: '可稍后重试，或重新打开插件页面。',
    scope: '本地操作仅限已授权项目，投稿与发布需确认。',
  },
  en: {
    summary: 'Connect game development, playtesting and publishing through chat.', workflow: 'Your game workflow',
    steps: [['Build and refine', 'Create a game or improve an existing project.'], ['Playtest locally', 'Preview your game and check its runtime and SDK integration.'], ['Upload and submit', 'Prepare upload materials and check review and publication status.']],
    examples: 'Start with a conversation', prompts: ['Build a small game and playtest it locally.', 'Check whether this game is ready for submission. Do not submit yet.'],
    copy: 'Copy', copied: 'Copied', copyHint: 'Copy an example and paste it into a conversation.', copySuccess: 'Copied to clipboard. Paste it into a conversation.', copyFailed: 'Could not copy. Select the example text and copy it manually.',
    info: 'Plugin information', version: 'Version', source: 'Source', bundled: 'Included with the app', official: 'Official update', loading: 'Loading…',
    check: 'Check for updates', checking: 'Checking for updates', checkingHelp: 'You can keep creating while we check.',
    auto: 'Updates checked automatically', current: 'You’re up to date', autoHelp: 'Ready updates take effect the next time the app starts.', staged: 'Update ready', stagedHelp: 'The update will be enabled the next time the app starts.',
    failed: 'Could not check for updates', failedHelp: 'Your current version still works. Try again later.', unavailable: 'Status unavailable', unavailableHelp: 'Try again later or reopen this plugin page.',
    scope: 'Local access is limited to approved projects. Submission and publication require confirmation.',
  },
}

export function updatePresentation(state, copy, { pending = false, unavailable = false } = {}) {
  if (unavailable) return { title: copy.unavailable, detail: copy.unavailableHelp, tone: 'warning' }
  if (pending || state?.updateStatus === 'checking') return { title: copy.checking, detail: copy.checkingHelp, tone: 'checking' }
  const phase = state?.updateStatus
  if (phase === 'staged') return { title: copy.staged, detail: copy.stagedHelp, tone: 'ready' }
  if (phase === 'failed') return { title: copy.failed, detail: copy.failedHelp, tone: 'warning' }
  return { title: phase === 'current' ? copy.current : copy.auto, detail: copy.autoHelp, tone: 'quiet' }
}

export function validateSnapshot(value) {
  if (!value || !/^\d+\.\d+\.\d+$/.test(value.version || '') || !['bundled', 'official-release'].includes(value.source)
    || !['idle', 'checking', 'current', 'staged', 'failed'].includes(value.updateStatus)) throw Error('plugin_status_unavailable')
  return value
}

export const DETAIL_CSS = `
.totop-plugin-details{--tp-muted:#99999f;--tp-line:#303034;--tp-accent:#ffcf36;box-sizing:border-box;color:#eeeef0;width:100%;max-width:1080px;font-size:13px;line-height:1.65;container-type:inline-size}
.totop-plugin-details *{box-sizing:border-box}
.totop-plugin-details :is(h2,h3,p,ol,dl,dd){margin:0;padding:0}
.totop-plugin-grid{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:36px;align-items:start}
.totop-plugin-details h2{color:#eeeef0;font-size:16px;font-weight:600;line-height:24px;letter-spacing:0}
.totop-plugin-steps{list-style:none;margin-top:8px!important}
.totop-plugin-step{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;align-items:start;padding:19px 0;border-bottom:1px solid var(--tp-line)}
.totop-plugin-step:last-child{border-bottom:0}
.totop-plugin-step-number{font-size:25px;line-height:30px;font-weight:500;color:#76767e;font-variant-numeric:tabular-nums;letter-spacing:-.6px}
.totop-plugin-step h3{font-size:14px;line-height:22px;font-weight:600;color:#eeeef0}
.totop-plugin-step p{margin-top:3px;color:var(--tp-muted);font-size:13px;line-height:21px}
.totop-plugin-examples{margin-top:24px}
.totop-plugin-prompts{margin-top:13px;border:1px solid var(--tp-line);border-radius:10px;overflow:hidden;background:#19191c}
.totop-plugin-prompt{display:flex;gap:16px;align-items:center;justify-content:space-between;padding:13px 15px}
.totop-plugin-prompt+.totop-plugin-prompt{border-top:1px solid var(--tp-line)}
.totop-plugin-prompt p{min-width:0;overflow-wrap:anywhere;color:#d6d6db;font-size:13px;line-height:21px}
.totop-plugin-details button{appearance:none;font:inherit;font-size:12px;line-height:18px;font-weight:500;border:1px solid #414148;border-radius:7px;background:transparent;color:#d5d5da;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:7px 11px;min-height:34px;transition:background .15s,border-color .15s;white-space:nowrap;flex:none}
.totop-plugin-details button:hover:not(:disabled){background:#26262b;border-color:#777780}
.totop-plugin-details button:focus-visible{outline:2px solid var(--tp-accent);outline-offset:3px}
.totop-plugin-details button:disabled{opacity:.55;cursor:default}
.totop-plugin-details button svg{width:14px;height:14px;flex:none}
.totop-plugin-copy-feedback{min-height:20px;margin-top:8px!important;color:var(--tp-muted);font-size:12px;line-height:20px}
.totop-plugin-info{border:1px solid var(--tp-line);border-radius:10px;padding:21px;background:#19191b}
.totop-plugin-facts{display:grid;gap:16px;margin-top:23px!important}
.totop-plugin-facts dt{color:var(--tp-muted);font-size:12px;line-height:18px}
.totop-plugin-facts dd{margin-top:3px;font-size:13px;line-height:21px;color:#e0e0e4;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.totop-plugin-update{margin-top:21px;padding-top:20px;border-top:1px solid var(--tp-line)}
.totop-plugin-update-title{display:flex;align-items:baseline;gap:8px;font-size:13px;line-height:21px;color:#dedee3}
.totop-plugin-update-title:before{content:'';display:block;align-self:center;width:5px;height:5px;border-radius:50%;background:#777780;flex:none}
.totop-plugin-update[data-tone=ready] .totop-plugin-update-title:before{background:var(--tp-accent)}
.totop-plugin-update[data-tone=warning] .totop-plugin-update-title:before{background:#d9ad61}
.totop-plugin-update[data-tone=checking] .totop-plugin-update-title:before{background:var(--tp-accent)}
.totop-plugin-update-detail{color:var(--tp-muted);font-size:12px;line-height:20px;margin-top:7px!important;min-height:40px}
.totop-plugin-details .totop-plugin-check{margin-top:15px;border-color:#78672f;color:#f0d47c;background:#ffcf3605}
.totop-plugin-details .totop-plugin-check:hover:not(:disabled){background:#ffcf3610;border-color:var(--tp-accent)}
.totop-plugin-check[aria-busy=true] svg{animation:totop-plugin-spin 1.2s linear infinite}
.totop-plugin-scope{border-top:1px solid var(--tp-line);padding-top:17px!important;margin-top:24px!important;color:#86868f;font-size:12px;line-height:20px}
@container(max-width:700px){.totop-plugin-grid{grid-template-columns:minmax(0,1fr);gap:24px}.totop-plugin-info{max-width:none}.totop-plugin-facts{grid-template-columns:1fr 1fr}.totop-plugin-prompt{gap:10px;padding:12px}.totop-plugin-step{gap:8px}}
@media(prefers-reduced-motion:reduce){.totop-plugin-details button{transition:none}.totop-plugin-check[aria-busy=true] svg{animation:none}}
@keyframes totop-plugin-spin{to{transform:rotate(360deg)}}
`

export function createPluginCard(React) {
  const h = React.createElement
  function useLanguage() {
    const current = () => document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
    const [language, setLanguage] = React.useState(current)
    React.useEffect(() => {
      const observer = new MutationObserver(() => setLanguage(current()))
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
      return () => observer.disconnect()
    }, [])
    return language
  }
  const icon = name => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    ...(name === 'copy' ? [h('rect', { key: 1, x: 8, y: 8, width: 12, height: 13, rx: 2 }), h('path', { key: 2, d: 'M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3' })]
      : [h('path', { key: 1, d: 'M20 10a8 8 0 0 0-14-4L3 9m0-5v5h5M4 14a8 8 0 0 0 14 4l3-3m0 5v-5h-5' })]))
  function Details({ copy: c }) {
    const [state, setState] = React.useState(null), [pending, setPending] = React.useState(false), [unavailable, setUnavailable] = React.useState(false)
    const [copied, setCopied] = React.useState(null), [copyFailed, setCopyFailed] = React.useState(false)
    const active = React.useRef(true), checking = React.useRef(false), copyTimer = React.useRef(null)
    React.useEffect(() => {
      active.current = true
      let mounted = true
      Promise.resolve().then(() => window.totopCreatorPlugin.status()).then(validateSnapshot).then(value => { if (mounted) setState(value) }).catch(() => { if (mounted) setUnavailable(true) })
      return () => { mounted = false; active.current = false; clearTimeout(copyTimer.current) }
    }, [])
    React.useEffect(() => {
      if (state?.updateStatus !== 'checking' || pending) return
      let mounted = true
      const timer = setTimeout(() => {
        window.totopCreatorPlugin.status().then(validateSnapshot).then(value => { if (mounted) { setState(value); setUnavailable(false) } }).catch(() => { if (mounted) setUnavailable(true) })
      }, 1000)
      return () => { mounted = false; clearTimeout(timer) }
    }, [state, pending])
    React.useEffect(() => { clearTimeout(copyTimer.current); setCopied(null); setCopyFailed(false) }, [c])
    async function check() {
      if (checking.current) return
      checking.current = true; setPending(true); setUnavailable(false)
      try { const value = validateSnapshot(await window.totopCreatorPlugin.check()); if (active.current) setState(value) }
      catch { if (active.current) setUnavailable(true) }
      finally { checking.current = false; if (active.current) setPending(false) }
    }
    async function copyPrompt(index) {
      clearTimeout(copyTimer.current)
      try {
        await navigator.clipboard.writeText(c.prompts[index])
        if (!active.current) return
        setCopied(index); setCopyFailed(false)
        copyTimer.current = setTimeout(() => { if (active.current) setCopied(null) }, 2500)
      } catch { if (active.current) { setCopied(null); setCopyFailed(true) } }
    }
    const update = updatePresentation(state, c, { pending, unavailable })
    const busy = pending || !unavailable && state?.updateStatus === 'checking'
    return h('div', { className: 'totop-plugin-details' },
      h('div', { className: 'totop-plugin-grid' },
        h('div', null,
          h('section', { 'aria-label': c.workflow }, h('h2', null, c.workflow),
            h('ol', { className: 'totop-plugin-steps' }, c.steps.map(([title, description], index) => h('li', { className: 'totop-plugin-step', key: title },
              h('span', { className: 'totop-plugin-step-number', 'aria-hidden': true }, '0' + (index + 1)), h('div', null, h('h3', null, title), h('p', null, description)))))),
          h('section', { className: 'totop-plugin-examples', 'aria-label': c.examples }, h('h2', null, c.examples),
            h('div', { className: 'totop-plugin-prompts' }, c.prompts.map((prompt, index) => h('div', { className: 'totop-plugin-prompt', key: prompt },
              h('p', null, prompt), h('button', { type: 'button', onClick: () => copyPrompt(index), 'aria-label': c.copy + ': ' + prompt }, icon('copy'), copied === index ? c.copied : c.copy)))),
            h('p', { className: 'totop-plugin-copy-feedback', role: 'status', 'aria-live': 'polite' }, copyFailed ? c.copyFailed : copied !== null ? c.copySuccess : c.copyHint))),
        h('aside', { className: 'totop-plugin-info', 'aria-label': c.info }, h('h2', null, c.info),
          h('dl', { className: 'totop-plugin-facts' }, h('div', null, h('dt', null, c.version), h('dd', null, state?.version || (unavailable ? '—' : c.loading))),
            h('div', null, h('dt', null, c.source), h('dd', null, state ? state.source === 'official-release' ? c.official : c.bundled : unavailable ? '—' : c.loading))),
          h('div', { className: 'totop-plugin-update', 'data-tone': update.tone },
            h('div', { role: 'status', 'aria-live': 'polite' }, h('p', { className: 'totop-plugin-update-title' }, update.title), h('p', { className: 'totop-plugin-update-detail' }, update.detail)),
            h('button', { type: 'button', className: 'totop-plugin-check', onClick: check, disabled: busy || !window.totopCreatorPlugin?.check, 'aria-busy': busy }, icon('refresh'), busy ? c.checking : c.check)))),
      h('p', { className: 'totop-plugin-scope' }, c.scope))
  }
  return function Card({ view }) {
    const copy = COPY[useLanguage()]
    return view === 'summary' ? h('span', null, copy.summary) : h(Details, { copy })
  }
}
