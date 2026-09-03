"""Create a private, licensed ZIP without editing the operator's live extension."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import tempfile
import shutil
import zipfile
from urllib.parse import urlparse

TOOLS = {
    'datalink': 'DATALINK.panel/DataLink.pushbutton',
    'element-explorer': 'FAMILIES.panel/Element Explorer.pushbutton',
    'import-elements': 'FAMILIES.panel/Import Elements From Model.pushbutton',
    'import-titleblock': 'FAMILIES.panel/Import Titleblock From Model.pushbutton',
    'pushparams': 'FAMILIES.panel/PushParams.pushbutton',
    'linked-view-mapper': 'LINKS.panel/Linked View Mapper.pushbutton',
    'enlarged-views': 'MODEL SETUP.panel/Enl Views AUTO.pushbutton',
    'link-worksets': 'MODEL SETUP.panel/Turn Off Link Levels Grids Scope Worksets.pushbutton',
    'place-views': 'SHEET BOSS.panel/Place Views On Sheets.pushbutton',
    'cennerit': 'VIEW TOOLS.panel/CennerIt.pushbutton',
    'view-template-manager': 'VIEW TOOLS.panel/ViewTemplateManager.pushbutton',
}


def package(source, output, url, version, mode):
    source = Path(source).resolve()
    output = Path(output).resolve()
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
        raise ValueError('Use the HTTPS origin of the deployed store')
    root = Path(__file__).resolve().parents[1]
    # Commercial payloads must never land in a public asset or tracked directory.
    private_root = root / '.bim-private'
    if not output.is_relative_to(private_root):
        raise ValueError('Output must be inside this repository .bim-private directory')
    manifest = {'version': version, 'mode': mode, 'runtimeVerified': False, 'features': list(TOOLS), 'sources': {}}
    with tempfile.TemporaryDirectory(prefix='bygeorge-package-') as scratch:
        target = Path(scratch)
        extension = target / 'ByGeorge.extension'
        tab = extension / 'ByGeorge.tab'
        lib = extension / 'lib'
        lib.mkdir(parents=True)
        for feature, relative in TOOLS.items():
            origin = source / 'ByGeorge.tab' / relative
            script = origin / 'script.py'
            payload = script.read_bytes()
            # IronPython permits .NET enum members named None; CPython 3 does not.
            # Normalize only for this static syntax check. Ship original source bytes.
            compile(re.sub(r'\.None\b', '.NONE', payload.decode('utf-8-sig')), str(script), 'exec')
            manifest['sources'][feature] = hashlib.sha256(payload).hexdigest()
            dest = tab / relative
            dest.mkdir(parents=True)
            for item in origin.iterdir():
                if item.name in ('bundle.yaml', 'icon.png', 'icon.dark.png', 'availability.py') or item.suffix == '.xaml':
                    shutil.copy2(item, dest / item.name)
            metadata = dest / 'bundle.yaml'
            # All launch candidates operate on an open project document.
            metadata.write_text(metadata.read_text(encoding='utf-8-sig').rstrip() + '\ncontext: doc-project\n', encoding='utf-8')
            (dest / 'payload.py').write_bytes(payload)
            (dest / 'script.py').write_text(
                '# -*- coding: utf-8 -*-\nfrom bygeorge_license import require_entitlement\n'
                'require_entitlement({0!r})\nimport os\n'
                '_payload = os.path.join(os.path.dirname(__file__), "payload.py")\n'
                'with open(_payload, "rb") as _source:\n'
                '    exec(compile(_source.read(), _payload, "exec"), globals(), globals())\n'.format(feature), encoding='utf-8')
        shutil.copy2(root / 'packaging' / 'bygeorge_license.py', lib / 'bygeorge_license.py')
        (lib / 'license-config.json').write_text(json.dumps({'url': url.rstrip('/'), 'mode': mode}), encoding='utf-8')
        (tab / 'bundle.yaml').write_text('title: ByGeorge\n', encoding='utf-8')
        (extension / 'extension.yaml').write_text('name: ByGeorge\nauthor: ByGeorge Consulting LLC\n', encoding='utf-8')
        for name in ('Install-ByGeorge.ps1', 'INSTALL.txt'):
            shutil.copy2(root / 'packaging' / name, target / name)
        (target / 'RELEASE.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
            for file in sorted(target.rglob('*')):
                if file.is_file():
                    archive.write(file, file.relative_to(target).as_posix())
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    manifest['sha256'] = digest
    output.with_suffix('.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps({'archive': str(output), 'bytes': output.stat().st_size, 'sha256': digest, 'tools': len(TOOLS), 'runtimeVerified': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--url', required=True)
    parser.add_argument('--version', default='0.1.0-preview')
    parser.add_argument('--mode', choices=('test', 'live'), default='test')
    args = parser.parse_args()
    package(args.source, args.output, args.url, args.version, args.mode)
