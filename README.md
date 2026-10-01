# totop-ai for Codex

The independent ToTop plugin distribution: a submission skill, remote OAuth MCP
connection, and local build packaging/upload helpers. No platform backend or
account credentials are included. All registered ToTop users can submit after
OAuth authorization and creator-profile activation. No allowlist is required.
This is not an OpenAI public-directory listing.

## Install

Requires a current Codex desktop app/CLI with plugin marketplace support, Git,
and Python 3 for game packaging/upload. No API key or client secret is required.

```sh
codex plugin marketplace add ToTopAI/totop-ai
```

Restart the Codex desktop app. In the Plugins Directory choose **totop-ai
→ totop-ai → Install**. Complete Authenticate in the browser using
your own ToTop account, then start a new chat. Do not copy an existing machine's
configuration or authorization files. Installation and OAuth do not grant
submission permission by themselves; an active linked creator profile is required.

For CLI versions with `plugin add`:

```sh
codex plugin add totop-ai@totop-ai
codex mcp login totop-developer
```

## First use

First verify account access without uploading:

> Use totop-ai to read my account and submission requirements only. Do not create, upload, submit or publish a game. Do not output credentials.

When ready:

> 使用 totop-ai，将当前游戏提交到 ToTop，审核通过后上架。提交前先让我确认账号、游戏、版本和外部服务声明。

Codex prepares build output and explicitly selected media, not repository history
or secrets. Confirm submission before upload. Review continues independently on
ToTop. Uncertain cases go to humans; approval is not completed deployment. Read
the published status and playable link before claiming the game is online.

Manage authorization: https://creator.totop.ai/codex

Submission progress: https://creator.totop.ai/releases

## Migrating from the earlier name

If you installed ToTop Publish (`totop-publish@totop-local`), disable that old
plugin in the Plugins Directory before adding this source and installing
`totop-ai@totop-ai`. This prevents duplicate tool/skill sources. Renaming does
not revoke ToTop account grants. Complete Authenticate again if the new plugin
asks for it; never transfer authorization files by hand. Historical Releases
retain their original package names and hashes.

## Update / offline installation

```sh
codex plugin marketplace upgrade totop-ai
```

Restart Codex and start a new chat after updating. If `codex` or plugin commands
are unavailable, install/update Codex CLI first. If GitHub cloning fails, download
the versioned ZIP and SHA256 file from Releases. Verify before extraction:

```sh
shasum -a 256 -c SHA256SUMS
unzip totop-ai-0.2.3.zip -d totop-plugin-install
codex plugin marketplace add ./totop-plugin-install/totop-ai-0.2.3
```

Keep the extracted directory. ZIP installation uses the same marketplace and
plugin as Git installation; both require network access for ToTop OAuth/MCP.
Previously published ZIPs remain immutable and may contain older rollout copy;
the current repository guide and live `get_submission_requirements` are authoritative.

## Security / compatibility

Only the files recorded in `distribution.json`, this README, and the independent
validation/CI files belong in this repository. Never add `.env`, tokens, OAuth
sessions, upload receipts, private game files, or platform code. The public MCP
client ID is an identifier, not a secret. Helpers never receive OAuth tokens.
Portable manifests are intentionally absent to preserve the tested Codex OAuth
wiring. Platform AI review and automatic publication are enabled for eligible
submissions; uncertain evidence and first-time external services go to humans.
No tool bypasses platform review. Read `get_submission_requirements` for current
request, submission, upload/storage and model-attempt quotas. A 429 requires
waiting or reducing usage, not switching accounts to evade limits. Exact
idempotent write retries do not consume new write quota. Model quota exhaustion
goes to manual review, never automatic approval; there is no USD spending cap.

Report problems in Issues with client version and sanitized error text, never
passwords, keys, cookies, tokens, or signed upload URLs. ToTop maintains this
plugin; it is not endorsed by OpenAI.

Maintainers: `python3 scripts/validate_distribution.py` verifies the curated file
set, content hashes and credential-free MCP wiring. Runtime plugin files remain
sourced from the reviewed platform distribution; do not change them without
regenerating the manifest and repeating client acceptance.

Official installation reference: https://developers.openai.com/plugins/build/plugins
