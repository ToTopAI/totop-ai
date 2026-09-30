# ToTop Publish — allowlisted pilot

The production MCP pilot is enabled for allowlisted creator accounts. Automatic approval remains disabled; unsupported accounts cannot submit. Installing the plugin or completing OAuth does not publish a game or bypass review. Approved games are deployed by the platform; wait for a published status and playable link.

## Recommended installation

Requires a current Codex desktop app/CLI with plugin marketplace support, Git,
and Python 3 for local packaging/upload. No API key or client secret is needed.

```sh
codex plugin marketplace add ToTopAI/totop-codex-plugin
```

Restart Codex, open the Plugins Directory, choose **ToTop Local Plugins**, and
install **ToTop Publish**. Complete Authenticate in your browser using your own
ToTop account, then start a new chat. Do not copy another user's Codex settings,
paste Tokens, or store credentials in project files. Installation and OAuth do
not enable submission permission: the pilot needs a linked, allowlisted creator
account. Manage and revoke connections at https://creator.totop.ai/codex.

First test without changing anything:

> Use ToTop Publish to read my account and submission requirements only. Do not upload, submit or publish a game. Do not output credentials.

Then request a submission:

> 将当前游戏提交到 ToTop，审核通过后上架。

Codex prepares the build, metadata, cover and external-service declarations, then
asks you to confirm account/game/version and publication intent before uploading.
Only build output and explicitly selected media are uploaded, not repositories
or secrets. Review progress is also available at https://creator.totop.ai/releases.

Update the source, restart Codex and open a new chat:

```sh
codex plugin marketplace upgrade totop-local
```

Versioned ZIPs and SHA256 checksums are available from the independent repository's
Releases if GitHub cloning is unavailable. This is a ToTop-maintained distribution,
not a listing in OpenAI's public Plugins Directory. Report installation issues
without passwords, tokens, cookies, signed upload URLs or private game files.

The repository plugin uses pre-registered OAuth client `codex:totop`, resource `https://api.totop.ai/mcp`, and native loopback callback `http://127.0.0.1/callback`. No client secret or copied dashboard token is needed. The server permits a variable loopback port, not arbitrary hosts or paths.

Version 0.2.2 uses the officially supported Codex compatibility manifest
`.codex-plugin/plugin.json` and `.mcp.json`. A real clean Codex CLI 0.153.2 test
found that the portable MCP manifest took precedence and lost the registered
OAuth client settings, incorrectly attempting dynamic registration. Portable
manifests are intentionally absent until that configuration can be verified.
ToTop does not enable dynamic registration as a workaround.

For a checkout at `/absolute/path/to/totop-platform`, add its repo marketplace:

```sh
codex plugin marketplace add /absolute/path/to/totop-platform
```

Restart the Codex desktop app, select **ToTop Local Plugins** in the Plugins Directory, and install **ToTop Publish**. The same marketplace/plugin setting is recognized by supported Codex CLI clients. This local marketplace is for the allowlisted pilot; it is not a public-directory publication.

Direct CLI MCP configuration is available for MCP-only pilot testing:

### Standalone distribution

Maintainers can build a reproducible ZIP without shipping the platform repository:

```sh
python3 scripts/package-totop-plugin.py /absolute/path/totop-publish-0.2.2.zip
```

The output JSON records the archive SHA256 and size. The command refuses to
overwrite an existing archive. Its curated inputs include the Codex manifest,
the submission skill, the two Python helpers, and a local marketplace; unrelated
repository files and credentials are excluded. `distribution.json` records the
SHA256 of every packaged input. Python 3 is required for packaging/upload helpers.

Extract the ZIP to a new directory, then register its enclosed marketplace root:

```sh
unzip /absolute/path/totop-publish-0.2.2.zip -d /absolute/path/totop-plugin-install
codex plugin marketplace add /absolute/path/totop-plugin-install/totop-publish-0.2.2
```

Restart Codex and install **ToTop Publish** from **ToTop Local Plugins**. Keep the
extracted directory available. Authenticate using your own allowlisted account;
the archive contains no account session. First-use authorization and a real
submission from a clean Desktop/CLI environment remain separate acceptance gates.

Codex CLI versions exposing `plugin add` can also install directly:

```sh
codex plugin add totop-publish@totop-local
codex mcp login totop-developer
```

### MCP-only CLI testing

```sh
codex mcp add totop --url https://api.totop.ai/mcp --oauth-client-id codex:totop
codex mcp login totop
```

Direct MCP configuration exposes the remote tools only; installing the plugin also provides the submission skill. The repository does not modify a developer's personal marketplace or Codex settings.

Read `get_submission_requirements` first. The current pilot accepts existing linked creator accounts, new managed games, static ZIPs, text metadata, one PNG/JPEG/WebP cover, and declared HTTPS/WSS backends. First-time external-service use and uncertain evidence go to a human. Automatic approval remains off by default. Packaging and signed-upload helpers are under `skills/submit-game/scripts/`; neither helper receives OAuth credentials.

References: [Codex MCP setup](https://developers.openai.com/codex/mcp), [plugin authorization](https://developers.openai.com/plugins/build/auth).
