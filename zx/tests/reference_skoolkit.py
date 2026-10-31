#!/usr/bin/env python3
"""Optional developer-only independent Spectrum tape simulation with SkoolKit.
Install separately: python3 -m pip install skoolkit
This does not ship with, nor run inside, MD.js.
"""
from pathlib import Path
import os
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
DEMO = HERE.parent / 'demos/HELLO.TAP'


def run(args, timeout):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)


def main():
    tapinfo = shutil.which('tapinfo.py')
    tap2sna = shutil.which('tap2sna.py')
    if not tapinfo or not tap2sna:
        print('SKOOLKIT BLOCKED: install test-only SkoolKit: python3 -m pip install skoolkit', file=sys.stderr)
        return 2
    result = run([tapinfo, str(DEMO)], 20)
    if result.returncode:
        print('SkoolKit TAP analysis failed:\n' + result.stderr, file=sys.stderr)
        return 1
    print('SkoolKit TAP inspection:\n'+result.stdout[:3000])
    with tempfile.TemporaryDirectory(prefix='mdzx-skoolkit-') as d:
        output=Path(d)/'hello.z80'
        result=run([tap2sna, str(DEMO), str(output)], 90)
        if result.returncode or not output.is_file() or output.stat().st_size < 30:
            print('SkoolKit simulated LOAD failed:\n'+result.stdout+'\n'+result.stderr,file=sys.stderr)
            return 1
        print('PASS: independent SkoolKit tape simulation produced',output.stat().st_size,'bytes .z80 snapshot')
    return 0


if __name__=='__main__':
    sys.exit(main())
