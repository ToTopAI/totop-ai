"""Upload one verified game ZIP or cover. Receipt is read from private stdin."""
import hashlib
import json
import os
import re
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request

ZIP_LIMIT = 100 * 1024 * 1024
COVER_LIMIT = 10 * 1024 * 1024

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def prepare(path, receipt):
    if not isinstance(receipt, dict) or receipt.get('method') != 'PUT':
        raise ValueError('invalid_upload_receipt')
    url = urllib.parse.urlsplit(receipt.get('uploadUrl', ''))
    # AWS presigning may use either path-style or virtual-hosted R2 buckets.
    bucket_host = re.fullmatch(r'[a-z0-9][a-z0-9-]*\.[a-f0-9]{32}\.r2\.cloudflarestorage\.com', url.hostname or '')
    account_host = re.fullmatch(r'[a-f0-9]{32}\.r2\.cloudflarestorage\.com', url.hostname or '')
    object_path = url.path if bucket_host else re.sub(r'^/[a-z0-9][a-z0-9-]*(?=/)', '', url.path) if account_host else ''
    if (url.scheme != 'https' or url.username or url.password or url.port not in (None, 443)
            or url.fragment or not (bucket_host or account_host)
            or not (re.fullmatch(r'/packages/[a-f0-9-]{36}/[a-f0-9-]{36}/game\.zip', object_path)
                    or re.fullmatch(r'/release-media/v1/[a-f0-9-]{36}/[a-f0-9-]{36}/source\.(?:png|jpg|webp)', object_path))):
        raise ValueError('untrusted_upload_target')
    query = urllib.parse.parse_qs(url.query, strict_parsing=True)
    if len(query.get('X-Amz-Signature', [])) != 1 or not re.fullmatch(r'[a-f0-9]{64}', query['X-Amz-Signature'][0]):
        raise ValueError('unsigned_upload_target')
    content_type = (receipt.get('headers') or {}).get('Content-Type')
    if receipt.get('headers') != {'Content-Type': content_type, 'If-None-Match': '*'} or content_type not in ('application/zip', 'image/png', 'image/jpeg', 'image/webp'):
        raise ValueError('unexpected_upload_headers')
    expected = receipt.get('sha256')
    size = receipt.get('bytes')
    limit = ZIP_LIMIT if content_type == 'application/zip' else COVER_LIMIT
    if not isinstance(expected, str) or not re.fullmatch(r'[a-f0-9]{64}', expected) or type(size) is not int or not 0 < size <= limit:
        raise ValueError('invalid_package_identity')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'rb') as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size != size:
            raise ValueError('package_size_mismatch')
        data = handle.read(limit + 1)
    if len(data) != size or hashlib.sha256(data).hexdigest() != expected:
        raise ValueError('package_hash_mismatch')
    return urllib.request.Request(receipt['uploadUrl'], data=data, method='PUT', headers=receipt['headers'])

def upload(path, receipt, opener=None):
    request = prepare(path, receipt)
    # Deliberately disable ambient proxies; never send OAuth/cookies to storage.
    opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    try:
        with opener.open(request, timeout=120) as response:
            if response.status not in (200, 201, 204):
                raise ValueError('upload_not_confirmed_query_status')
    except urllib.error.HTTPError as error:
        if error.code == 412:
            return {'status': 'object_exists', 'next': 'complete_upload must verify existing object'}
        raise ValueError('upload_not_confirmed_query_status') from None
    return {'status': 'uploaded', 'bytes': receipt['bytes'], 'sha256': receipt['sha256'], 'next': 'complete_upload'}

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: upload_game.py GAME_ZIP_OR_COVER < private-upload-receipt.json')
    try:
        raw = sys.stdin.buffer.read(32769)
        if len(raw) > 32768:
            raise ValueError('receipt_too_large')
        print(json.dumps(upload(sys.argv[1], json.loads(raw))))
    except Exception:
        # urllib errors may contain the entire signed URL. Never print them.
        print('Upload unconfirmed. Inspect the local file and query ToTop before retrying with the same upload ID.', file=sys.stderr)
        sys.exit(1)
