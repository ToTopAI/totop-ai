# Multi-Agent acceptance — 2026-10-06

Release: plugins **0.3.0**, shared Node helper/stdio bridge **0.1.0**. Node **22+**.

## Evidence and limits

| Client | Exact version inspected | Verified in this rollout | Still requires an authenticated test account / client session |
| --- | --- | --- | --- |
| Claude Code | 2.1.280 | Native manifest validation; isolated marketplace add, install, update, uninstall and marketplace removal | Browser OAuth, actual tools/list and local game submission |
| Claude Desktop | Not available for authenticated acceptance | Remote OAuth instructions and conditional local-tool/bridge workflow implemented | Chat and Cowork separately: connection, authorized local file workflow and submission |
| Codex desktop / CLI | CLI 0.153.2; existing desktop plugin 0.2.3 | Existing codex:totop MCP configuration and prompt preserved; new 0.3.0 package validated | Installed-client update, old persisted grant refresh/revocation and native upload |
| Cursor | Desktop 3.20.21, arm64 | Native manifest/root mcp.json, local install instructions, project/global MCP and one-click configuration validated | Actual native plugin install/update/uninstall, OAuth and native upload |
| DeepSeek Harness | Official @deepseek-ai/dsh 0.2.0-rc.2; MCP client 0.0.1-rc.1 | Prebuilt tgz installed into a disposable profile; composed config contains only the new totop-ai layer; uninstall removes it | Runtime bridge login, tools/list, reconnect and restricted local upload |
| Unknown Agent | Official @modelcontextprotocol/sdk 1.31.0 | Real SDK discovery and dynamic registration against production; isolated provider PKCE/token/refresh/revoke tests; SDK bridge schema discovery | Authenticated remote invocation and full submission using the standard client |

No client is advertised as having passed a complete authenticated submission solely because its package builds or its configuration loads. Production game publication states, review policy and user privileges were not changed. No production test game was submitted.

Harness emits peer-dependency warnings for components supplied by its runtime. Package installation and config composition do not prove that runtime injection or OAuth works. The explicit --save-prod installation option avoids an existing user's save=false package-manager preference silently leaving the Bundle out of the profile manifest. No user package-manager settings are changed.

## Automated and isolated verification

- Backend: 392 passing tests; type-check and production build. Additional targeted OAuth tests verify that a different client cannot revoke another client's token.
- Website: 163 passing tests; lint and production build.
- Personal center: 240 passing tests; lint and production build. Includes inline refresh/revoke errors, account-switch isolation and Arabic RTL.
- Helper/bridge: four scenario suites cover ZIP identity, path/secret/symlink rejection, file changes, signed-upload validation, ambiguous write results, profile isolation, failed keyring cleanup and retained start_upload schema.
- Isolated Postgres: full migration chain, private-table RLS, anonymous/authenticated RPC denial, shared registration limits, own-account connection isolation and revocation verified before production migration.
- Production: protected-resource/OAuth metadata, S256, dynamic registration through the official SDK, restricted scopes and 401 challenges verified. Private registry tables/RPCs are inaccessible to anonymous/authenticated roles.
- Browser: six client selectors, native/manual modes and inline copy state checked; 390px Arabic layouts have document scrollWidth equal to clientWidth. This is browser emulation, not iPhone hardware acceptance.
- Cross-platform CI is tracked by the [distribution workflow](https://github.com/ToTopAI/totop-ai/actions/workflows/validate.yml). Fixed-version packages, file manifests and SHA-256 sums are published by the release workflow; check the actual run status before treating an OS as passed.

## Authenticated acceptance handoff

Use an isolated environment and a test game only. Do not reuse production game targets. Record the client version, tools/list start_upload fields, profile/account, artifact size/hash, upload completion, submission/review/deployment states and confirmed playable URL. Never retain tokens, authorization codes, signed URLs or game contents in the report.

For each client: install → detect duplicate manual/plugin entries → authorize → inspect tools/list → prepare game/cover → start/complete upload → confirm target/version/services/public intent → submit → query result. Also test revoked/expired grants, account switch, cancellation/reconnect and timeout-before-status-query. Claude Desktop Chat and Cowork are separate rows, not a single permission assumption.

## Primary specifications

- [Claude Code plugin specification](https://code.claude.com/docs/en/plugins)
- [Cursor plugin specification](https://cursor.com/docs/reference/plugins) and [local plugin installation](https://cursor.com/docs/plugins)
- [DeepSeek official Bundle specification](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
