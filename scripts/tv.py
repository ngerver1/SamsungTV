"""Talk to the TV over Samsung's developer connection (SDB, port 26101).

  info       Show the TV's developer capabilities (Tizen version, CPU).
  apps       List installed apps and their IDs. Add a filter word to narrow it: tv.py apps ambient
  install    Install dist/SerifHome-signed.wgt (run `npm run package` first).
  launch     Open Serif Home on the TV.
  uninstall  Remove Serif Home from the TV.

None of these change the TV's Home button or startup settings.
Install route adapted from CleanFrame: on this firmware `sdb install` only uploads the file,
so the widget is pushed and installed with the TV's vd_appinstall command, then confirmed."""
import argparse
import hashlib
from pathlib import Path
import subprocess
import sys
import time
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
from local_config import ROOT, load_device, load_signing, manifest_identity, sdk_tool  # noqa: E402

WIDGET = ROOT / 'dist/SerifHome-signed.wgt'
REMOTE_DIR = '/home/owner/share/tmp/sdk_tools/'


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('action', choices=['info', 'apps', 'install', 'launch', 'uninstall'])
    parser.add_argument('filter', nargs='?', help='apps: only show lines containing this text')
    args = parser.parse_args()

    settings = load_signing(need_profile=False)
    host = load_device()
    sdb = sdk_tool(settings['sdk_path'], 'sdb')
    app_id = settings['identity']['app_id']
    serial = host + ':26101'

    if args.action == 'install':
        if not WIDGET.is_file():
            raise ValueError('No signed widget yet. Run `npm run package` first.')
        with zipfile.ZipFile(WIDGET) as archive:
            if manifest_identity(archive.read('config.xml'))['app_id'] != app_id:
                raise ValueError('The signed widget does not match your app ID. Run `npm run package` again.')

    def run(*command, show=True, timeout=60):
        result = subprocess.run([str(sdb), *command], text=True, capture_output=True, timeout=timeout)
        output = result.stdout + result.stderr
        if show and output.strip():
            print(output.rstrip(), flush=True)
        if result.returncode:
            raise ValueError('SDB command failed: ' + ' '.join(command[:4]))
        return output

    connected = run('connect', serial).lower()
    if 'connected to' not in connected and 'already connected' not in connected:
        raise ValueError('Could not connect to ' + serial + '. Is Developer Mode on with this computer\'s IP, '
                         'and has the TV been fully power-cycled since? See docs/setup-guide.md, Stage 3.')

    if args.action == 'info':
        run('-s', serial, 'capability')
    elif args.action == 'apps':
        output = run('-s', serial, 'shell', '0', 'applist', show=False)
        lines = [line for line in output.splitlines() if line.strip()]
        if args.filter:
            lines = [line for line in lines if args.filter.lower() in line.lower()]
        print('\n'.join(lines) if lines else 'No matching apps.')
    elif args.action == 'launch':
        output = run('-s', serial, 'shell', '0', 'execute', app_id)
        if 'successfully launched' not in output.lower():
            raise ValueError('Launch was not confirmed. Look at the TV, or check the app ID with `npm run tv:apps`.')
    elif args.action == 'install':
        digest = hashlib.sha256(WIDGET.read_bytes()).hexdigest()[:12]
        remote = REMOTE_DIR + 'SerifHome-' + digest + '-' + str(time.time_ns()) + '.wgt'
        print('Installing on the TV. The screen may change briefly.', flush=True)
        pushed = run('-s', serial, 'push', str(WIDGET), remote, timeout=180)
        if '1 file(s) pushed' not in pushed or 'failed' in pushed.lower():
            raise ValueError('The widget did not transfer to the TV.')
        output = run('-s', serial, 'shell', '0', 'vd_appinstall', app_id, remote, timeout=180)
        if 'install completed' not in output or 'install failed' in output:
            raise ValueError('The TV did not confirm the installation.')
        if app_id not in run('-s', serial, 'shell', '0', 'applist', show=False):
            raise ValueError('Installed, but the app is missing from the TV\'s app list.')
        print('Installed ' + app_id + '. Home button and startup settings are unchanged.')
    elif args.action == 'uninstall':
        tizen = sdk_tool(settings['sdk_path'], 'tizen')
        result = subprocess.run([str(tizen), 'uninstall', '-p', app_id, '-s', serial], text=True, capture_output=True, timeout=120)
        print((result.stdout + result.stderr).rstrip())
        if result.returncode or app_id in run('-s', serial, 'shell', '0', 'applist', show=False):
            raise ValueError('Uninstall not confirmed. You can also remove it on the TV: Apps → Settings → Serif Home → Delete.')
        print('Removed ' + app_id + '.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, zipfile.BadZipFile, subprocess.TimeoutExpired) as error:
        raise SystemExit(str(error)) from None
