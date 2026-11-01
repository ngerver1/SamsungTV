"""Offline test of package.py and tv.py against a fake Tizen SDK (macOS/Linux). Never contacts a TV."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

REPO = Path(__file__).resolve().parents[1]

FAKE_TIZEN = r'''#!/usr/bin/env python3
import sys, zipfile, shutil, json, pathlib
args = sys.argv[1:]
state = pathlib.Path(__file__).resolve().parents[3] / 'state.json'
if args[0] == 'package':
    profile = args[args.index('-s') + 1]
    out = pathlib.Path(args[args.index('-o') + 1]); src = pathlib.Path(args[-1])
    if profile == 'BadProfile':
        print('Invalid profile'); sys.exit(1)
    dst = out / src.name
    shutil.copyfile(src, dst)
    with zipfile.ZipFile(dst, 'a') as z:
        z.writestr('author-signature.xml', '<Signature/>'); z.writestr('signature1.xml', '<Signature/>')
    print('Package File Location: ' + str(dst))
elif args[0] == 'uninstall':
    data = json.loads(state.read_text()); app = args[args.index('-p') + 1]
    data['installed'] = [a for a in data['installed'] if a != app]; state.write_text(json.dumps(data))
    print('uninstall completed')
'''

FAKE_SDB = r'''#!/usr/bin/env python3
import sys, json, pathlib
args = sys.argv[1:]
state = pathlib.Path(__file__).resolve().parents[1] / 'state.json'
data = json.loads(state.read_text()) if state.exists() else {'installed': [], 'pushed': []}
def save(): state.write_text(json.dumps(data))
if args[0] == 'connect':
    print('connected to ' + args[1]); sys.exit(0)
cmd = args[2:]
if cmd[0] == 'capability':
    print('platform_version:9.0\ncpu_arch:armv7')
elif cmd[0] == 'push':
    data['pushed'].append(cmd[2]); save(); print('1 file(s) pushed. 0 file(s) skipped.')
elif cmd[:2] == ['shell', '0']:
    rest = cmd[2:]
    if rest[0] == 'applist':
        print("'Netflix' 'org.tizen.netflix-app'")
        print("'Ambient Mode' 'com.samsung.tv.ambient-app'")
        for a in data['installed']: print("'Serif Home' '" + a + "'")
    elif rest[0] == 'vd_appinstall':
        data['installed'].append(rest[1]); save(); print('app_id[' + rest[1] + '] install completed')
    elif rest[0] == 'execute':
        print('Request to launch ' + rest[1] + ' ... successfully launched' if rest[1] in data['installed'] else 'launch failed')
'''

failures = 0


def ok(condition, message):
    global failures
    print(('  ✓ ' if condition else '  ✗ ') + message)
    failures += 0 if condition else 1


def run(root, *args):
    result = subprocess.run([sys.executable, '-B', *args], cwd=root, text=True, capture_output=True, timeout=60)
    return result.returncode, result.stdout + result.stderr


def widget_identity(path):
    with zipfile.ZipFile(path) as archive:
        text = archive.read('config.xml').decode()
        names = archive.namelist()
    return text, names


with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    for name in ['app', 'scripts']:
        shutil.copytree(REPO / name, root / name, ignore=shutil.ignore_patterns('__pycache__'))
    shutil.copy(REPO / 'package.json', root)
    sdk = root / 'fake-sdk'
    (sdk / 'tools/ide/bin').mkdir(parents=True)
    for path, body in [(sdk / 'tools/ide/bin/tizen', FAKE_TIZEN), (sdk / 'tools/sdb', FAKE_SDB)]:
        path.write_text(body)
        path.chmod(0o755)
    local = root / '.local'
    local.mkdir()

    print('Setup errors')
    code, out = run(root, 'scripts/package.py')
    ok(code and 'signing.example.json' in out, 'missing .local/signing.json explains what to copy')
    (local / 'signing.json').write_text(json.dumps({'sdk_path': 'fake-sdk', 'profile': 'YOUR_CERTIFICATE_PROFILE_NAME'}))
    code, out = run(root, 'scripts/package.py')
    ok(code and 'Certificate Manager profile' in out, 'placeholder profile is rejected')
    (local / 'signing.json').write_text(json.dumps({'sdk_path': 'fake-sdk', 'profile': 'MyProfile', 'password': 'x'}))
    code, out = run(root, 'scripts/package.py')
    ok(code and 'Never put passwords' in out, 'unknown keys (like a password) are rejected')
    (local / 'signing.json').write_text(json.dumps({'sdk_path': 'fake-sdk', 'profile': 'BadProfile'}))
    code, out = run(root, 'scripts/package.py')
    ok(code and 'Signing failed' in out and not (root / 'dist/SerifHome-signed.wgt').exists(), 'failed signing leaves no signed widget')

    print('Packaging')
    (local / 'signing.json').write_text(json.dumps({'sdk_path': 'fake-sdk', 'profile': 'MyProfile'}))
    code, out = run(root, 'scripts/package.py')
    widget = root / 'dist/SerifHome-signed.wgt'
    ok(code == 0 and widget.is_file(), 'signs and writes dist/SerifHome-signed.wgt')
    text, names = widget_identity(widget)
    ok('id="yw2bHzEqX6.SerifHome"' in text and {'index.html', 'main.js', 'icon.png', 'author-signature.xml'} <= set(names), 'widget has the app files, signatures and source identity')
    ok(not list((root / 'dist').glob('signed-*')), 'temporary signing folder is cleaned up')

    print('Install, launch, apps, uninstall')
    code, out = run(root, 'scripts/tv.py', 'install')
    ok(code and 'device.json' in out, 'missing .local/device.json explains what to copy')
    (local / 'device.json').write_text(json.dumps({'host': '192.168.1.50'}))
    (local / 'signing.json').write_text(json.dumps({'sdk_path': 'fake-sdk'}))
    code, out = run(root, 'scripts/tv.py', 'info')
    ok(code == 0 and 'platform_version' in out, 'info works before certificates exist (SDK path only)')
    (local / 'signing.json').write_text(json.dumps({'sdk_path': 'fake-sdk', 'profile': 'MyProfile'}))
    code, out = run(root, 'scripts/tv.py', 'launch')
    ok(code and 'not confirmed' in out, 'launch before install reports failure')
    code, out = run(root, 'scripts/tv.py', 'install')
    ok(code == 0 and 'Installed yw2bHzEqX6.SerifHome' in out, 'install pushes, installs and confirms in the app list')
    code, out = run(root, 'scripts/tv.py', 'apps', 'ambient')
    ok(code == 0 and 'ambient-app' in out and 'netflix' not in out, 'apps filter finds the Ambient Mode ID')
    code, out = run(root, 'scripts/tv.py', 'launch')
    ok(code == 0 and 'successfully launched' in out, 'launch is confirmed')
    code, out = run(root, 'scripts/tv.py', 'uninstall')
    ok(code == 0 and 'Removed' in out, 'uninstall is confirmed')

    print('Your own app identity')
    (local / 'signing.json').write_text(json.dumps({'sdk_path': 'fake-sdk', 'profile': 'MyProfile', 'package_id': 'Abc123XyZ9', 'app_id': 'Abc123XyZ9.MyHome'}))
    code, out = run(root, 'scripts/tv.py', 'install')
    ok(code and 'does not match' in out, 'install refuses a widget built for another identity')
    code, out = run(root, 'scripts/package.py')
    text, _ = widget_identity(widget)
    ok(code == 0 and 'id="Abc123XyZ9.MyHome"' in text and 'package="Abc123XyZ9"' in text, 'package_id/app_id override is written into the widget only')
    ok('yw2bHzEqX6.SerifHome' in (root / 'app/config.xml').read_text(), 'source config.xml is unchanged')
    code, out = run(root, 'scripts/tv.py', 'install')
    ok(code == 0 and 'Abc123XyZ9.MyHome' in out, 'install uses the overridden identity')
    (local / 'signing.json').write_text(json.dumps({'sdk_path': 'fake-sdk', 'profile': 'MyProfile', 'package_id': 'short', 'app_id': 'short.App'}))
    code, out = run(root, 'scripts/package.py')
    ok(code and '10 letters' in out, 'invalid package_id is rejected')

print('\n' + (str(failures) + ' tool check(s) failed.' if failures else 'All tool checks passed.'))
sys.exit(1 if failures else 0)
