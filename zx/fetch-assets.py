#!/usr/bin/env python3
"""Fetch missing upstream MIT files or Debian OpenSE BASIC ROM, if needed.
Requires Python 3 standard library only; no dependency manager, no npm installs.
"""
from pathlib import Path
import hashlib, io, tarfile, urllib.request, json, sys
from vendor_patch import patch_minzx
from rom_tools import check as check_local_rom

ROOT = Path(__file__).resolve().parent
BASE = 'https://raw.githubusercontent.com/dcrespo3d/MinZX/master/'
# The upstream commit should be pinned for release; first download records hashes.
LOCK = ROOT/'vendor-sources.sha256.json'
FILES = ('Z80.js','MinZX.js','ZXScreen.js','ZXKeyboard.js','ZXSound.js','utils.js','LICENSE')
ROM_SHA = '5e272f261bfc18e9159691b948960868311ee99f4189c1b78ac52a100c288a0c'
MIRRORS = (
    'https://deb.debian.org/debian/pool/main/o/opense-basic/opense-basic_3.2.1-1_all.deb',
    'https://mirrors.edge.kernel.org/debian/pool/main/o/opense-basic/opense-basic_3.2.1-1_all.deb'
)

def grab(url, maxbytes=8_000_000):
    req=urllib.request.Request(url,headers={'User-Agent':'MDjs-Ultra-bootstrap/0.1 (local open-source download)'})
    with urllib.request.urlopen(req, timeout=25) as r:
        data=r.read(maxbytes+1)
    if len(data)>maxbytes: raise ValueError('Download exceeds allowed limit')
    return data

def ar_members(deb):
    if not deb.startswith(b'!<arch>\n'): raise ValueError('Not a Debian ar archive')
    pos=8
    while pos+60<=len(deb):
        h=deb[pos:pos+60];pos+=60
        if h[58:60]!=b'`\n': raise ValueError('Invalid ar header')
        name=h[:16].decode('ascii').strip().rstrip('/')
        size=int(h[48:58].decode('ascii').strip())
        if size<0 or pos+size>len(deb): raise ValueError('Invalid ar member size')
        yield name,deb[pos:pos+size]
        pos+=size+(size&1)

def read_rom(deb):
    for name, bytes_ in ar_members(deb):
        if name.startswith('data.tar.'):
            with tarfile.open(fileobj=io.BytesIO(bytes_),mode='r:*') as t:
                targets=[m for m in t.getmembers() if m.name.endswith('/opense.rom') and m.isfile()]
                if len(targets)!=1: raise ValueError('Expected one OpenSE ROM')
                rom=t.extractfile(targets[0]).read(16385)
                if len(rom)!=16384: raise ValueError('Unexpected ROM size: '+str(len(rom)))
                return rom
    raise ValueError('No data archive containing OpenSE ROM')

def main():
    vendor=ROOT/'vendor';vendor.mkdir(exist_ok=True)
    pinned=json.loads(LOCK.read_text()) if LOCK.exists() else None
    hashes={}
    for filename in FILES:
        dest=vendor/filename
        if not dest.exists() or not dest.stat().st_size:
            content=grab(BASE+filename)
            if filename.endswith('.js') and b'function' not in content and b'class' not in content:
                raise ValueError('Unexpected JS response '+filename)
            # Preserve upstream bytes separately so repeat installation is idempotent.
            dest.write_bytes(content)
            print('Downloaded:',dest.relative_to(ROOT),len(content),'bytes')
        else:content=dest.read_bytes()
        digest=hashlib.sha256(content).hexdigest()
        if pinned and digest!=pinned.get(filename):
            raise RuntimeError('Vendor hash changed for '+filename+'; do not silently update dependencies')
        hashes[filename]=digest
    if not pinned:LOCK.write_text(json.dumps(hashes,indent=2,sort_keys=True)+'\n')
    # Local integration runs as a distinct file so upstream remains unmodified.
    derived=vendor/'MinZX-mdzx.js'
    derived.write_text(patch_minzx((vendor/'MinZX.js').read_text()))
    romfile=ROOT/'roms/zx48.rom';romfile.parent.mkdir(exist_ok=True)
    if not romfile.exists():
        errors=[]
        for mirror in MIRRORS:
            try:
                pkg=grab(mirror)
                if hashlib.sha256(pkg).hexdigest()!=ROM_SHA:raise ValueError('Debian package SHA256 mismatch')
                rom=read_rom(pkg)
                romfile.write_bytes(rom)
                print('Downloaded OpenSE BASIC 3.2.1:',romfile.relative_to(ROOT),'16384 bytes')
                break
            except Exception as e:
                errors.append(str(e))
        else: raise RuntimeError('ROM download failed: '+'; '.join(errors))
    info=check_local_rom()
    print('Local ROM verified:', info['sha256'])
    print('\nREADY: run python3 -m http.server 8000 and open http://localhost:8000/zx-ultra.html')
    print('Review MinZX MIT and user ROM provenance in zx/LICENSES.md')

if __name__=='__main__':main()
