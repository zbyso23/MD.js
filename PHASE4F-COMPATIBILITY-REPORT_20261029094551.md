# MD.js Ultra — Phase 4F Compatibility & Release Closure

**Build date:** 2026-10-29  
**Source:** `MDjs-Ultra-PHASE4E-PC-HARDENED-PERSONAL_20261029092043.zip` (full project, history, original personal binary assets)  
**Release chain:** baseline `npm run test:release` exit **0**, expanded `npm run test:release` exit **0** (both continuous complete runs; full logs supplied).  
**Scope freeze:** original HTML/CSS/JS, no runtime npm dependencies, no WASM, 286 maximum, 1 MiB system RAM. No hardware generation upgrades.

## What was actually fixed/closed

1. **Monolithic release gate: CLOSED.** Previously unverified whole `npm run test:release` now has two successful end-to-end invocations, including the latest `test:pc:closure` and a Chromium x87 smoke.
2. **Audio test debt: four stale TODO markers retired.** They were written before Covox, OPL2, SB2 and cross-device snapshots existed. Eight new XT/AT tests now check guest LPT DAC output, OPL register/timer semantics, DSP reset/DMA1/IRQ acknowledgment and portable audio snapshot state. Previous Phase 3 audio tests remain. **One genuine TODO remains** for historical PC Speaker fidelity (PIT modes 0/1/4/5, port 61h feedback, analog filtering, precise timing). No claims of complete YM3812/SB2 hardware accuracy.
3. **286 compatibility: bounded expanded gate, NOT full historical certification.** Added real-mode FLAGS bit-pattern coverage, explicit 386-prefix rejection on XT/AT, state roundtrip, 80287XL restriction to AT. Existing browser FreeDOS DEBUG on 286, protected-mode demonstrations, VGA, IDE and the #DE/#BR tests continue to pass. Unimplemented 286 instruction/task-switching/timing cases remain out of scope.
4. **x87 extended arithmetic: newly available experimental mode.** Added pure JS BigInt arithmetic with a 64-bit significand and 15-bit extended exponent for basic finite add/sub/mul/div, comparisons, conversion from 32-bit input, and 10-byte x87 FLD/FSTP memory operands. The distinction between `1` and `1+2^-60` is verified by guest 286 opcodes and raw m80 bytes. A `1/3` exact extended significand golden test passes. Snapshots preserve the extra digits. The Workbench now offers **x87 přesnost → 80bitová mantisa (experimentální)**; the fast binary64 mode stays default, and the x87 CPU/FPU clock selection remains 12/16 MHz. **Not yet full 80287XL:** precision-control and directed-rounding modes, all x87 ESC groups, complete exception signaling/flags and per-op cycle timing are still unsupported. Mandelbrot defaults to binary64 to avoid unnecessary slowdown.
5. **Browser `file://`: independently characterized, NOT CLOSED.** Real Chromium navigation to all four entry HTML files returned `ERR_BLOCKED_BY_ADMINISTRATOR` in this execution environment. This is an explicit browser policy, not evidence that the application code itself cannot run on file origins. Chrome, Edge and Firefox executables are absent from this environment. Added `test/compat/file-url-smoke.py` that tests genuine file origin, reports `POLICY_BLOCKED`/`NOT_INSTALLED` and exits nonzero for an incomplete gate; it does not silently substitute inline HTML. Existing browser E2E run by inline-script fallback pass but do not certify real file-origin behavior.

## Fresh validation matrix

| Check | Result |
|---|---|
| Entire baseline `npm run test:release` | **PASS, exit 0** |
| Entire expanded `npm run test:release` | **PASS, exit 0** |
| PC unit suite | **311 PASS / 0 FAIL** |
| Markdown / runtime | **192 PASS / 0 FAIL** |
| Blocks / Arduino | **54 PASS / 0 FAIL** |
| ZX Spectrum | **31 PASS / 0 FAIL** |
| Phase 3 unit / preflight | **59 PASS / 0 FAIL / 1 TODO** |
| Dedicated 286/audio/extended80 closure suite | **21 PASS + Chromium x87 PASS** (duplicates above tests; do not add to total) |
| Chromium FreeDOS XT/AT, DEBUG/286, VGA12/13, TUNE, MANDEL, IDE, UX | **PASS** in expanded release chain |
| Actual `file://` navigation / Chrome, Firefox, Edge cross-browser | **BLOCKED or NOT INSTALLED — unverified** |

The **647 distinct unit/preflight PASS** count is 311+192+54+31+59; the dedicated closure command reruns 21 tests and must not be double-counted. The single remaining TODO is not a PASS. Browser checks are extra, separately listed.

## How to reproduce

```bash
npm run test:pc:phase1
npm run test:pc:phase3:preflight
npm run test:pc:closure
npm run test:release
python3 test/compat/file-url-smoke.py --browsers chromium,chrome,edge,firefox
```

`file-url-smoke.py` requires Python Playwright and installed target browsers *for development validation only*. Exit 2 means it cannot certify the requested matrix due to policy / missing installation. Don't use `--allow-file-access-from-files` to claim normal default-policy compatibility.

Manual desktop smoke in Chrome/Firefox/Edge: open `index.html`, `optional/pc/index.html`, `zx-ultra.html` and `optional/blockly/index.html` from local disk, verify scripts load and no console errors. In PC select AT/286, VGA, 80287XL; try default binary64 `MANDEL`, `DEBUG` R/Q, `TUNE` with audio enabled, and the experimental 80bit arithmetic mode on small examples. Export and reimport a snapshot. Expect unsupported x87 features to be marked experimental, not silently assumed to work.

## Deliberately open, not disguised as PASS

- Full historical 80286 ISA, 286 protected-mode TSS/ring transitions, real timing and broad guest application compatibility.
- Authentic 80287XL complete ISA, 80-bit rounding control, exception flags/delivery, all special operands, cycle-accurate CPU/FPU coordination. The newly implemented BigInt mode covers *basic finite arithmetic* only.
- OPL2 YM3812 waveform/envelopes and SB2 DSP command completeness; one explicit PC Speaker fidelity TODO.
- Genuine `file://` operation under default policies on installed Chrome/Firefox/Edge. Requires real user-system verification.
- Binary asset redistribution rights and exact upstream source revisions for public OSS release. This is a **PERSONAL** archive.

## Packaging integrity

- Original FreeDOS 720 KiB image, `DEBUG.COM`, ROM and other existing personal binary assets: SHA-256 match the supplied source ZIP for **9** checked assets.
- Existing project screenshots restored from input archive after tests (**9** files), so browser test regeneration doesn't silently become a project change.
- This package retains the input `.git` history and adds new uncommitted source/test files; no automatic commit or change to previous history.
- Source diff against the actual input ZIP: **10** changed/new text files, available as a standalone patch.
