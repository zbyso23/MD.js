#!/usr/bin/env python3
"""Validate and install a user-supplied 16-KiB ZX Spectrum ROM locally.

No network requests, no ROM licensing inference, no importing ROM into Git.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / 'roms' / 'zx48.rom'
META = ROOT / 'roms' / 'local-rom.json'


def inspect(data):
    if len(data) != 16384:
        raise ValueError(f'Expected exactly 16384 bytes, received {len(data)}')
    if len(set(data)) < 32:
        raise ValueError('ROM has suspiciously few distinct byte values')
    return {
        'size': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'entry_bytes': data[:8].hex(' '),
        'possible_reset_jump': f'0x{data[3] | data[4] << 8:04X}' if data[2] == 0xC3 else None,
    }


def install(path):
    data = Path(path).read_bytes()
    info = inspect(data)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    if TARGET.exists() and TARGET.read_bytes() != data:
        print('Replacing previously installed local ROM (explicit user command)')
    with tempfile.NamedTemporaryFile(prefix='.rom-', dir=TARGET.parent, delete=False) as out:
        out.write(data)
        tmp = Path(out.name)
    try:
        os.replace(tmp, TARGET)
    finally:
        if tmp.exists(): tmp.unlink()
    info.update({'origin': 'user-supplied', 'redistribution_rights': 'not_assessed',
                 'description': 'ZX 48K 16KiB ROM supplied locally; identity not inferred from filename'})
    META.write_text(json.dumps(info, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return info


def check():
    if not TARGET.is_file():
        raise FileNotFoundError('Missing zx/roms/zx48.rom; run python3 zx/rom_tools.py --install <path>')
    info = inspect(TARGET.read_bytes())
    if META.exists():
        stored = json.loads(META.read_text(encoding='utf-8'))
        if stored.get('sha256') != info['sha256']:
            raise ValueError('Installed ROM differs from installed ROM manifest')
    return info


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--install', type=Path, help='Copy explicitly selected 16KiB ROM to local ZX emulator')
    p.add_argument('--check', action='store_true', help='Verify locally installed ROM')
    a = p.parse_args()
    info = install(a.install) if a.install else check()
    print(json.dumps(info, sort_keys=True, indent=2))


if __name__ == '__main__':
    main()
