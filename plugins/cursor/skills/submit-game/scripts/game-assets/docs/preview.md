# Local and cloud development previews

Local development requires no ToTop login. Export first, then use `start_game_preview({path,config:{roundSeconds:15}})` or helper `dev EXPORT --allow-root PROJECT`. The page provides pause/audio, mock accounts and ad/payment scenarios. `get_game_preview_status` exposes connection/lifecycle/custom-event observations; these reports alone are not gameplay acceptance. Play a real round, test guest save reload and account switch, inspect screenshots/console, then stop the preview.

Cloud previews use an owned game and an immutable completed game upload. Bind the real game UUID, rebuild, get current submission requirements, prepare/start/upload/complete the artifact through the existing authorized workflow. Then call:

```json
{
  "tool": "create_game_preview",
  "arguments": {
    "gameId": "REAL_OWNED_GAME_UUID",
    "uploadId": "COMPLETED_GAME_UPLOAD_UUID",
    "idempotencyKey": "STABLE_OPERATION_UUID",
    "confirmShareablePreview": true
  }
}
```

The flag confirms that the preview is **unlisted and shareable: anyone with its link can play**. Use cloud preview only when the user has authorized that sharing. It is not private account-only hosting, review approval or game publication. No production catalog entry is created by this operation. Source archives and incomplete/unowned uploads cannot be previewed.

Each preview has its own origin, so root-relative assets work without sharing a published game’s browser storage. The returned URL expires in two hours. Use `get_game_preview({gameId,previewId})` to query an uncertain operation before retrying with the same key. `revoke_game_preview({gameId,previewId})` disables it. The runtime checks active state, exact game/origin/hash and expiry on each asset request; caching never extends access. The page also stops expired/revoked sessions. Limits: three active/building previews per creator, ZIP up to 50 MiB, unpacked up to 80 MiB, 2,000 files. The SDK manifest must match the game. Asset retention cleanup is a separate deployment requirement.

Preview player/cloud-save, ads and payments are explicitly simulated. Public tuning config is a snapshot of the owned game's config. Custom events remain preview observations, not production metrics. Network calls to external services are blocked in this first cloud preview mode. Local mocking never creates real identities, synced production progress or commercial rights.

The backend and runtime gateway must both deploy this feature before GAME_SDK_PREVIEW_ENABLED is enabled. The normal published release and legacy launch paths remain separate. Cloud preview is part of the Agent development feedback loop; formal submission still uses existing account/version-bound consent and review.
