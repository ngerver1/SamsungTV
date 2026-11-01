"""Offline checks: manifest, versions, bundled files, TV-engine CSS rules and font hashes."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys
import xml.etree.ElementTree as XML

sys.path.insert(0, str(Path(__file__).resolve().parent))
from local_config import manifest_identity  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'app'
NS = {'w': 'http://www.w3.org/ns/widgets', 't': 'http://tizen.org/ns/widgets'}
PRIVATE = {'.p12', '.pfx', '.pkcs12', '.jks', '.keystore', '.pem', '.key', '.csr', '.wgt'}
problems = []


def check(condition, message):
    if not condition:
        problems.append(message)


manifest = XML.parse(APP / 'config.xml').getroot()
manifest_identity((APP / 'config.xml').read_bytes())
version = json.loads((ROOT / 'package.json').read_text())['version']
check(manifest.get('version') == version, 'config.xml version differs from package.json')
check(re.search(r"VERSION = '" + re.escape(version) + "'", (APP / 'main.js').read_text()), 'main.js VERSION differs from package.json')
for tag in ['content', 'icon']:
    node = manifest.find('w:' + tag, NS)
    check(node is not None and (APP / node.get('src', '')).is_file(), 'Missing ' + tag + ' file')
privileges = {p.get('name') for p in manifest.findall('t:privilege', NS)}
check('http://tizen.org/privilege/application.launch' in privileges, 'Missing application.launch privilege')
check('http://tizen.org/privilege/application.info' in privileges, 'Missing application.info privilege')

html = (APP / 'index.html').read_text()
for reference in re.findall(r'(?:src|href)=["\']([^"\']+)', html):
    if ':' not in reference:
        check((APP / reference).is_file(), 'index.html references a missing file: ' + reference)

for css in APP.rglob('*.css'):
    source = re.sub(r'/\*.*?\*/', '', css.read_text(), flags=re.S)
    name = str(css.relative_to(ROOT))
    check(not re.search(r'(?:^|[;{}])\s*inset\s*:', source, re.I), name + ': use explicit edges instead of inset')
    check(not re.search(r'(?:^|[;{}])\s*(?:row-|column-)?gap\s*:', source, re.I), name + ': use margins instead of gap')
    for reference in re.findall(r'url\(["\']?([^)"\']+)', source):
        if ':' not in reference:
            check((css.parent / reference).is_file(), name + ' references a missing file: ' + reference)

for js in APP.rglob('*.js'):
    source = js.read_text()
    check('=>' not in re.sub(r"'[^'\n]*'", "''", source), str(js.relative_to(ROOT)) + ': arrow functions are not ES5')

for entry in json.loads((APP / 'assets/fonts/SOURCES.json').read_text()):
    path = APP / 'assets/fonts' / entry['file']
    check(path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], 'Font hash mismatch: ' + entry['file'])

for path in APP.rglob('*'):
    if path.is_file():
        rel = PurePosixPath(path.relative_to(APP).as_posix())
        check(rel.suffix.lower() not in PRIVATE and not rel.name.startswith('.'), 'Private or generated file inside app/: ' + str(rel))

if problems:
    print('\n'.join('FAIL ' + p for p in problems))
    raise SystemExit(1)
print('OK: manifest, versions, bundled files, CSS rules and font hashes are valid.')
