"""Build app/ into a widget and sign it with your own Samsung certificate profile.

Uses the official Tizen CLI. If your profile does not have saved passwords, the CLI asks
for them in this terminal; nothing is stored by this script.
Output: dist/SerifHome.wgt (only replaced when signing succeeds)."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
from local_config import ROOT, load_signing, manifest_identity, override_identity, sdk_tool  # noqa: E402

APP = ROOT / 'app'
DIST = ROOT / 'dist'
NAME = 'SerifHome'


def build_unsigned(target, identity):
    files = sorted(p for p in APP.rglob('*') if p.is_file() and not p.name.startswith('.'))
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            data = path.read_bytes()
            if path == APP / 'config.xml':
                data = override_identity(data, identity)
            info = zipfile.ZipInfo(path.relative_to(APP).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)


def check_signed(path, identity):
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        if not {'author-signature.xml', 'signature1.xml'} <= names:
            raise ValueError('The signed widget is missing its signature files.')
        if manifest_identity(archive.read('config.xml')) != identity:
            raise ValueError('The signed widget has a different app identity. Package again.')
        for name in names:
            if name.lower().endswith(('.p12', '.pfx', '.pem', '.key', '.keystore')) or name.endswith('profiles.xml'):
                raise ValueError('Private signing material found inside the widget: ' + name)


def main():
    settings = load_signing()
    tizen = sdk_tool(settings['sdk_path'], 'tizen')
    DIST.mkdir(exist_ok=True)
    unsigned = DIST / (NAME + '.wgt')
    build_unsigned(unsigned, settings['identity'])
    # A fresh folder means an old signed widget can never mask a failed signing run.
    signed_dir = Path(tempfile.mkdtemp(prefix='signed-', dir=DIST))
    try:
        command = [str(tizen), 'package', '-t', 'wgt', '-s', settings['profile'], '-o', str(signed_dir), '--', str(unsigned)]
        print('Signing with profile "' + settings['profile'] + '"…', flush=True)
        result = subprocess.run(command, timeout=300)
        signed = signed_dir / unsigned.name
        if result.returncode or not signed.is_file():
            raise ValueError('Signing failed. Check the profile name and certificates in Certificate Manager.')
        check_signed(signed, settings['identity'])
        final = DIST / (NAME + '-signed.wgt')
        shutil.copyfile(signed, final)
    finally:
        shutil.rmtree(signed_dir, ignore_errors=True)
    print('Signed widget: ' + str(final.relative_to(ROOT)) + '  (app ID ' + settings['identity']['app_id'] + ')')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, zipfile.BadZipFile, subprocess.TimeoutExpired) as error:
        raise SystemExit('Packaging stopped: ' + str(error)) from None
