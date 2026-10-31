# ZX Ultra – verification gates v0.2

**Scope:** This package adds tests to the *existing* `feature/zx-ultra` branch. It is not a proof of a fully working Spectrum and it does not include vendor/ROM files. Runtime dependencies of MD.js remain zero.

## Layers and commands

| Gate | Run | Evidence | Status without vendor |
|---|---|---|---|
| MD.js regression | `npm test` | Existing Markdown/diagram/DocUX tests | Runs |
| TAP and fast-loader unit | `npm run test:zx:unit` | TAP lengths/XOR/bounds, state, RAM writes, ROM protection, SP wrap | Runs |
| Python oracle | Included under `test:zx:unit` | 186 deterministic TAP cases compared against a Python 3 independent parser | Runs |
| Z80 core instruction fixtures | Included under `test:zx:unit` | Genuine vendor Z80.js runs basic instruction sequences | **SKIP without vendor** |
| Browser E2E with fake core | `npm run test:zx:browser` | Real Chromium, DOM, full-screen, file import, step/pause/reset, Markdown integration | Runs with Playwright |
| Full emulator smoke (strict) | `npm run test:zx:real` | Genuine vendor + ROM loaded into real browser; basic screen-pixel test | **FAIL/BLOCK if missing** |
| Independent ZX software reference | `npm run test:zx:reference` | External SkoolKit analyzes `HELLO.TAP` and simulates `LOAD` into `.z80` snapshot | **BLOCK unless installed** |

### Setup for complete run on Ubuntu

```bash
# Runtime needs no dependencies; this is developer TEST tooling only:
python3 -m pip install --user playwright skoolkit
python3 -m playwright install chromium
python3 zx/fetch-assets.py

npm run test:all
npm run test:zx:real
npm run test:zx:reference
```

Playwright's Chromium may be provided via `CHROMIUM_BIN=/path/to/chromium` for browser mock tests. The **real** test uses `/usr/bin/chromium` if present, otherwise Playwright Chromium.

## Unproven acceptance gates (must stay red / BLOCKED until exercised)

1. ROM binary provenance: upstream is downloaded from a moving `master`, not from verified immutable commit SHA. Installation script must be pinned and each file verified before release.
2. ROM boot correctness: successful `start()` is **not** proof of initialized ROM/boot. The strict real browser smoke checks non-flat pixels and JS exceptions; a stronger screen/PC oracle is required.
3. Real `LOAD ""` of the self-generated BASIC TAP and ROM trap behavior. Compare with SkoolKit reference; account for OpenSE ROM potentially differing from Sinclair $0556 entry point.
4. SNA: load and save real snapshot and compare registers/48 KiB RAM, not just file-size validation.
5. CPU conformance: run Fuse vectors and **ZEXDOC / ZEXALL** against actual Z80.js. Three basic instruction fixtures are not a conformance suite.
6. Input semantics: real keyboard matrix, CAPS/SYMBOL SHIFT, sound after user gesture, frame timings, ULA screen/border changes, turbo tapes.
7. Lifecycle: verify teardown of CPU animation, global listeners and audio. Current `unmount()` only removes our timer/DOM and does not fully stop upstream emulation.
8. Browser security: independent CSP/security audit and tests of input provided by untrusted users. Never execute code found inside Markdown itself.

## Architectural advice

**Do not write a second complete Z80 simulator in Python.** Use independent emulator **SkoolKit** for tape/snapshot oracle; use opcode fixtures and ZEXALL/Fuse for CPU truth; compare generated snapshots/memory for the same controlled programs. Our tiny Python `reference_tap.py` is intentionally only a file-format reference, not a Z80 emulator. SkoolKit is development-only; MD.js remains vanilla JS offline at runtime.

## Known bug found while creating tests

In `readTAP` the original `bytes.slice(...)` shared memory when `input` was Node's Buffer subclass. Editing the original input then silently changed decoded `payload`. New version copies explicitly with `Uint8Array.from(bytes.subarray(...))`. Test `two consecutive blocks and input mutation ...` fails before this fix and passes after it.

**Passing browser-mock tests is not equivalent to booting the emulator.** Keep the statuses separate in CI and release notes.
