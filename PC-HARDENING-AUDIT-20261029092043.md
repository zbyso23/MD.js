# MD.js Ultra — PC hardening / deep regression audit (29 October 2026)

## Source of truth / recovery provenance

- **Available complete input:** `MDjs-Ultra-v0.8.2-PHASE4D-DEBUG-VGA-AUDIO-PERSONAL_20261024025608.zip` from the conversation.
- **Phase 4E recovery:** the separately supplied `MDjs-Ultra-MANDEL-FIX-COM-SOURCE_20261024043244.zip` (339-byte `MANDEL.COM`, assembler source and FAT12 updater) and `MDjs-Ultra-PHASE4E-MANDEL-FIX-REPORT_20261024043244.md` were applied on top of Phase 4D. The Phase 4E `DE` arithmetic correction was independently recreated and verified using actual guest opcodes. The 720 KiB FreeDOS image and its Base64 embedded copy were regenerated with the existing one-cluster update script.
- **Honesty boundary:** the full earlier Phase 4E ZIP was not accessible as a container-backed file in this turn. Therefore this is a **verified reconstruction**, not a byte-for-byte reproduction of the entire prior Phase 4E distribution.
- The project remains unbundled HTML/CSS/JS; no WASM, runtime npm dependency, 386 instructions or new system-RAM ceiling. Personal ROM/DEBUG/DOS binaries remain PERSONAL assets: redistribute only after licensing review.

## Code review scope

Examined `optional/pc/PC-Core.js` (8086/286 instructions, FLAGS, exceptions, x87 bridge); `PC-Machine.js` (RAM/A20, PIC/PIT/DMA, IRQ, snapshots); `PC-BIOS.js` (BIOS interrupts); `PC-Floppy.js`; `PC-IDE.js`; `PC-VGA.js`; `PC-FPU287.js`; PC Speaker/Covox/OPL2/SB2 output; Workbench HTML, the FreeDOS FAT12 boot image, and previously available PC test suites.

## Corrected defects

1. **x87 reversed operands (Phase 4E recovery):** the DE group FSUBP/FSUBRP and FDIVP/FDIVRP operations previously produced reversed arithmetic. Validated real guest encodings `DE E9`, `DE E1`, `DE F9`, `DE F1` and direct Mandelbrot reference points.
2. **Stale x87 comparison condition:** FCOM left status C1 set; comparisons now clear C0/C1/C2/C3 before applying the new condition.
3. **PIT 8253 latch command:** read-back latch requests incorrectly changed the counter access mode. Now they capture an immutable count until the required reads; partially consumed latch state is serialized in snapshots. Older snapshots without latch fields remain loadable.
4. **PIT huge advance:** IRQ0 period advancement previously looped once per elapsed timer period. It now computes remaining counter directly and latches one pending PIC IRQ0, avoiding runaway work in long diagnostic steps. This is a deliberately non-cycle-accurate model.
5. **DMA 8237 status:** terminal-count flags were sticky after reading port `08h`. Reading now clears terminal-count bits while retaining other status bits.
6. **PIC snapshot integrity:** malformed PIC masks/IRQ sets, invalid vectors, malformed initialization stages and nonboolean state values are rejected before being trusted by the newly instantiated machine.
7. **FPU nonfinite snapshot:** NaN and positive/negative infinity are now encoded explicitly in portable JSON and recovered, instead of yielding snapshots that the emulator itself refused to import.
8. **MANDEL negative test:** the browser test now explicitly verifies that when 80287XL is disabled, DOS prints `enable 80287XL` rather than entering a misleading green graphics screen. Test screenshots are written to an OS temporary directory instead of silently modifying a project screenshot.

## New regression coverage

- `hardening-regressions-20261029.test.cjs`: 11 tests — exact x87 arithmetic, PIT latch/time complexity, DMA terminal count, PIC bounds, nonfinite FPU JSON and FAT12 MANDEL binary.
- `pc-integration-hardening-20261029.test.cjs`: 11 tests — PIC priority/EOI, PIT latch snapshot + old snapshot, time arithmetic, DMA register semantics, PIC/FPU import, multiblock IDE PIO (copy-on-write), VGA/IDE/FPU/keyboard combined snapshot and 286 FLAGS.
- `mandel-geometry-regression.test.cjs`: 2 tests — nine independent mathematical Mandelbrot reference points, palette/color distribution and embedded 720 KiB image equality.
- New `npm run test:pc:phase4e:hardening`; incorporated into `test:release`, including negative/positive Chromium Mandel test.

## Fresh test evidence

| Gate | Outcome |
|---|---|
| PC unit suite (including all new tests) | **298 PASS / 0 FAIL** |
| Markdown + portable runtime | **192 PASS / 0 FAIL** |
| Blocks/Arduino | **54 PASS / 0 FAIL** |
| ZX Spectrum | **31 PASS / 0 FAIL** |
| Phase 3 audio/preflight | **51 PASS / 0 FAIL / 5 TODO** |
| Phase 4E hardening command | **24 PASS + Chromium FPU off/on PASS** |
| Browser FreeDOS | XT/AT boot, XT DEBUG R/Q, AT DIR PASS |
| Browser 286 DEBUG | AT DEBUG / R / Q PASS |
| Browser MANDEL | FPU off: warning, FPU on: 687,064 x87 instructions / 18 colors / exit to text PASS |
| Browser VGA | DOS VGA13.COM & VGA12.COM + return to DOS PASS |
| Browser IDE | copy-on-write + profile switching + eject PASS |
| Browser audio | TUNE.COM XT/AT, Speaker/OPL2/SB2/Covox isolated demos PASS |
| UX stress | PC 30 drawer cycles, ZX and Blocks 25 cycles PASS |

**Distinct positive unit/preflight counts:** 298+192+54+31+51 = **626 PASS**, 0 FAIL, plus **5 known TODO**. The Phase 4E hardening command repeats 24 tests already included in the 298 and must not be double-counted.

These suites and browser workflows passed independently. A *single uninterrupted invocation* of the entire `npm run test:release` was **not completed**. A separate attempt to collect V8 statement coverage also exceeded the time budget; do not claim comprehensive coverage percentages.

## Known limits / not certified

- CPU 80286 real and protected modes are subsets, not complete or cycle-accurate; unsupported instructions/programs remain possible.
- 80287XL is a **JavaScript binary64 teaching preview**. It is not an authentic 80-bit extended precision implementation; only tested x87 opcodes are supported, with incomplete real hardware exceptions/timing.
- OPL2/FM and Sound Blaster 2.0 are incomplete hardware previews, not full compatibility certifications; actual speaker/audio-output perception remains user-device dependent.
- VGA 12h/13h controller is not timing-accurate and lacks broad application compatibility. IDE is bounded ATA/PIO and not a confirmed bootable real DOS `C:` filesystem.
- Browser validation was via automated Chromium, not real `file://` confirmation on Chrome, Firefox and Edge on the user's OS.
- Five pre-existing audio TODO checks are intentionally still open.
- License/provenance of some supplied binary assets and the exact original upstream source revision need further review before public release.

## Manual acceptance (personal desktop)

1. Open `optional/pc/index.html` and select **XT**. Confirm FreeDOS prompt; run `DEBUG`, `R`, `Q`.
2. Select **AT/286**. Confirm `DEBUG`, `R`, `Q` and `DIR`.
3. Select **AT/286 → VGA**, run `VGA13` and `VGA12`; confirm both graphics and return to DOS.
4. With **80287XL disabled**, run `MANDEL`; expect a DOS warning, not a green screen.
5. Enable **80287XL**, run `MANDEL`; expect a recognizable multicolor fractal; press a key to exit.
6. Click **Enable PC audio** (browser gesture), run `TUNE`, and confirm the sound is actually audible on your machine.
7. Test the IDE media mount/export/eject workflow; confirm the original imported file is not overwritten automatically.

The default development test runner is `npm run test:pc:phase1`; a focused end-to-end hardening runner is `npm run test:pc:phase4e:hardening`.
