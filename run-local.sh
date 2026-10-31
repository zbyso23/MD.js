#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo 'MD.js Ultra v0.6 — http://127.0.0.1:8000'
echo 'The default launcher does not load ZX, Blockly, or Arduino modules.'
python3 -m http.server 8000 --bind 127.0.0.1
