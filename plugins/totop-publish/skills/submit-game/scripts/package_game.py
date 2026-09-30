"""Dependency-free, local-only packaging preflight. It is not a malware scanner."""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import zipfile

MAX_BYTES = 500 * 1024 * 1024
MAX_FILE_BYTES = 100 * 1024 * 1024
MAX_FILES = 5000
FORBIDDEN = {'.git', '.hg', '.svn', 'node_modules', '.ssh', '.aws', '.npmrc', '.pypirc', 'credentials', 'id_rsa', 'id_ed25519'}
SECRET = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:AKIA|ASIA)[A-Z0-9]{16}|\bsk-[A-Za-z0-9_-]{32,}')
ALLOWED = {'.html', '.htm', '.js', '.mjs', '.css', '.json', '.wasm', '.data', '.bin', '.unityweb', '.pck', '.gz', '.br',
           '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif', '.ktx', '.ktx2', '.basis',
           '.mp3', '.ogg', '.wav', '.m4a', '.mp4', '.webm', '.woff', '.woff2', '.ttf', '.otf', '.glb', '.gltf', '.obj', '.mtl', '.txt', '.xml'}

def package_game(build, destination):
    source = Path(build)
    if source.is_symlink():
        raise ValueError('build directory must not be a symlink')
    root = source.resolve(strict=True)
    output = Path(destination).absolute()
    parent = output.parent.resolve(strict=True)
    output = parent / output.name
    if not root.is_dir() or root == Path(root.anchor) or root == Path.home():
        raise ValueError('select a specific build directory')
    if output.is_relative_to(root):
        raise ValueError('output must be outside build directory')
    if output.exists() or output.is_symlink():
        raise ValueError('output already exists; use a new path')
    files = []
    total = 0
    for directory, dirs, names in os.walk(root, followlinks=False):
        for name in sorted(dirs + names):
            path = Path(directory) / name
            relative = path.relative_to(root)
            if path.is_symlink():
                raise ValueError('symlinks are not allowed in build')
            if any(part.lower() in FORBIDDEN or part.lower().startswith('.env') for part in relative.parts):
                raise ValueError('sensitive or development files found in build')
            info = path.lstat()
            if stat.S_ISDIR(info.st_mode):
                continue
            if not stat.S_ISREG(info.st_mode) or path.suffix.lower() not in ALLOWED:
                raise ValueError('unsupported or source file found in build')
            if any(ord(c) < 32 for c in relative.as_posix()) or '\\' in relative.as_posix():
                raise ValueError('unsafe package filename')
            total += info.st_size
            if info.st_size > MAX_FILE_BYTES or total > MAX_BYTES or len(files) >= MAX_FILES:
                raise ValueError('package exceeds runtime limits')
            files.append((path, relative.as_posix(), info))
    if not any(name == 'index.html' for _, name, _ in files):
        raise ValueError('build needs root index.html')
    created = False
    try:
        # Exclusive creation avoids overwriting another artifact, including a raced symlink.
        with output.open('xb') as target:
            created = True
            with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
                for path, name, before in sorted(files, key=lambda item: item[1]):
                    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
                    with os.fdopen(fd, 'rb') as handle:
                        current = os.fstat(handle.fileno())
                        if (current.st_dev, current.st_ino, current.st_size, current.st_mtime_ns) != (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns):
                            raise ValueError('build changed during packaging; rebuild and retry')
                        data = handle.read(MAX_FILE_BYTES + 1)
                    if len(data) != before.st_size:
                        raise ValueError('build changed during packaging')
                    if SECRET.search(data):
                        raise ValueError('possible secret found; inspect locally before uploading')
                    archive.writestr(name, data)
        if output.stat().st_size > 100 * 1024 * 1024:
            raise ValueError('compressed package exceeds upload limit')
        digest = hashlib.sha256()
        with output.open('rb') as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                digest.update(chunk)
        return {'path': str(output), 'bytes': output.stat().st_size, 'sha256': digest.hexdigest(), 'files': len(files)}
    except Exception:
        if created:
            output.unlink(missing_ok=True)
        raise

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Usage: package_game.py BUILD_DIRECTORY NEW_OUTPUT_ZIP')
    try:
        print(json.dumps(package_game(sys.argv[1], sys.argv[2])))
    except (ValueError, OSError, zipfile.BadZipFile) as error:
        # Never print file contents, tokens or potentially credential-bearing paths.
        print(str(error) if isinstance(error, ValueError) else 'Packaging failed; inspect local filesystem permissions.', file=sys.stderr)
        sys.exit(1)
