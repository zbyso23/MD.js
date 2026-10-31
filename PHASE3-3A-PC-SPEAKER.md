# MD.js Ultra — Phase 3A: PC Speaker (limited / preview)

**Status:** functional native-JS PIT2/port 61h → deterministic 22,050 Hz PCM → opt-in WebAudio. **NOT yet full Gate 3.**

## What changed

- `optional/pc/PC-Audio.js`: deterministic speaker square/pulse renderer. Tracks CPU instruction-time, PIT 1,193,182 Hz, channel 2 divisor, modes 2/3, 61h gate and speaker data enable. No audio work when muted; 65,536-sample bounded PCM queue. Unsupported PIT modes are deliberately silent (not fake success).
- `optional/pc/PC-Audio-Output.js`: native WebAudio AudioBuffer streaming; creates AudioContext only after click, opt-in, flush on pause/reset/mute, bounded queued playback. No npm/build/CDN dependency.
- `optional/pc/PC-Machine.js`: speaker integration into guest x86 I/O and snapshot; previous v0.8.2 snapshots without audio still import. PIT2 port read reflects simplified countdown, not all historical PIT status bits.
- `optional/pc/index.html`: opt-in audio buttons and isolated guest x86 PIT2 demo. XT and AT test tones do **not** alter the live FreeDOS machine.
- `optional/pc/phase3/speaker-3a.test.cjs` and `test_speaker_browser.py`: fixed clock/PCM behavior and real browser opt-in test.
- All pre-existing PC browser test harnesses that inline their JavaScript gained the two new native audio scripts.

## Hardware accuracy limitations

- CPU ISA core timing remains four synthetic clock units per guest instruction; this is **not instruction-level bus/cycle-accurate** 8088/286 audio timing.
- Emulates only PIT channel 2 audible mode 2 and mode 3; mode 0 PWM, other modes, real 8253 latch behavior, pit OUT2 reflected on port 61h bit 5, gate retrigger nuances, DC/analog filtering and some device status remain future work.
- Existing PIC/8253/DMA imperfections are not cured; no Covox, OPL2 synthesis or SB2 DMA/IRQ implemented in this milestone.
- `file://` browser navigation still cannot be end-to-end verified in this restricted Chromium environment; Chromium smoke uses inline scripts. WebAudio is opt-in by real user click.

## Supplied source provenance

`src.zip` supplied 16 sources: `8255.cpp`, `adlib.cpp/h`, `iohandler.cpp`, `mixer.cpp`, `opl.cpp`, `pcspeaker.cpp`, `sblaster.cpp`, `timer.cpp`, `vga.cpp`, `vga_attr.cpp`, `vga_crtc.cpp`, `vga_dac.cpp`, `vga_draw.cpp`, `vga_gfx.cpp`, `vga_memory.cpp`.

They are archived as **reference-only** under `optional/pc/vendor/dosbox-x-audio/src/hardware/` with per-file SHA256 in `UPSTREAM-MANIFEST.json`. The ZIP did **not** include a reliable upstream revision/provenance manifest. Most headers say GPL v2-or-later. `8255.cpp` had no explicit license/copyright header: mark as **license unverified**. Do **not** claim identical to DOSBox-X pinned commit `029bd65c5dcc7cdc7f2e14e35278620d9707d969` until upstream binary comparison; source gate remains marked **BLOCKED** on revision provenance. All new JS is self-authored and GPL-3.0-only; bundled C++ remains reference-only and is never executed.

### Still needed before next stages

- 3B (Covox): `src/hardware/parport/parport.cpp` and relevant LPT registration/interfaces (passive Covox, *not* Disney Sound Source).
- 3C (AdLib/OPL2): `src/hardware/opl.h`, `src/hardware/dbopl.cpp`, `src/hardware/dbopl.h` and required headers; `opl.cpp` and `adlib.cpp/h` supplied.
- 3D (SB 2.0): `src/hardware/dma.cpp`, `include/dma.h` and related channel transfer constants, with headers used by `sblaster.cpp`; PIC baseline exists.
- Commit/version provenance and `8255.cpp` licensing for the whole received source set.

## Test commands

```sh
npm test
npm run test:blocks
npm run test:zx:unit
npm run test:pc:phase1
npm run test:pc:phase3:preflight
npm run test:pc:phase3:speaker
python3 optional/pc/tests/test_freedos_browser.py
npm run phase3:source-gate       # intentionally nonzero until upstream revision is verified
```

**Observed this working copy:** 192 Markdown, 54 Blocks, 31 ZX, 241 PC PASS; 23 Phase3 preflight PASS and 5 TODO; 10 speaker-3A tests PASS (part of preflight count); XT/AT Chromium WebAudio demo PASS; XT/AT FreeDOS Chromium boot + XT DEBUG + AT DIR PASS. Not all browser suites/release gate were run in a single complete command in this milestone.

### Development boundaries remain frozen

No WASM/C++, transpile, bundler, third-party runtime dependency, runtime internet/CDN, x86 386+, memory beyond 1 MiB, or automatic guest/emulator/audio launch from Markdown. Reference C++ must remain outside runtime.
