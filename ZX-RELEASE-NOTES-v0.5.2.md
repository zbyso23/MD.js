# MD.js Ultra ZX v0.5.2 — local verification / source release

**Branch:** `feature/zx-ultra` (included as local Git history; nothing pushed to remote).

## What is delivered

- Original MD.js Reborn v0.4.5 reader, Mermaid-like diagrams and DocUX remain in place.
- ZX embedded screen with fullscreen Workbench, an experimental 48K Z80 adapter around MinZX, and OpenSE BASIC bootstrap installer.
- Pure JavaScript ZX `.SCR` decoding, 2×/4×/Fit preview, FLASH, export as SCR/PNG and import to emulator RAM.
- Two-pass limited **Z80 ASM Lite** with RAM injection, CPU state view, Step/Run/Pause/Reset, 128-byte hex memory preview.
- Validated TAP reader and experimental standard-ROM loader hook; 48K SNA import/export.
- Error-safe ROM initialization (XHR 10-second timeout; UI watchdog at 15 seconds), failure cleanup, retry, and teardown protection.
- SNA direct PC restore + stack adjustment + RETN-equivalent IFF1 restoration.

## Reproduced validation

| Category | Result |
|--|--|
| MD.js Node tests | 170 passed |
| ZX Node tests | 28 passed, **3 skipped** without real Z80 vendor |
| Python vendor adapter tests | 2 passed (synthetic source fixture) |
| Chromium mock-CPU E2E | **15 passed** |
| Total passed | **215** |
| Real emulator/OpenSE boot | **BLOCKED / unverified** |
| Real TAP/BASIC load and SNA roundtrip | **Unverified** |
| SkoolKit reference | Not installed |

The actual upstream MinZX and OpenSE ROM **are not bundled**. Container outbound DNS is blocked. The asset installer checks Debian package SHA-256 and creates a local vendor-hash lock on the first installation; this is **not a universally pinned upstream revision**. A release candidate must pin MinZX to a reviewed commit and run real hardware tests before claiming compatibility.

## Run

```bash
python3 zx/fetch-assets.py
npm run test:all
npm run test:zx:real    # hard gate: fails if ROM/vendor missing or actual boot fails
./zx/run-local.sh
```

Then visit `http://localhost:8000/zx-ultra.html`, `zx-in-markdown.html` or `zx-screen-demo.html`.

**Manual acceptance gate:** Boot OpenSE BASIC on real MinZX, verify keyboard input, mount `HELLO.TAP`, execute `LOAD ""`, inspect program and take/reload SNA. Test different legitimate user ROMs separately; don't assume the `$0556` hook works with custom loaders.

Atari 800, Commodore 64, Apple II, PC/DOS, Blockly-lite and Micro JS-Torch remain **roadmap only**. The Markdown BLOB manifest and in-document `.SCR` BLOB embedding are not yet shipped.
