# Multi-Agent acceptance — 2026-10-06

Release: plugins **0.3.0**, shared Node helper/stdio bridge **0.1.0**. Node **22+**.

## Evidence and limits

| Client | Exact version inspected | Verified in this rollout | Still requires an authenticated test account / client session |
| --- | --- | --- | --- |
| Claude Code | 2.1.280 | Native manifest validation; isolated marketplace add, install, update, uninstall and marketplace removal | Browser OAuth, actual tools/list and local game submission |
| Claude Desktop | Not available for authenticated acceptance | Remote OAuth instructions and conditional local-tool/bridge workflow implemented | Chat and Cowork separately: connection, authorized local file workflow and submission |
| Codex desktop / CLI | CLI 0.153.2; installed ToTop plugin updated from 0.2.3 to 0.3.0 | Existing codex:totop MCP configuration and prompt preserved; fixed-version package validated; marketplace upgrade succeeded and plugin list confirms enabled 0.3.0 | Fresh-session actual tools/list, old persisted grant refresh/revocation and native upload |
| Cursor | Desktop 3.20.21, arm64 | Native manifest/root mcp.json, local install instructions, project/global MCP and one-click configuration validated | Actual native plugin install/update/uninstall, OAuth and native upload |
| DeepSeek Harness | Official @deepseek-ai/dsh 0.2.0-rc.2; MCP client 0.0.1-rc.1 | Prebuilt tgz installed into a disposable profile; composed config contains only the new totop-ai layer; uninstall removes it | Runtime bridge login, tools/list, reconnect and restricted local upload |
| Unknown Agent | Official @modelcontextprotocol/sdk 1.31.0 | Real SDK discovery and dynamic registration against production; isolated provider PKCE/token/refresh/revoke tests; SDK bridge schema discovery | Authenticated remote invocation and full submission using the standard client |

No client is advertised as having passed a complete authenticated submission solely because its package builds or its configuration loads. Production game publication states, review policy and user privileges were not changed. No production test game was submitted.

Harness emits peer-dependency warnings for components supplied by its runtime. Package installation and config composition do not prove that runtime injection or OAuth works. The explicit --save-prod installation option avoids an existing user's save=false package-manager preference silently leaving the Bundle out of the profile manifest. No user package-manager settings are changed.

## Automated and isolated verification

- Backend: 392 passing tests; type-check and production build. Additional targeted OAuth tests verify that a different client cannot revoke another client's token.
- Website: 163 passing tests; lint and production build.
- Personal center: 241 passing tests; lint and production build. Includes inline refresh/revoke errors, expired-grant revocation, account-switch isolation and Arabic RTL.
- Helper/bridge: four scenario suites cover ZIP identity, path/secret/symlink rejection, file changes, signed-upload validation, ambiguous write results, profile isolation, failed keyring cleanup and retained start_upload schema.
- Isolated Postgres: full migration chain, private-table RLS, anonymous/authenticated RPC denial, shared registration limits, own-account connection isolation and revocation verified before production migration.
- Production: protected-resource/OAuth metadata, S256, dynamic registration through the official SDK, restricted scopes and 401 challenges verified. Private registry tables/RPCs are inaccessible to anonymous/authenticated roles.
- Local browser: six client selectors, native/manual modes and inline copy state checked; 390px Arabic layouts have document scrollWidth equal to clientWidth. This is browser emulation, not iPhone hardware acceptance. Production browser navigation timed out, so online visual/interaction acceptance is not claimed; public production HTTP/assets were checked independently.
- Windows, macOS and Linux helper tests, package build and distribution validation all passed in [run 37347190456](https://github.com/ToTopAI/totop-ai/actions/runs/37347190456), code revision b8aeff45312ee71083dd294648ffc39d35d92a9e. Windows checks exercise junction rejection, case/short-name normalization and owner-only ACL fallback. Fixed-version packages, file manifests and SHA-256 sums are published by the release workflow. These runner results are not native Agent application acceptance.

## Published and deployed evidence

- [Release v0.3.0](https://github.com/ToTopAI/totop-ai/releases/tag/v0.3.0) was published by successful [distribution run 37347445141](https://github.com/ToTopAI/totop-ai/actions/runs/37347445141), revision 41f94153efd17796072b639cebf98d22fbbc7d11. All five downloaded archives match SHA256SUMS; FILE-MANIFEST.json is also attached.
- Production migration version: `20261005164904_agent_mcp_clients.sql`. The full migration chain and permissions were checked first in isolated Postgres; existing production game records were not modified for acceptance.
- API revision `59219ba449320fa127a873dc588f5ef6e136a3db` passed [deployment 37347991018](https://github.com/ToTopAI/totop-platform/actions/runs/37347991018) and CI. The active systemd executable and API-RELEASE.json match this revision; the API health probe succeeds. Existing auth/social source overlays retain their original hashes. Only the API service was restarted.
- Website revision `1fc00211fe1bae580b5f23de1d64a0747e114ce3`: production Pages deployment `0b3305d4-a811-425a-93bc-3d08b7a06e16`.
- Personal-center revision `cb2b69fbbe5ca58a4dbec4ba71739883f0b44a27`: production Pages deployment `7d913f28-71e7-4a7e-9721-aea751403d08`.
- Public `/mcp/`, `/agents` and `/mcp.md` return 200. The actual production JavaScript includes all six Agent entries and versions 0.3.0/0.1.0. JavaScript and CSS have the correct MIME types, not an HTML fallback. The old `/codex` compatibility route is in the deployed router; its language/return-path behavior is covered by automated tests, not an online browser assertion.
- The unauthenticated personal connection endpoint returns 401 with `private, no-store`. OAuth/protected-resource discovery and SDK registration passed online. Authenticated production tools/list, grant revocation and upload/submission are still pending a test account and native-client session.

## Authenticated acceptance handoff

Use an isolated environment and a test game only. Do not reuse production game targets. Record the client version, tools/list start_upload fields, profile/account, artifact size/hash, upload completion, submission/review/deployment states and confirmed playable URL. Never retain tokens, authorization codes, signed URLs or game contents in the report.

For each client: install → detect duplicate manual/plugin entries → authorize → inspect tools/list → prepare game/cover → start/complete upload → confirm target/version/services/public intent → submit → query result. Also test revoked/expired grants, account switch, cancellation/reconnect and timeout-before-status-query. Claude Desktop Chat and Cowork are separate rows, not a single permission assumption.

## Primary specifications

- [Claude Code plugin specification](https://code.claude.com/docs/en/plugins)
- [Cursor plugin specification](https://cursor.com/docs/reference/plugins) and [local plugin installation](https://cursor.com/docs/plugins)
- [DeepSeek official Bundle specification](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
