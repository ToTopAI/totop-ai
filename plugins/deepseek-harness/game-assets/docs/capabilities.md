# Platform capabilities for game development

Always await SDK initialization. Inspect `getCapabilities()` at runtime and react to `capabilitiesChanged`. A capability's state is `available`, `mock`, `disabled` or `unsupported`; its existence in the API is not proof of production availability.

**Guest storage is a core SDK API. Call storage.load/save for guests even when cloudSave is disabled.** The cloudSave capability describes cloud synchronization, not whether local SDK slots can be used. Do not replace guest SDK saves with a separate localStorage fallback merely because cloudSave is disabled; that would break the host's migration, identity isolation and synchronization workflow. Legacy storage may be used only for an explicit migration or a reported SDK/service failure.

| Need | SDK API | Development and production behavior |
| --- | --- | --- |
| Loading/play state | lifecycle.loadingProgress/ready/gameplayStart/gameplayStop/level | Connect to real game states; host observes ready/start |
| Device/layout | device.getInfo, viewportChanged/deviceChanged | Touch, pointer, orientation, viewport/safe area; fit canvas and controls |
| Player/login | player.get/login, playerChanged | Guests playable; explicit host login; no platform token in game |
| Progress | storage.load/save/list/restore/flush | Local guest saves; authenticated cloud saves when host service is available; revision conflicts require a choice |
| Remote game tuning | config.get | Public JSON; local simulator config vs deployed creator config |
| Custom game events | analytics.track | Flat scalar data; no credentials/PII; local observation vs backend persistence |
| Ads | ads.interstitial/rewarded/banner/hideBanner | Local mocks; real providers disabled in production |
| Purchases | payments.catalog/purchase/restore/consume | Persistent local mock orders; real payments/fulfillment disabled in production |
| Ranking, achievements, tasks, daily reward, social, notifications, cross-promotion, clipboard | Corresponding SDK modules | Contracts only; production services currently disabled/unsupported |

```js
const enabled = name => ['available', 'mock'].includes(ToTopGame.getCapabilities()[name].state);
if (enabled('config')) {
  const config = await ToTopGame.config.get();
  // Validate public tuning data before applying it.
  game.roundSeconds = Math.max(10, Math.min(120, Number(config.roundSeconds) || 30));
}
if (enabled('analytics')) {
  await ToTopGame.analytics.track('round_completed', {score, level:1});
}
// An explicit user button triggers this; do not block normal play on ads.
if (enabled('rewarded')) {
  const result = await ToTopGame.ads.rewarded('extra_life');
  if (result.status === 'completed') game.grantTestOrRealReward(result.mock);
}
```

For creator configuration use authenticated `get_game_sdk_config` and `update_game_sdk_config` with `gameId`, `expectedVersion`, public `config` and a stable `idempotencyKey`. On a version conflict reload/merge rather than overwrite. `get_game_sdk_metrics` exposes aggregate session/event counts, not unique users or revenue. Private keys, server secrets and payment receipts never belong in public config.

Handle errors by code: `HOST_REQUIRED` means run inside the SDK preview/platform host; `HOST_TIMEOUT` means check host origins, SDK binding and asset paths; `CAPABILITY_UNAVAILABLE` means provide a playable fallback; `ACCOUNT_CHANGED` means discard old callbacks and restore the new identity; `SAVE_CONFLICT` means reload or ask for a choice. Do not retry a purchase or login after an ambiguous timeout without checking its state. A saved record with `sync:pending` is not a confirmed cloud write.
