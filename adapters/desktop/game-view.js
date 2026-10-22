export const GAME_COPY = {
  zh: { tab: '当前游戏', subtitle: '当前对话对应的游戏项目', refresh: '刷新', loading: '正在读取游戏信息…', error: '暂时无法读取游戏信息，请重试。', empty: '当前对话尚未关联本地项目。', unavailable: '项目目录不可用，请检查目录是否已移动。',
    coverAlt: '封面', coverPlatform: '平台草稿封面（最近查询）', coverLocal: '本地封面', coverMissing: '暂无封面', coverFailed: '封面加载失败', local: '本地项目', engine: '游戏引擎', sdk: 'SDK 版本', locales: '支持语言', directory: '项目目录', gameId: '平台游戏 ID', unbound: '尚未绑定平台游戏', unknown: '未配置', metadata: '部分项目配置无法读取，请检查配置文件。',
    uploads: '上传记录', uploadsHint: '来自本对话已确认的工具返回；上传完成不代表已投稿或发布。', noUploads: '本对话暂无可核对的上传记录。', version: '版本', purpose: '内容', size: '大小', status: '状态', uploaded: '上传完成', pending: '待确认', game: '游戏包', cover: '封面', source: '源码',
    submissions: '投稿与发布', submissionsHint: '显示客户端最近同步的投稿状态。', noSubmissions: '暂无此游戏的投稿记录。', connected: '账号已连接', disconnected: '客户端尚未连接投稿账号', connectionUnavailable: '客户端状态暂不可用',
    inspect: '复制检查指令', inspectPrompt: '检查当前游戏的项目配置、构建产物和投稿准备情况，先不要上传或提交。', copied: '已复制，可粘贴到对话中。', copyFailed: '复制失败，请稍后重试。',
    readonly: '此页仅查看信息。上传、投稿与发布仍通过对话确认。', snapshot: '页面读取', preview: '本地试玩', running: '正在运行', starting: '正在启动', previewFailed: '启动失败', stopped: '未运行', previewUnknown: '暂时无法获取', noManifest: '未发现 SDK 配置',
    bindingConflict: '游戏绑定不一致：本地配置与平台绑定指向不同游戏。请先核对，勿直接上传或投稿。', localGameId: '本地游戏 ID', recordsUnavailable: '暂时无法获取记录，请刷新重试。', recordsDisconnected: '请先登录并连接客户端账号，再查看记录。', recordsUnbound: '绑定平台游戏后可查看投稿与上传记录。', submissionUncertain: '先查询原投稿结果，确认前请勿重复提交。', submissionFailed: '此次提交未成功，请核对错误后再操作。', versionUnknown: '版本未记录', platformChecked: '平台核对', neverChecked: '尚无平台核对时间', stale: '状态可能已过期，建议查询平台。', reasonUnknown: '未记录具体原因，请查询平台审核与发布结果。', query: '复制查询指令', diagnose: '复制排查指令', reason: '原因',
  },
  en: { tab: 'Current game', subtitle: 'The game project for this conversation', refresh: 'Refresh', loading: 'Reading game information…', error: 'Game information is unavailable. Try again.', empty: 'This conversation has no local project yet.', unavailable: 'The project folder is unavailable. Check whether it has moved.',
    coverAlt: 'cover', coverPlatform: 'Platform draft cover (last queried)', coverLocal: 'Local cover', coverMissing: 'No cover yet', coverFailed: 'Cover unavailable', local: 'Local project', engine: 'Engine', sdk: 'SDK version', locales: 'Languages', directory: 'Project folder', gameId: 'Platform game ID', unbound: 'No platform game linked', unknown: 'Not configured', metadata: 'Some project metadata could not be read. Check the configuration files.',
    uploads: 'Upload history', uploadsHint: 'Confirmed tool results from this conversation. An upload is not a submission or publication.', noUploads: 'No verifiable uploads in this conversation yet.', version: 'Version', purpose: 'Content', size: 'Size', status: 'Status', uploaded: 'Uploaded', pending: 'Unconfirmed', game: 'Game package', cover: 'Cover', source: 'Source',
    submissions: 'Review and publication', submissionsHint: 'The latest submission status synchronized by the app.', noSubmissions: 'No submission records for this game yet.', connected: 'Account connected', disconnected: 'No submission account connected in the app', connectionUnavailable: 'App status unavailable',
    inspect: 'Copy check prompt', inspectPrompt: 'Check this game’s configuration, build and submission readiness. Do not upload or submit yet.', copied: 'Copied. Paste it into the conversation.', copyFailed: 'Could not copy. Try again later.',
    readonly: 'This view is read-only. Confirm uploads, submissions and publication in the conversation.', snapshot: 'View read', preview: 'Local playtest', running: 'Running', starting: 'Starting', previewFailed: 'Failed to start', stopped: 'Stopped', previewUnknown: 'Unavailable', noManifest: 'No SDK configuration found',
    bindingConflict: 'Game IDs conflict: the local configuration and platform binding refer to different games. Check them before uploading or submitting.', localGameId: 'Local game ID', recordsUnavailable: 'Records are unavailable. Refresh to retry.', recordsDisconnected: 'Sign in and connect your app account to view records.', recordsUnbound: 'Link a platform game to view submission and upload records.', submissionUncertain: 'Query the original submission result before submitting again.', submissionFailed: 'This submission failed. Check the error before trying again.', versionUnknown: 'Version not recorded', platformChecked: 'Platform checked', neverChecked: 'No platform check time recorded', stale: 'This status may be outdated. Query the platform.', reasonUnknown: 'No specific reason was recorded. Query review and publication results.', query: 'Copy status prompt', diagnose: 'Copy diagnostic prompt', reason: 'Reason',
  },
}
const STATES = {
  submitting: ['正在提交', 'Submitting'], failed: ['提交失败', 'Submission failed'], uncertain: ['提交结果不确定', 'Submission result uncertain'],
  submitted: ['已投稿', 'Submitted'], authorized: ['已授权，尚未投稿', 'Authorized, not submitted'], pending: ['处理中', 'Processing'], queued: ['排队中', 'Queued'], reviewing: ['审核中', 'In review'],
  manual_review: ['人工审核中', 'Manual review'], approved: ['审核通过，待发布', 'Approved, awaiting publication'], published: ['已发布', 'Published'],
  rejected: ['未通过审核', 'Rejected'], changes_requested: ['需要修改', 'Changes requested'], publication_failed: ['发布失败', 'Publication failed'], deploy_failed: ['部署失败', 'Deployment failed'], superseded: ['已被新版替代', 'Superseded'],
}
export function statusLabel(status, zh) { return STATES[status]?.[zh ? 0 : 1] || (zh ? '状态待确认' : 'Status unconfirmed') }
const REASONS = {
  developer_submission_conflict: ['已有进行中的投稿或投稿版本冲突。', 'An existing submission or version conflicts with this request.'],
  developer_version_conflict: ['游戏版本已变化，需要重新核对草稿版本。', 'The game version changed. Check the current draft version.'],
  developer_upload_version_conflict: ['上传版本号已被使用。', 'This upload version is already in use.'],
  developer_upload_incomplete: ['游戏材料尚未完成上传确认。', 'The upload has not been confirmed complete.'],
  developer_package_invalid: ['游戏包未通过平台校验。', 'The game package failed platform validation.'],
  developer_creator_profile_required: ['请先完善创作者资料。', 'Complete the creator profile first.'],
  developer_unavailable: ['平台服务暂时不可用，原请求结果需要核对。', 'The platform is unavailable. Check the original request result.'],
  network_timeout: ['连接超时，原请求结果尚未确认。', 'The connection timed out. The original result is unconfirmed.'],
  publication_authorization_required: ['投稿授权需要重新确认。', 'Submission authorization needs to be renewed.'],
  publication_account_mismatch: ['当前登录账号与投稿账号不一致。', 'The signed-in and submission accounts do not match.'],
  creator_context_changed: ['操作期间账号或项目已变化。', 'The account or project changed during the operation.'],
  insufficient_scope: ['当前授权缺少所需权限。', 'The current authorization lacks the required permission.'],
}
export function reasonLabel(code, zh) {
  if (REASONS[code]) return REASONS[code][zh ? 0 : 1]
  if (/^developer_.*quota_exceeded$/.test(code || '')) return zh ? '平台额度已达上限，请核对账号额度。' : 'A platform quota was reached. Check the account limits.'
  return null
}
export function platformFreshness(task, now) {
  const checked = Date.parse(task.platformCheckedAt)
  if (!Number.isFinite(checked) || !Number.isFinite(now) || checked > now + 60000) return 'unknown'
  return now - checked > 300000 ? 'stale' : 'fresh'
}
export function queryPrompt(gameId, task, zh) {
  const target = task.releaseId ? `releaseId=${task.releaseId}` : zh ? '原投稿请求（尚无 releaseId）' : 'the original submission (no releaseId recorded)'
  return zh ? `只读核对当前项目的 ToTop 游戏 gameId=${gameId}，${target}。先确认账号和项目绑定一致；查询原投稿、审核报告和发布状态，并说明具体失败原因。没有 releaseId 时先从该游戏现有记录定位原请求，不要新建投稿。不要上传、重试写操作、重新提交或发布，不要切换项目。`
    : `Read-only check for the current ToTop project, gameId=${gameId}, ${target}. Verify the account and project binding first. Query the original submission, review report and publication status, and explain any failure. If no releaseId exists, locate the original request in the game's existing records first. Do not upload, retry writes, resubmit, publish or switch projects.`
}
export function sizeLabel(bytes) { return Number.isSafeInteger(bytes) && bytes >= 0 ? bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB` : '—' }
export function validateGameState(value, sessionId) {
  if (!value || value.sessionId !== sessionId || !['ready', 'no_project', 'project_unavailable'].includes(value.state)) throw Error('game_status_invalid')
  if (value.state === 'ready' && (!value.project || typeof value.project.name !== 'string' || typeof value.project.directory !== 'string' || !Array.isArray(value.uploads) || !Array.isArray(value.submissions))) throw Error('game_status_invalid')
  return value
}

const PREPARATION_COPY = {
  zh: {
    title: '投稿准备', hint: '本地检查与本对话的平台查询记录；正式投稿前仍需完整检查和独立确认。', observed: '已发现', attention: '需处理', pending: '待核对',
    labels: { binding: '账号与绑定', config: '项目配置', build: '构建入口', cover: '平台封面', version: '投稿版本', declarations: '外部服务声明' },
    details: { binding_conflict: '本地与平台游戏 ID 不一致，请先核对。', creator_incomplete: '账号已连接，请先完善创作者资料。', binding_present: '当前账号已绑定此游戏。', binding_missing: '请先关联平台游戏。', account_missing: '请先登录并连接账号。', account_unknown: '客户端连接状态暂不可用。', config_invalid: '部分配置读取失败，请检查配置文件。', config_read: '已读取 SDK 配置，完整校验仍需执行。', config_optional: '未发现 SDK 配置；静态游戏可不接入，投稿时核对平台要求。', entry_present: '发现入口：{value}；尚未执行构建或试玩验证。', entry_missing: '未发现构建入口，请导出游戏并确认构建目录。', entry_empty: '入口为空或类型不正确，请重新导出。', entry_unsafe: '构建目录或入口不安全，请使用项目内的普通目录和文件。', entry_unavailable: '暂时无法检查构建入口。', cover_present: '平台草稿已配置封面。', cover_missing: '平台草稿未配置封面，请补充。', cover_unknown: '封面记录无法确认，请查询当前草稿。', draft_stale: '草稿查询记录已过期或时间未确认，请重新查询。', draft_unknown: '本对话尚无可核对的草稿查询结果。', version_previous: '最近上传版本 {value}；本次投稿版本仍需确认。', version_confirm: '本次版本号和更新说明尚需确认。', declarations_unknown: '尚无明确声明，请核对外部服务与数据用途。', declarations_none: '该次草稿查询明确声明未使用外部服务。', declarations_present: '该次草稿查询已声明 {value} 项外部服务。' },
    inspect: '复制准备检查指令', prompt: '只读检查当前游戏的投稿准备情况：先核对账号与项目绑定，再查询最新平台要求及当前草稿，核对封面、外部服务与数据用途声明。检查实际构建目录的入口和配置，说明缺项；本次版本号、更新说明及声明有缺失或不明确时向我确认，不要猜测。不要运行构建或安装命令，不要修改文件或草稿，不要上传、提交或发布。',
  },
  en: {
    title: 'Submission preparation', hint: 'Local observations and platform query records from this conversation. Full checks and separate confirmation are still required before submission.', observed: 'Found', attention: 'Action needed', pending: 'To verify',
    labels: { binding: 'Account and binding', config: 'Project configuration', build: 'Build entry', cover: 'Platform cover', version: 'Release version', declarations: 'External services' },
    details: { binding_conflict: 'Local and platform game IDs differ. Check the binding first.', creator_incomplete: 'Account connected. Complete the creator profile first.', binding_present: 'This account is linked to this game.', binding_missing: 'Link a platform game first.', account_missing: 'Sign in and connect the account first.', account_unknown: 'App connection status is unavailable.', config_invalid: 'Some configuration could not be read. Check the files.', config_read: 'SDK configuration read. Full validation is still required.', config_optional: 'No SDK configuration found. Static games may omit it; check platform requirements before submission.', entry_present: 'Entry found: {value}. Build and gameplay have not been verified.', entry_missing: 'No build entry found. Export the game and confirm its build folder.', entry_empty: 'The entry is empty or has the wrong type. Export it again.', entry_unsafe: 'Unsafe build path or entry. Use regular files and folders inside the project.', entry_unavailable: 'The build entry is unavailable.', cover_present: 'The platform draft has a cover.', cover_missing: 'Add a cover to the platform draft.', cover_unknown: 'The cover cannot be verified. Query the current draft.', draft_stale: 'The draft query is outdated or its time is unknown. Query it again.', draft_unknown: 'No verifiable draft query result in this conversation yet.', version_previous: 'Latest uploaded version: {value}. Confirm the version for this submission.', version_confirm: 'Confirm this release version and release notes.', declarations_unknown: 'Verify external services and their data use declarations.', declarations_none: 'This draft query explicitly declared no external services.', declarations_present: 'This draft query declared {value} external services.' },
    inspect: 'Copy preparation prompt', prompt: 'Read-only check of this game’s submission readiness. Verify the account and project binding, then query current platform requirements and the draft. Check the cover and external service/data use declarations. Inspect the actual build entry and configuration and list missing items. Ask me to confirm the release version, release notes or declarations if missing or unclear; do not guess. Do not build, install, modify files or the draft, upload, submit or publish.',
  },
}
export function preparationDetail(item, zh) { return (PREPARATION_COPY[zh ? 'zh' : 'en'].details[item.detail] || (zh ? '待检查' : 'Needs verification')).replace('{value}', String(item.value ?? '—')) }

function gameIcon(React, name) {
  const paths = { refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M6.1 7a7 7 0 0 1 11.5-2L20 8', 'M4 16l2.4 3A7 7 0 0 0 18 17'], copy: ['M9 9h10v12H9z', 'M5 15H3V3h10v2'], chevron: ['m6 9 6 6 6-6'], image: ['M3 4h18v16H3z', 'm3 16 5-5 4 4 3-3 6 6'] }
  return React.createElement('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false, className: `totop-game-icon totop-game-icon-${name}` }, ...paths[name].map((d, i) => React.createElement('path', { key: i, d })))
}

export function createGameCover(React) {
  const h = React.createElement
  return function GameCover({ cover, sessionId, name, copy }) {
    const [failed, setFailed] = React.useState(0)
    const sources = []
    if (typeof cover?.platformUrl === 'string' && /^https:\/\/api\.totop\.ai\/v2\/release-media\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(cover.platformUrl)) sources.push({ url: cover.platformUrl, caption: copy.coverPlatform })
    if (cover?.localUrl === `/totop-plugin/current-game/cover?sessionId=${encodeURIComponent(sessionId)}`) sources.push({ url: cover.localUrl, caption: copy.coverLocal })
    const source = sources[failed]
    return h('figure', { className: 'totop-game-cover' },
      source ? h('img', { src: source.url, alt: `${name} ${copy.coverAlt}`, className: 'totop-game-cover-image', decoding: 'async', referrerPolicy: 'no-referrer', onError: () => setFailed(n => Math.min(n + 1, sources.length)) })
        : h('div', { className: 'totop-game-cover-placeholder', role: 'img', 'aria-label': sources.length ? copy.coverFailed : copy.coverMissing },
          gameIcon(React, 'image'), h('span', null, sources.length ? copy.coverFailed : copy.coverMissing)),
      source && h('figcaption', { className: 'totop-game-muted' }, source.caption))
  }
}

export const GAME_CSS = `
.totop-game-view{--tg-bg:#12141b;--tg-surface:#191d27;--tg-raised:#222735;--tg-border:#343d4f;--tg-text:#f5f7fa;--tg-muted:#a7b0c2;--tg-gold:#ffcb3d;--tg-success:#81d8a6;box-sizing:border-box;min-height:0;height:100%;overflow:auto;padding:24px 28px 180px;background:var(--tg-bg);color:var(--tg-text);font:14px/1.6 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif;container-type:inline-size;color-scheme:dark}
.totop-game-view *{box-sizing:border-box}.totop-game-content{width:100%;max-width:1120px;margin:0 auto}.totop-game-view :is(h1,h2,p,dl,dd,figure){margin:0}.totop-game-icon{flex:none;vertical-align:middle}
.totop-game-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:20px}.totop-game-header h1{font-size:26px;line-height:1.3;letter-spacing:-.025em;font-weight:700}.totop-game-header p{margin-top:5px!important}.totop-game-muted{color:var(--tg-muted);font-size:12px;line-height:1.7}
.totop-game-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:8px 14px;border:1px solid var(--tg-border);border-radius:10px;background:transparent;color:var(--tg-text);box-shadow:inset 0 1px 0 #ffffff06;font-family:inherit;font-size:12px;line-height:1.5;font-weight:600;cursor:pointer;white-space:nowrap;transition:background-color 160ms,border-color 160ms}.totop-game-button:hover{background:var(--tg-raised);border-color:#77663c}.totop-game-button:focus-visible,.totop-game-preparation summary:focus-visible{outline:2px solid var(--tg-gold);outline-offset:3px}.totop-game-button:disabled{opacity:.5;cursor:default}.totop-game-button-primary{background:var(--tg-gold);color:#16120a;border-color:var(--tg-gold);box-shadow:inset 0 1px 0 #ffffff50,0 2px 6px #0000001f}.totop-game-button-primary:hover{background:#ffda70;border-color:#ffda70}
.totop-game-summary,.totop-game-preparation,.totop-game-panels>section{border:1px solid var(--tg-border);border-radius:12px;background:linear-gradient(180deg,#ffffff03,transparent 160px),var(--tg-surface);box-shadow:inset 0 1px 0 #ffffff05,0 4px 16px #00000014}
.totop-game-summary{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr);gap:24px;padding:22px}.totop-game-summary-body{min-width:0;align-self:center}.totop-game-summary-top h2{font-size:32px;line-height:1.2;letter-spacing:-.03em;font-weight:750;margin-bottom:12px}.totop-game-directory-label{font-size:12px;color:var(--tg-muted)}.totop-game-path{font-size:12px;color:#c4cbda;line-height:1.7;overflow-wrap:anywhere}.totop-game-summary-top .totop-game-button{margin-top:12px}
.totop-game-cover{min-width:0;align-self:center}.totop-game-cover-image,.totop-game-cover-placeholder{display:block;width:100%;aspect-ratio:16/9;border-radius:10px;background:#11151d;object-fit:contain}.totop-game-cover-placeholder{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--tg-muted);font-size:12px;border:1px dashed var(--tg-border)}.totop-game-cover-placeholder svg{width:28px;height:28px;opacity:.65}.totop-game-cover figcaption{font-size:11px;margin-top:6px;line-height:1.5;color:var(--tg-muted)}
.totop-game-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px!important;padding-block:12px;border-top:1px solid var(--tg-border);border-bottom:1px solid var(--tg-border)}.totop-game-facts>div+div{padding-inline-start:12px;border-inline-start:1px solid var(--tg-border)}.totop-game-facts dt{font-size:11px;color:var(--tg-muted)}.totop-game-facts dd{margin-top:3px;font-size:13px;font-weight:550;overflow-wrap:anywhere}.totop-game-id{margin-top:12px!important;font-size:11px;line-height:1.8;color:var(--tg-muted);overflow-wrap:anywhere}.totop-game-id code{display:block;color:#c4cbda;font:11px/1.8 ui-monospace,SFMono-Regular,Consolas,monospace}
.totop-game-warning{color:#ffda70;font-size:12px;line-height:1.7;margin-top:8px!important}.totop-game-feedback{font-size:12px;color:var(--tg-success);margin-top:10px!important}.totop-game-empty{padding:20px 0;color:var(--tg-muted);font-size:13px}.totop-game-content>p.totop-game-empty{padding:24px;border:1px dashed var(--tg-border);border-radius:12px}
.totop-game-preparation{margin-top:18px;padding:18px 20px}.totop-game-preparation summary{display:flex;align-items:center;gap:12px;cursor:pointer;list-style:none}.totop-game-preparation summary::-webkit-details-marker{display:none}.totop-game-preparation summary h2{font-size:18px;line-height:1.5;font-weight:650}.totop-game-preparation summary>.totop-game-button{margin-inline-start:auto}.totop-game-preparation summary>.totop-game-icon{color:var(--tg-muted);transition:transform 160ms}.totop-game-preparation[open] summary>.totop-game-icon{transform:rotate(180deg)}.totop-game-preparation>p{margin-top:10px!important;font-size:11px}.totop-game-preparation ul{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 20px;border-top:1px solid var(--tg-border)}.totop-game-preparation li{min-width:0;padding:12px 0 12px 18px;border-bottom:1px solid #ffffff0c;position:relative;overflow-wrap:anywhere}.totop-game-preparation li::before{content:'';position:absolute;top:19px;left:0;width:7px;height:7px;border-radius:50%;background:var(--tg-gold)}.totop-game-preparation li[data-status=observed]::before{background:var(--tg-success)}.totop-game-preparation li[data-status=attention]::before{background:#ffb5b5}.totop-game-preparation li .totop-game-muted{font-size:11px;line-height:1.7}.totop-game-preparation-label{display:flex;align-items:baseline;gap:10px;margin-bottom:4px;font-size:12px}.totop-game-preparation-label strong{font-weight:600}.totop-game-preparation-label>span{font-size:11px;color:var(--tg-muted)}
.totop-game-panels{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:18px}.totop-game-panels>section{min-width:0;padding:18px 20px}.totop-game-section h2{font-size:18px;font-weight:650;line-height:1.5;margin-bottom:5px}.totop-game-section>p{font-size:11px}.totop-game-table-wrap{overflow:auto;margin-top:14px}.totop-game-table{border-collapse:separate;border-spacing:0;width:100%;text-align:left;font-size:12px;white-space:nowrap}.totop-game-table th{color:var(--tg-muted);font-size:11px;font-weight:500;background:var(--tg-raised);border-top:1px solid var(--tg-border)}.totop-game-table th:first-child{border-radius:8px 0 0 8px;border-left:1px solid var(--tg-border)}.totop-game-table th:last-child{border-radius:0 8px 8px 0;border-right:1px solid var(--tg-border)}.totop-game-table :is(th,td){padding:10px 12px;border-bottom:1px solid var(--tg-border)}.totop-game-table td:first-child{padding-left:12px}.totop-game-completed{color:var(--tg-success)}.totop-game-table .totop-game-completed::before,.totop-game-task-status::before{content:'';display:inline-block;width:6px;height:6px;vertical-align:middle;margin-inline-end:7px;border-radius:50%;background:currentColor}
.totop-game-task{padding:14px 0;border-bottom:1px solid var(--tg-border);font-size:12px}.totop-game-task:last-child{border-bottom:0;padding-bottom:0}.totop-game-task-facts{display:grid;gap:7px}.totop-game-task-facts>div{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:baseline}.totop-game-task-facts dt{color:var(--tg-muted);font-size:11px}.totop-game-task-facts dd{min-width:0;overflow-wrap:anywhere;color:#c4cbda}.totop-game-task-status{font-weight:600;color:var(--tg-gold)}.totop-game-task-status-success{color:var(--tg-success)}.totop-game-status-warning{color:#ffda70}.totop-game-status-help{max-width:100%}.totop-game-task code{font:10px/1.8 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--tg-muted);overflow-wrap:anywhere}.totop-game-record-meta{margin-top:12px!important;padding-top:12px;border-top:1px solid #ffffff0c}.totop-game-record-meta .totop-game-button{margin-top:10px;min-height:34px;padding:6px 10px;font-size:11px}.totop-game-version{font-size:12px;color:#c4cbda}
.totop-game-footer{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:14px;color:var(--tg-muted);font-size:10px;line-height:1.7}
@container(max-width:900px){.totop-game-preparation ul{grid-template-columns:repeat(2,minmax(0,1fr))}.totop-game-summary{grid-template-columns:minmax(200px,.9fr) minmax(0,1.1fr);gap:20px}.totop-game-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.totop-game-facts>div:nth-child(3){border:0;padding-inline-start:0}.totop-game-panels{grid-template-columns:minmax(0,1fr)}}
@container(max-width:620px){.totop-game-summary{grid-template-columns:minmax(0,1fr);padding:16px;gap:16px}.totop-game-summary-top h2{font-size:27px}.totop-game-header h1{font-size:22px}.totop-game-preparation{padding:16px}.totop-game-preparation summary{flex-wrap:wrap;gap:8px}.totop-game-preparation summary h2{font-size:16px}.totop-game-preparation summary>.totop-game-button{order:4;width:100%;margin-inline-start:0}.totop-game-preparation summary>.totop-game-icon{margin-inline-start:auto}.totop-game-preparation ul{grid-template-columns:minmax(0,1fr)}.totop-game-panels>section{padding:16px}.totop-game-header{gap:12px}.totop-game-button{padding:8px 11px}.totop-game-header .totop-game-button{min-height:36px}.totop-game-task-facts>div{grid-template-columns:64px minmax(0,1fr)}}
@media(prefers-reduced-motion:reduce){.totop-game-view *{transition:none!important}}
`

export function createGameView(React) {
  const h = React.createElement, Cover = createGameCover(React)
  return function GameView({ sessionId, useSession, readGame }) {
    const running = useSession(s => s.running)
    const [lang, setLang] = React.useState(() => document.documentElement.lang)
    const [state, setState] = React.useState(null), [error, setError] = React.useState(false), [loading, setLoading] = React.useState(true), [revision, setRevision] = React.useState(0), [feedback, setFeedback] = React.useState('')
    const zh = lang.toLowerCase().startsWith('zh'), c = GAME_COPY[zh ? 'zh' : 'en'], p = PREPARATION_COPY[zh ? 'zh' : 'en']
    React.useEffect(() => {
      const observer = new MutationObserver(() => { setLang(document.documentElement.lang); setFeedback('') })
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); return () => observer.disconnect()
    }, [])
    React.useEffect(() => {
      let disposed = false, timer, controller, inFlight = false, failures = 0
      async function load() {
        if (disposed || inFlight) return
        clearTimeout(timer)
        if (document.visibilityState === 'hidden') { timer = setTimeout(load, 15000); return }
        controller = new AbortController(); inFlight = true; setLoading(true)
        try { const next = validateGameState(await readGame(sessionId, controller.signal), sessionId); if (!disposed) { setState(next); setError(false); failures = 0 } }
        catch { if (!disposed) { setError(true); setState(null); failures++ } }
        finally { inFlight = false; if (!disposed) { setLoading(false); timer = setTimeout(load, Math.min(15000 * 2 ** Math.max(0, failures - 1), 60000)) } }
      }
      // A new session must never paint the previous game's data while its request is pending.
      setState(previous => previous?.sessionId === sessionId ? previous : null); setError(false); void load()
      const visible = () => { if (document.visibilityState !== 'hidden') void load() }
      document.addEventListener?.('visibilitychange', visible)
      return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener?.('visibilitychange', visible) }
    }, [sessionId, running, revision, readGame])
    const time = value => { try { return value ? new Date(value).toLocaleString(zh ? 'zh-CN' : 'en-US') : '—' } catch { return '—' } }
    const copy = async prompt => { try { await navigator.clipboard.writeText(prompt); setFeedback(c.copied) } catch { setFeedback(c.copyFailed) } }
    const fact = (label, value) => h('div', { key: label }, h('dt', null, label), h('dd', null, value || c.unknown))
    const refresh = h('button', { type: 'button', className: 'totop-game-button', disabled: loading, onClick: () => setRevision(n => n + 1), 'aria-label': c.refresh }, gameIcon(React, 'refresh'), c.refresh)
    const visible = state?.sessionId === sessionId ? state : null
    const recordsEmpty = fallback => visible?.recordsState === 'ready' ? fallback : visible?.recordsState === 'disconnected' ? c.recordsDisconnected : visible?.recordsState === 'unbound' ? c.recordsUnbound : c.recordsUnavailable
    return h('div', { className: 'totop-game-view' }, h('div', { className: 'totop-game-content', 'aria-busy': loading },
      h('header', { className: 'totop-game-header' }, h('div', null, h('h1', null, c.tab), h('p', { className: 'totop-game-muted' }, c.subtitle)), refresh),
      error ? h('p', { role: 'alert', className: 'totop-game-warning' }, c.error) : !visible ? h('p', { role: 'status', className: 'totop-game-empty' }, c.loading) : visible.state !== 'ready' ? h('p', { className: 'totop-game-empty' }, visible.state === 'no_project' ? c.empty : c.unavailable) : h(React.Fragment, null,
        h('section', { className: 'totop-game-summary' },
          h(Cover, { key: JSON.stringify([sessionId, visible.gameId, visible.cover, revision]), sessionId, cover: visible.cover, name: visible.project.name, copy: c }),
          h('div', { className: 'totop-game-summary-body' },
            h('div', { className: 'totop-game-summary-top' }, h('h2', null, visible.project.name), h('p', { className: 'totop-game-directory-label' }, c.directory), h('p', { className: 'totop-game-path', title: visible.project.directory }, visible.project.directory),
              h('button', { type: 'button', className: 'totop-game-button totop-game-button-primary', onClick: () => copy(c.inspectPrompt) }, gameIcon(React, 'copy'), c.inspect)),
            h('dl', { className: 'totop-game-facts' }, fact(c.engine, visible.project.engine?.toUpperCase()), fact(c.sdk, visible.project.sdkVersion), fact(c.locales, visible.project.locales?.join(' / ')), fact(c.preview, ({ running: c.running, stopped: c.stopped, starting: c.starting, failed: c.previewFailed })[visible.preview] || c.previewUnknown)),
            h('p', { className: 'totop-game-id' }, c.gameId, h('code', null, visible.gameId || c.unbound)),
            visible.bindingConflict && h('div', { role: 'alert', className: 'totop-game-warning' }, c.bindingConflict, h('p', { className: 'totop-game-id' }, c.localGameId, h('code', null, visible.localGameId))),
            !visible.project.manifestPresent && h('p', { className: 'totop-game-warning' }, c.noManifest), visible.metadataError && h('p', { className: 'totop-game-warning' }, c.metadata),
            feedback && h('p', { role: 'status', className: 'totop-game-feedback' }, feedback))),
        visible.preparation?.items?.length > 0 && h('details', { className: 'totop-game-preparation', open: true },
          h('summary', null, h('h2', null, p.title), h('span', { className: 'totop-game-muted' }, ' · ', visible.preparation.items.filter(item => item.status === 'attention').length, zh ? ' 项需处理' : ' need action', ' · ', visible.preparation.items.filter(item => item.status === 'pending').length, zh ? ' 项待核对' : ' to verify'), h('button', { type: 'button', className: 'totop-game-button', onClick: event => { event?.preventDefault(); event?.stopPropagation(); void copy(p.prompt) } }, gameIcon(React, 'copy'), p.inspect), gameIcon(React, 'chevron')),
          h('p', { className: 'totop-game-muted' }, p.hint),
          h('ul', null, ...visible.preparation.items.map(item => h('li', { key: item.id, 'data-status': item.status },
            h('div', { className: 'totop-game-preparation-label' }, h('strong', null, p.labels[item.id] || item.id), h('span', { className: item.status === 'attention' ? 'totop-game-status-warning' : item.status === 'observed' ? 'totop-game-completed' : 'totop-game-muted' }, p[item.status] || p.pending)),
            h('p', { className: 'totop-game-muted' }, preparationDetail(item, zh)), item.observedAt != null && h('p', { className: 'totop-game-muted' }, c.platformChecked, ' ', time(item.observedAt)))))),
        h('div', { className: 'totop-game-panels' },
        h('section', { className: 'totop-game-section' }, h('h2', null, c.uploads), h('p', { className: 'totop-game-muted' }, c.uploadsHint),
          visible.uploads.length ? h('div', { className: 'totop-game-table-wrap' }, h('table', { className: 'totop-game-table' }, h('thead', null, h('tr', null, ...[c.version, c.purpose, c.size, c.status].map(label => h('th', { scope: 'col', key: label }, label)))), h('tbody', null, ...visible.uploads.map(row => h('tr', { key: row.uploadId }, h('td', null, row.version || '—'), h('td', null, c[row.purpose] || c.game), h('td', null, sizeLabel(row.bytes)), h('td', { className: row.completed ? 'totop-game-completed' : '' }, row.completed ? c.uploaded : c.pending)))))) : h('p', { className: 'totop-game-empty' }, recordsEmpty(c.noUploads))),
        h('section', { className: 'totop-game-section' }, h('h2', null, c.submissions), h('p', { className: 'totop-game-muted' }, c.submissionsHint, ' · ', visible.connection === 'connected' ? c.connected : visible.connection === 'disconnected' ? c.disconnected : c.connectionUnavailable),
          visible.submissions.length ? visible.submissions.map((task, i) => {
            const failure = ['uncertain', 'failed', 'rejected', 'changes_requested', 'publication_failed', 'deploy_failed'].includes(task.status)
            const freshness = platformFreshness(task, visible.capturedAt)
            const reason = reasonLabel(task.errorCode, zh)
            const row = (label, value) => h('div', { key: label }, h('dt', null, label), h('dd', null, value))
            return h('div', { className: 'totop-game-task', key: task.releaseId || i },
              h('dl', { className: 'totop-game-task-facts' },
                row(c.status, h('strong', { className: `totop-game-task-status${failure ? ' totop-game-status-warning' : task.status === 'published' ? ' totop-game-task-status-success' : ''}` }, statusLabel(task.status, zh))),
                row(c.version, task.version || c.versionUnknown),
                task.releaseId && row(zh ? '投稿 ID' : 'Submission ID', h('code', null, task.releaseId)),
                row(c.platformChecked, freshness === 'unknown' ? c.neverChecked : time(task.platformCheckedAt))),
              failure && h('p', { className: 'totop-game-warning totop-game-status-help' }, reason || c.reasonUnknown),
              task.status === 'uncertain' && h('p', { className: 'totop-game-warning totop-game-status-help' }, c.submissionUncertain),
              freshness === 'stale' && h('p', { className: 'totop-game-warning' }, c.stale),
              visible.recordsState === 'ready' && !visible.bindingConflict && h('div', { className: 'totop-game-record-meta' }, h('button', { type: 'button', className: 'totop-game-button', onClick: () => copy(queryPrompt(visible.gameId, task, zh)) }, gameIcon(React, 'copy'), failure ? c.diagnose : c.query)))
          }) : h('p', { className: 'totop-game-empty' }, recordsEmpty(c.noSubmissions)))),
        h('footer', { className: 'totop-game-footer' }, h('span', null, c.readonly), h('span', null, c.snapshot, ' ', time(visible.capturedAt))))))
  }
}
