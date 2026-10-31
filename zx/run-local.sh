#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f zx/vendor/Z80.js || ! -f zx/vendor/MinZX-mdzx.js || ! -f zx/roms/zx48.rom ]]; then
  echo "[MD.js ZX] Missing assets: running first-time fetch..."
  python3 zx/fetch-assets.py
fi
echo 'Open http://localhost:8000/zx-ultra.html (or /zx-in-markdown.html)'
python3 -m http.server 8000 --bind 127.0.0.1
