"""Validate the finite public plugin distribution without exposing credentials."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'distribution.json').read_text())
expected = {
    '.agents/plugins/marketplace.json',
    'plugins/totop-ai/.codex-plugin/plugin.json',
    'plugins/totop-ai/.mcp.json',
    'plugins/totop-ai/README.md',
    'plugins/totop-ai/skills/submit-game/SKILL.md',
    'plugins/totop-ai/skills/submit-game/scripts/package_game.py',
    'plugins/totop-ai/skills/submit-game/scripts/upload_game.py',
}
allowed = expected | {'distribution.json', 'README.md', '.gitignore',
    'scripts/validate_distribution.py', '.github/workflows/validate.yml'}
assert set(manifest['files']) == expected, 'Unexpected distribution inputs'
secret = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:AKIA|ASIA)[A-Z0-9]{16}|\bsk-[A-Za-z0-9_-]{32,}')
for name in allowed:
    path = root / name
    assert not any(p.is_symlink() for p in (path, *path.parents)), 'Linked distribution input'
    content = path.read_bytes()
    assert not secret.search(content), 'Possible credential; inspect locally'
    if name in expected:
        assert hashlib.sha256(content).hexdigest() == manifest['files'][name], 'Distribution hash mismatch'
tracked = subprocess.check_output(['git', 'ls-files'], cwd=root, text=True).splitlines()
assert set(tracked) == allowed, 'Unexpected public repository files'
config = json.loads((root / 'plugins/totop-ai/.mcp.json').read_text())
assert config == {'mcpServers': {'totop-developer': {
    'type': 'http', 'url': 'https://api.totop.ai/mcp',
    'oauth': {'clientId': 'codex:totop', 'callbackUrl': 'http://127.0.0.1/callback'},
}}}, 'Unexpected MCP configuration'
plugin = json.loads((root / 'plugins/totop-ai/.codex-plugin/plugin.json').read_text())
assert plugin['version'] == manifest['version'] and plugin['name'] == manifest['name'] == 'totop-ai'
marketplace = json.loads((root / '.agents/plugins/marketplace.json').read_text())
assert marketplace['name'] == 'totop-ai'
assert marketplace['plugins'][0]['source'] == {'source': 'local', 'path': './plugins/totop-ai'}
print('Validated credential-free ToTop plugin ' + manifest['version'])
