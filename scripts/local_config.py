"""Read your private setup from .local/ (never committed). Adapted from CleanFrame (MIT)."""
import json
import os
from pathlib import Path
import re
import xml.etree.ElementTree as XML

ROOT = Path(__file__).resolve().parents[1]
APPLICATION = '{http://tizen.org/ns/widgets}application'
WINDOWS = os.name == 'nt'


def manifest_identity(data):
    try:
        items = XML.fromstring(data).findall(APPLICATION)
    except XML.ParseError:
        raise ValueError('config.xml is not valid XML.') from None
    if len(items) != 1:
        raise ValueError('config.xml must contain exactly one tizen:application.')
    identity = {'package_id': items[0].get('package'), 'app_id': items[0].get('id')}
    validate_identity(identity)
    return identity


def validate_identity(identity):
    package, app = identity.get('package_id'), identity.get('app_id')
    if not isinstance(package, str) or not re.fullmatch(r'[A-Za-z0-9]{10}', package):
        raise ValueError('package_id must be 10 letters/digits, e.g. yw2bHzEqX6.')
    if not isinstance(app, str) or not re.fullmatch(re.escape(package) + r'\.[A-Za-z0-9_-]{1,52}', app):
        raise ValueError('app_id must be package_id + "." + a name, e.g. yw2bHzEqX6.SerifHome.')


def override_identity(data, identity):
    """Change only the package and id attribute values in the manifest bytes."""
    validate_identity(identity)
    manifest_identity(data)
    tags = list(re.finditer(rb'<tizen:application\b[^>]*>', data))
    if len(tags) != 1:
        raise ValueError('Expected one tizen:application tag in config.xml.')
    tag = tags[0].group()
    for attribute, value in [('package', identity['package_id']), ('id', identity['app_id'])]:
        pattern = rb'(?<![\w:.-])(' + attribute.encode() + rb'\s*=\s*)(["\'])([^"\']*)\2'
        tag, count = re.subn(pattern, lambda m: m[1] + m[2] + value.encode() + m[2], tag)
        if count != 1:
            raise ValueError('Expected one ' + attribute + ' attribute in the application tag.')
    result = data[:tags[0].start()] + tag + data[tags[0].end():]
    if manifest_identity(result) != identity:
        raise ValueError('Manifest identity override could not be verified.')
    return result


def read_json(path, example):
    if not path.exists():
        raise ValueError('Missing ' + str(path.relative_to(ROOT)) + '. Copy ' + example + ' and fill it in (see docs/setup-guide.md).')
    try:
        data = json.loads(path.read_text())
    except (ValueError, OSError):
        raise ValueError('Cannot read ' + str(path.relative_to(ROOT)) + ' as JSON.') from None
    if not isinstance(data, dict):
        raise ValueError(str(path.relative_to(ROOT)) + ' must be a JSON object.')
    return data


def sdk_tool(sdk, name):
    """Locate the Tizen CLI or SDB inside an SDK folder on macOS, Linux or Windows."""
    if name == 'tizen':
        path = sdk / 'tools/ide/bin' / ('tizen.bat' if WINDOWS else 'tizen')
    else:
        path = sdk / 'tools' / ('sdb.exe' if WINDOWS else 'sdb')
    if not path.is_file():
        raise ValueError('Cannot find ' + str(path) + '. Check sdk_path in .local/signing.json.')
    return path


def load_signing(root=ROOT, need_profile=True):
    """SDK path and app identity. The certificate profile is only needed for packaging."""
    config = read_json(root / '.local/signing.json', 'signing.example.json')
    allowed = {'sdk_path', 'profile', 'package_id', 'app_id'}
    if set(config) - allowed:
        raise ValueError('Unknown key in .local/signing.json. Allowed: ' + ', '.join(sorted(allowed)) + '. Never put passwords here.')
    profile = config.get('profile')
    if need_profile and (not isinstance(profile, str) or not profile.strip() or profile.startswith('YOUR_')):
        raise ValueError('Set "profile" in .local/signing.json to your Certificate Manager profile name.')
    sdk = config.get('sdk_path')
    if not isinstance(sdk, str) or not sdk.strip():
        raise ValueError('Set "sdk_path" in .local/signing.json to your Tizen Studio folder.')
    sdk = Path(sdk).expanduser()
    sdk = (sdk if sdk.is_absolute() else root / sdk).resolve()
    identity = manifest_identity((root / 'app/config.xml').read_bytes())
    if ('package_id' in config) != ('app_id' in config):
        raise ValueError('Set both package_id and app_id in .local/signing.json, or neither.')
    if 'package_id' in config:
        identity = {'package_id': config['package_id'], 'app_id': config['app_id']}
        validate_identity(identity)
    return {'sdk_path': sdk, 'profile': profile, 'identity': identity}


def load_device(root=ROOT):
    config = read_json(root / '.local/device.json', 'device.example.json')
    host = config.get('host')
    if not isinstance(host, str) or not re.fullmatch(r'\d{1,3}(?:\.\d{1,3}){3}', host):
        raise ValueError('Set "host" in .local/device.json to the TV\'s IP address, e.g. 192.168.1.50.')
    return host
