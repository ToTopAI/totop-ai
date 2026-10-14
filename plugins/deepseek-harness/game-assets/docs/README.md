# ToTop Game SDK 1.0.0

The game SDK supplies a single API to HTML5/TypeScript, Unity WebGL and Godot 4 Web games. The host owns account UI, platform credentials and cloud requests. `@totop/platform-sdk` 1.1.2 remains the standalone OAuth/cloud-save API for its existing consumers.

## Getting started

Load the fixed `totop-game.global.js` before game code, or import `ToTopGame` from `@totop/game-sdk`. Put `totop.game.json` next to the exported root `index.html`. Bind `gameId` to the existing ToTop game UUID when preparing publication. A local unbound project may omit it.

```js
await ToTopGame.init({ gameId: manifest.gameId, hostOrigins: ['https://totop.ai'] });
ToTopGame.on('pauseChanged', paused => game.setPaused(paused));
ToTopGame.on('audioChanged', enabled => game.setPlatformAudioEnabled(enabled));
const save = await ToTopGame.storage.load(0);
game.restore(save?.payload ?? { level: 1 });
await game.loadFirstPlayableScene();
await ToTopGame.lifecycle.ready();
// Call at actual gameplay entry and resume, not during loading/menu screens.
await ToTopGame.lifecycle.gameplayStart();
```

`hostOrigins` must be exact HTTPS origins. HTTP is accepted only for loopback development. Never use `*`. Local projects run inside the supplied developer host; opening game HTML by itself has no platform host.

## Environments and capabilities

`getContext()` returns game/release/environment, language, server time, player, pause/audio state, viewport and capabilities. Each capability is `available`, `mock`, `disabled` or `unsupported`. Initialize before any API call. Unity/Godot wrappers gate calls on initialized state and keep callback references alive until completion.

Local/preview monetization is explicitly mocked. Production ads/payments return `CAPABILITY_UNAVAILABLE` until verified providers exist; mock success never creates a production entitlement. Future module contracts are exported with disabled capabilities, not promised as live services.

## Lifecycle and events

`lifecycle.loadingProgress(0..100)`, `ready()`, `gameplayStart()`, `gameplayStop()`, `level('started'|'completed'|'failed', id)`. Ready means the first scene is actually interactable. Start/stop describe the game's own play state. Host background, overlays and ads provide additional pause reasons. Preserve the user's mute preference. Subscribe to `pauseChanged`, `audioChanged`, `playerChanged`, `capabilitiesChanged`, `viewportChanged`; unsubscribe/dispose on teardown.

## Player and saves

`player.get()` returns null for guests or `{id,nickname,avatarUrl}`. `id` is platform_user_id, not Supabase auth.uid. `player.login()` requests host UI, requires user action, and never signs the platform out globally.

`storage.load(slot)`, `save(slot,payload,{schemaVersion,baseRevision})`, `list()`, `restore(slot,'cloud'|'guest',baseRevision)`, `flush()`. Slots are 0..9; payload is a JSON object no larger than 1 MiB. Preserve schemaVersion and migrate your own data explicitly. SaveRecord includes revision, updatedAt and `sync: local|pending|synced`; local success does not imply cloud success.

Guests save locally in host IndexedDB. Logged-in identities use isolated caches and platform cloud saves. Empty cloud slots may inherit guest progress. Existing cloud wins by default; guest progress remains available for explicit restore. Account switches reject in-flight responses. `SAVE_CONFLICT` requires reloading/choosing a version, not unconditional retries. Offline writes retain the remote base revision and cannot silently overwrite a newer cloud version.

Call storage.load/save for guests even when the cloudSave capability is disabled: that capability describes cloud synchronization, not availability of the core local storage API. Do not bypass SDK storage in favor of localStorage based on this flag.

## Monetization and optional modules

`ads.interstitial(placement)`, `rewarded(placement)`, `banner(placement)`, `hideBanner()`. Result status is completed/cancelled/unfilled/unavailable/failed and carries `mock`. Reward only when completed; never reward close/error. Keep gameplay available on unfilled/cancelled. Use natural breaks and explicit rewarded buttons.

`payments.catalog()`, `purchase(productId)`, `restore()`, `consume(orderId)`. Simulator products and orders are test-only. Real fulfillment requires server verification and an idempotent entitlement ledger, not a client callback. Future leaderboard, achievement, task, daily reward, social, notification, cross-promo and clipboard operations reject until capability enabled.

The simulator stores pending/fulfilled orders and consumption in separate local namespaces by environment, game and player. restore exposes pending orders for interrupted-flow diagnostics and unconsumed fulfilled orders; only fulfilled orders can be consumed. Mock records never authorize production entitlements.

## Errors and diagnostics

ToTopError has code, retryable and optional details. Common codes: SDK_NOT_INITIALIZED, SDK_DISPOSED, HOST_REQUIRED, HOST_TIMEOUT, HOST_DISCONNECTED, ACCOUNT_CHANGED, CAPABILITY_UNAVAILABLE, AUTH_REQUIRED, INVALID_SAVE, SAVE_TOO_LARGE, SAVE_CONFLICT, REQUEST_TIMEOUT, SERVICE_UNAVAILABLE. Do not print host tokens, upload receipts, signed URLs or private player data into diagnostics. `analytics.track(name, flatScalarData)` reserves `totop_` names for the platform.

## Host/backend deployment

Build with `npm run build:sdk:game`. API routes are opt-in via GAME_RUNTIME_ENABLED=true and a new GAME_RUNTIME_TOKEN_KEY of at least 32 characters. Apply the additive migration before enabling. `/v2/game-runtime/sessions` accepts only trusted host origins and revalidates the actual published release. Invalid supplied portal credentials fail; they never downgrade to guest. Runtime credentials remain in the host. The separate event credential authorizes only `/v2/play-sessions/:id/events`.

Runtime credentials expire after 30 minutes; renewal rotates both tokens while preserving the session and event sequence. Authenticated renewal verifies the current portal identity again. Versioned public configuration and custom events have backend-only storage. Private cloud preview, provider fulfillment and developer metric aggregation still require their rollout acceptance. The required-SDK submission policy is not switched globally by merely installing this package.

Creators can read/write public configuration and view aggregate SDK sessions/events through the guarded creator APIs or get_game_sdk_config/update_game_sdk_config/get_game_sdk_metrics. MCP configuration writes use expectedVersion and a stable idempotencyKey. Counts describe SDK sessions, not unique visitors or verified revenue. Creator UI uses VITE_GAME_SDK_HOST_ENABLED. The App HTTPS shell additionally uses TOTOP_GAME_SDK_HOST_ENABLED; native portal tokens remain outside JavaScript and URLs, while scoped runtime credentials are passed only to the verified totop.ai top document. Do not enable App rollout before HTTPS shell and device acceptance.

The legacy SDK, reviewed OAuth clients and existing save keys are preserved. Supabase tables/RPCs are backend-only with RLS and explicit grants. Disable GAME_RUNTIME_ENABLED to roll back the new API without deleting saves.

The review runner gives SDK games a different-origin guest preview host and records handshake/ready/start observations. A valid manifest alone cannot pass the SDK review check. GAME_SDK_REQUIRED_AFTER can require integration for games created at or after an explicit UTC cutoff while retaining older games; leave it unset until all hosts and the new runner image pass rollout acceptance. See implementation.md for current evidence and deployment order.
