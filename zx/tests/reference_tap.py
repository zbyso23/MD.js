#!/usr/bin/env python3
"""Independent Python 3 TAP file oracle; stdlib only. Not a Z80 emulator."""
import base64
import json
import sys

MAX_FILE = 8 * 1024 * 1024


def parse(data):
    if not data or len(data) > MAX_FILE:
        raise ValueError('empty/large TAP')
    pos = 0
    blocks = []
    while pos < len(data):
        if pos + 2 > len(data):
            raise ValueError('incomplete header')
        size = data[pos] | (data[pos + 1] << 8)
        pos += 2
        if size < 2 or pos + size > len(data):
            raise ValueError('invalid block length')
        raw = data[pos:pos + size]
        pos += size
        check = 0
        for byte in raw:
            check ^= byte
        if check:
            raise ValueError('checksum mismatch')
        blocks.append({'flag': raw[0], 'payload_hex': raw[1:-1].hex()})
        if len(blocks) > 32768:
            raise ValueError('too many blocks')
    return blocks


def main():
    cases = json.load(sys.stdin)
    out = []
    for case in cases:
        try:
            value = parse(base64.b64decode(case, validate=True))
            out.append({'ok': True, 'blocks': value})
        except (ValueError, TypeError) as e:
            out.append({'ok': False, 'reason': str(e)})
    json.dump(out, sys.stdout)


if __name__ == '__main__':
    main()
