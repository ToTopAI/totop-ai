import { lstat } from 'node:fs/promises'
import { resolve, isAbsolute } from 'node:path'
import { platformCoverUrl } from './cover-server.mjs'

// Check only known entry paths. Do not execute scripts, enumerate a project tree,
// inspect arbitrary cover paths or follow linked files/directories.
async function entry(root, directory, signal) {
  if (process.platform === 'win32' && typeof directory === 'string') directory = directory.replaceAll('\\', '/')
  if (typeof directory !== 'string' || directory.length > 1024 || isAbsolute(directory) || /[\\\x00-\x1f]/.test(directory) || directory.split('/').includes('..')) return { status: 'attention', detail: 'entry_unsafe' }
  const parts = [...directory.split('/').filter(part => part && part !== '.'), 'index.html']
  let current = root
  try {
    for (let i = 0; i < parts.length; i++) {
      signal.throwIfAborted(); current = resolve(current, parts[i])
      const info = await lstat(current)
      if (info.isSymbolicLink()) return { status: 'attention', detail: 'entry_unsafe' }
      if (i < parts.length - 1 && !info.isDirectory()) return { status: 'attention', detail: 'entry_missing' }
      if (i === parts.length - 1) return info.isFile() && info.size > 0 ? { status: 'observed', detail: 'entry_present', value: parts.join('/') } : { status: 'attention', detail: 'entry_empty' }
    }
  } catch (error) {
    if (signal.aborted) throw error
    return { status: error.code === 'ENOENT' ? 'attention' : 'pending', detail: error.code === 'ENOENT' ? 'entry_missing' : 'entry_unavailable' }
  }
}

export async function inspectBuildEntry(root, preview, signal) {
  if (preview?.mode === 'static' && typeof preview.buildDirectory === 'string') return entry(root, preview.buildDirectory, signal)
  const dist = await entry(root, 'dist', signal)
  // A broken/linked dist is not silently replaced by a potentially different root game.
  if (dist.detail !== 'entry_missing') return dist
  return entry(root, '.', signal)
}

export function draftEvidence(value, time) {
  const candidate = value.candidate
  if (!candidate || typeof candidate !== 'object') return null
  const services = value.externalServices
  const declared = Array.isArray(services) && services.length <= 32 && services.every(service => service && typeof service.origin === 'string' && /^https:\/\//.test(service.origin) && typeof service.purpose === 'string' && service.purpose.trim() && Array.isArray(service.dataCollected) && service.dataCollected.every(item => typeof item === 'string') && typeof service.authentication === 'boolean' && typeof service.payments === 'boolean')
  return {
    cover: candidate.cover === null ? 'missing' : platformCoverUrl(candidate.cover?.url) ? 'present' : 'unknown',
    coverUrl: platformCoverUrl(candidate.cover?.url),
    declarations: declared ? services.length : null,
    observedAt: typeof time === 'number' && Number.isFinite(time) ? time : null,
  }
}

export function preparationOverview({ manifest, metadataError, recordsState, bindingConflict, creatorReady, build, draft, uploads, now }) {
  const item = (id, status, detail, extra = {}) => ({ id, status, detail, ...extra })
  const current = draft?.observedAt != null && draft.observedAt <= now + 60000 && now - draft.observedAt <= 300000
  const platform = (id, detail, value) => !current ? item(id, 'pending', draft ? 'draft_stale' : 'draft_unknown', { observedAt: draft?.observedAt ?? null }) : item(id, detail === 'cover_missing' ? 'attention' : detail === 'cover_unknown' || detail === 'declarations_unknown' ? 'pending' : 'observed', detail, { value, observedAt: draft.observedAt })
  const latestVersion = uploads.find(upload => upload.purpose === 'game' && upload.completed && upload.version)?.version
  return { items: [
    item('binding', bindingConflict ? 'attention' : recordsState === 'ready' ? creatorReady === false ? 'attention' : 'observed' : recordsState === 'unbound' || recordsState === 'disconnected' ? 'attention' : 'pending', bindingConflict ? 'binding_conflict' : recordsState === 'ready' ? creatorReady === false ? 'creator_incomplete' : 'binding_present' : recordsState === 'unbound' ? 'binding_missing' : recordsState === 'disconnected' ? 'account_missing' : 'account_unknown'),
    item('config', metadataError ? 'attention' : manifest ? 'observed' : 'pending', metadataError ? 'config_invalid' : manifest ? 'config_read' : 'config_optional'),
    item('build', build.status, build.detail, { value: build.value }),
    platform('cover', draft?.cover === 'present' ? 'cover_present' : draft?.cover === 'missing' ? 'cover_missing' : 'cover_unknown'),
    item('version', 'pending', latestVersion ? 'version_previous' : 'version_confirm', { value: latestVersion ?? null }),
    platform('declarations', draft?.declarations === null || draft?.declarations === undefined ? 'declarations_unknown' : draft.declarations === 0 ? 'declarations_none' : 'declarations_present', draft?.declarations ?? null),
  ] }
}
