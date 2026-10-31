# MD.js Ultra / ZX — Verified local milestone v0.5.2

**Scope freeze:** ZX Spectrum 48K only. Atari 800, C64, Apple II and PC/DOS remain future adapters in the roadmap; no implementation in this release.

## Implemented

- Optional vanilla JS ZX module in Git branch `feature/zx-ultra`; embedded Markdown shows the screen, fullscreen opens Workbench.
- State machine now reports BOOTING until a 16 KiB ROM has actually loaded. Distinct error callback; no false RUNNING on missing ROM. Patched MinZX tracks its animation request and avoids CPU execution while paused or destroyed; unmount cancels request and disconnects sound nodes. Failed ROM requests trigger error/retry (XHR timeout 10 s, UI watchdog 15 s), rather than hanging in BOOTING.
- ROM patching done on a derived `MinZX-mdzx.js`, preserving the unmodified upstream `MinZX.js`; no global override for a user-supplied ROM. The installer checks Debian package SHA-256 and keeps a local SHA-256 lock of upstream files for subsequent runs.
- TAP block parser/checksum, experimental ROM LD_BYTES fast loader at `$0556`; only standard tapes, not custom turbo loaders. `HELLO.TAP` fixture.
- SNA 48K (49179 bytes) import/export. Restore PC directly from snapshot stack, avoiding original Sinclair ROM `$0072` RETN dependency. Restore IFF1 from IFF2 to preserve RETN semantics. Validate stack pointer before loading.
- `.SCR` native decoder for exactly 6912 bytes (bitmap plus attributes): ZX unusual byte row layout, 16-color palette, BRIGHT, FLASH, nearest-neighbor 2×/4×/Fit, save SCR/PNG, import into live emulator RAM. Self-contained demo `zx-screen-demo.html`, sample `zx/demos/CHECKER.SCR`.
- Real two-pass teaching assembler in `zx/ZX-ASM.js`: limited core Z80 mnemonics, two-pass labels, JR offsets, DB/DW, ORG >= $4000, 32KiB program limit, no eval/macros. Fullscreen editor can load output into RAM and execute at ORG. This is **ASM Lite**, not a full Z80 assembler or IDE.

## What was actually run

| Category | Result |
| --- | --- |
| MD.js regression | 170 passed |
| ZX unit/integration (TAP, ASM, SCR etc.) | 28 passed; 3 real Z80 unit tests skipped because vendor CPU unavailable |
| Deterministic vendor patch Python tests | 2 passed |
| Chromium browser E2E with deterministic CPU fake | 15 passed |
| Actual Chromium SCR pixel rendering | PASS (real 2D canvas + screenshot; `ZX-Screen.js` runtime only) |
| Actual Z80 ROM boot | **BLOCKED: vendor and OpenSE ROM absent in environment (strict test exit 2)** |
| Actual TAP `LOAD ""` / SNA roundtrip through ROM | **NOT VERIFIED** |
| Real-browser CPU/ROM/ASM E2E | **BLOCKED: ROM and vendor CPU absent** |

All green checks for mock E2E verify UI and integration, not real emulation accuracy. The Python patch test uses representative MinZX source excerpts; it does **not** substitute for running patched upstream code.

## Verification on an online Ubuntu workstation

```bash
python3 zx/fetch-assets.py
npm run test:all
npm run test:zx:real      # mandatory hard gate; fails if assets absent
./zx/run-local.sh
```

Then use http://localhost:8000/zx-ultra.html for emulation and http://localhost:8000/zx-screen-demo.html for the ROM-independent screen preview.

**Manual ROM gate:** Boot OpenSE BASIC, focus the screen, type BASIC, mount `zx/demos/HELLO.TAP` and try `LOAD ""`; verify against SkoolKit/reference emulator. DO NOT report full TAP or ROM compatibility without this.

## Deferred intentionally

- Full OpenSE BASIC boot validation and tape-loading compatibility (await actual assets)
- Full Z80 assembler, debugger breakpoints, disassembly, editing multiple files
- TZX, Z80 snapshot, real tape waveform, 128K and sound-worklet modernization
- Markdown Ultra BLOB manifest integration, `.SCR` inline block embedding (screen API now available)
- Atari 800 / C64 / Apple II / PC-DOS: roadmap only, platform interface not implemented
- Blockly-lite and Micro JS-Torch: optional future environments, not included

No emulator core or ROM has been fabricated or silently substituted. The package contains the validated source integrations and a downloader for externally hosted upstream files.
