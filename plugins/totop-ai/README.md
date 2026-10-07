# totop-ai 0.4.3

Submit local HTML5 and WebGL games to ToTop using MCP and browser OAuth.

See https://totop.ai/mcp.md for installation, duplicate-config detection, authentication and submission instructions. Requires Node 22+, not Python. No hooks or auto-approval settings are installed. This package includes its own helper and shared workflow.

Optional OS keyring support (@napi-rs/keyring 2.1.0) can be installed with ignored lifecycle scripts. When unavailable the bridge uses owner-only Unix files or Windows ACL-restricted files. Credentials are never stored in this plugin directory.
