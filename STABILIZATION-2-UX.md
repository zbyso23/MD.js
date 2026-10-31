# MD.js Ultra — Stabilization 2 / UX, AT 286 and Arduino Toy Lab

**Date:** 2026-10-23  
**Basis:** provided `MDjs-Ultra-v0.8.2-STABILIZATION-1-PERSONAL_20261023215313.zip` (not an imagined clean repository).  
**Branch/baseline:** existing `eea40ba` git HEAD plus prior S1 working-tree corrections.  
**Scope:** regression and usability fixes, **not** Phase 3 sound/Phase 4 VGA/IDE development.

## Confirmed problem: Arduino Blink did not visibly blink

`optional/blockly/MD-Blocks-UI.js` previously called `MDBlocks.simulate(program,3,inputs())` **synchronously** on each click, then rendered only `result.pins` and the final actuator values. For the Blink lesson the final LED state is LOW, so the user never sees any HIGH/LOW transitions. Repeating sensor inputs also jumped directly to the third cycle's final output.

**Fix:** the allowlisted deterministic interpreter remains in `MD-Blocks.js`. A small new standalone, native-JS `Blocks-Playback.js` groups its immutable trace by virtual timestamp and assigns a **pedagogical presentation delay** (default 2000 ms per distinct timestamp, configurable 1200/2000/3500 ms, capped at twice the base interval for long virtual delays). The UI plays these groups using a cancellable timer. It updates the LED, PWM, servo, stepper, time and trace *step by step*. Pause preserves the board. Step advances exactly one timestamp group. Preset changes, reset, import, active edits and changing inputs cancel/rebuild playback so previous timers cannot bleed into the next program.

**Important distinction:** the 2-second rule applies to educational on-screen animation. It does **not** change the Arduino export's `delay(...)`, simulate real UNO clock cycles, emulate electronics, or force the user's generated sketch to run slowly on a physical device.

## PC AT / 286 investigation

**Verified behavior:** genuine FreeDOS 1.4 reaches `A:\>` on XT and AT in Chromium; `DIR` works on AT. Protected-mode LGDT/LMSW, IDT, IRQ and CPU ALU diagnostics pass *within their documented partial implementation*. There is **no evidence in this audit of a general failure to boot FreeDOS on AT**.

**Reproduced UX deficiency:** the profile selector used to replace the machine with a ROM-reset instance without starting FreeDOS; users changing XT → AT could mistake this for a broken emulator. Now profile change, Reset and video adapter selection explicitly reset and boot the embedded 720-KiB disk; the user gets prompt/status feedback. Changing these settings is a deliberately **destructive reset** of live guest state (as previously documented), not a hot-swap.

**Known, NOT fixed hardware limit:** the supplied `DEBUG.COM` takes an incompatible 386-detection/prefix-66h path under authentic 80286 handling. User-facing AT warning now states DEBUG.COM is XT-only in this personal image. We did **not** silently accept 386 instructions, implement complete 286 protected mode, or provide a replacement debugger. Other user-reported 286 problems without reproducible steps remain to be diagnosed.

## Regression / quality gates

| Check | Result |
| --- | --- |
| MD / runtime Node tests | **192 PASS** |
| Blocks Node (old 49 + new 5) | **54 PASS** |
| ZX Node | **31 PASS** |
| PC Node (including S1 snapshot 2 tests) | **241 PASS** |
| Blocks browser: actual slow Blink HIGH → LOW, pause, step, preset cancellation | **PASS**, Chromium |
| Blocks browser: inputs/PWM/servo/stepper/Blink/theme | **PASS**, Chromium |
| Blocks browser: real DnD, nested drop/undo/redo, ZX keyboard | **PASS**, Chromium |
| XT FreeDOS → DEBUG R/Q, AT FreeDOS → DIR after profile switch | **PASS**, Chromium |
| PC browser protected-mode/IRQ/ALU/diagnostics | **PASS** |
| PC Universal runtime and ZX Universal runtime opaque-origin | **PASS**, not authentic file:// navigation |
| Full ultra browser charts/blocks | **PASS** |
| UX Shell extended stress (PC 30 drawer cycles, ZX, Blocks 25 cycles) | All three test stages printed **PASS** on the focused run; command completion status not captured in the time-bounded shell |
| `npm run test:release` monolithic, one completed invocation | **NOT VERIFIED** — command timed out after individual Node groups and PC E2E; remaining gates subsequently invoked separately |
| Genuine local `file://` in Chrome/Firefox/Edge | **NOT VERIFIED** due local harness restrictions |

**Unit totals:** **518 green** = 192 + 54 + 31 + 241, tested in this run (not a claim that every behavior is covered). A successful unit suite does not certify full hardware compatibility.

## Remaining priorities

1. Obtain a minimal reproducible 286 failing program with expected/actual behavior. Add **guest-level** failing regression and repair the specific CPU/peripheral implementation, respecting 80286-only limits.
2. Run the monolithic release gate to completion on the user's host/CI (may be slower than individual suites) and a real local `file://` cross-browser check.
3. Add a long-running Blocks lesson with mixed `delay(0)`, repeated time groups, fast edit/pause/input changes, export/import roundtrip, and visual accessibility tests.
4. Historical HGC raw vs CRT 4:3 aspect remains the previously documented separate issue; no change to raw framebuffer or to current scaling policy in this stabilization wave.

## Test entrypoints

```sh
npm run test:blocks
npm run test:pc:phase1
npm run test:stabilization2
npm run test:ux:browser
npm run test:ux:shell
npm run test:release
```

**Delivery/licensing:** PERSONAL archive; preserve supplied ZX ROM, FreeDOS+DEBUG and existing Git history. Do not treat as OSS-redistributable PUBLIC build. No runtime npm dependencies, CDN, WASM, C++ compilation or bundling were introduced.
