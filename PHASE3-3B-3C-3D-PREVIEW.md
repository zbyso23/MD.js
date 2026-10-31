# MD.js Ultra — Phase 3B/3C/3D limited previews

**Date:** 2026-10-24. **Base:** v0.8.2 Phase 3A PERSONAL, including Stabilization 1+2. **Phase 3 gate: NOT CLOSED.**

## Implemented now

### 3B — Covox / LPT1

- Real guest x86 `OUT DX, AL` to `0x378` changes an 8-bit, unsigned *passive* DAC output latch.
- Holding the most recent DAC value generates deterministic 22,050-Hz PCM from emulated CPU time. Shares the existing bounded audio sample queue with PC Speaker.
- LPT1 `0x378` data readback, `0x379` fixed-status approximation, and `0x37A` control latch implemented for the XT and AT machine profiles.
- Mixed with PC Speaker and other Phase 3 sound, without emulated DMA for passive Covox.
- Snapshot/import saves latch and audio state; the older Phase 3A and v0.8.2 formats still import.

### 3C — AdLib / OPL2 (limited, **not full DBOPL**)

- Pure browser JS implementation with 9 two-operator FM channels, F-number/block, 2-op FM/additive mode, key-on/off, an approximate ADSR envelope, feedback and four OPL2 waveforms.
- Guest `OUT 388h/389h` programs OPL registers and returns status; timer 1/2 flags are driven by emulated time and support reset/masks.
- Existing PC audio PCM stream now mixes OPL2 sound with PC Speaker and Covox.
- **Explicit limitations:** no supported OPL2 rhythm/percussion synthesis; envelope shape/rate and operator key-scaling are approximate, and are **not** mathematically faithful DBOPL. Browser smoke confirms audible PCM exists, not historical frequency/ADSR equivalence. AdLib timings/status need independent golden vectors before a real OPL2 gate.
- Hardware OPL3, stereo OPL3 and SB16 remain explicitly out of scope.

### 3D — Sound Blaster 2.0 (limited DSP/DMA/IRQ preview)

- Basic DSP reset (`0x226`), data/status ports (`0x22A`, `0x22C`, `0x22E`), version reply **2.01**, amplifier on/off, time constant, 8-bit PCM single-cycle `0x14`, 8-bit auto-init `0x1C` with block size `0x48`, halt/resume/exit-auto and IRQ ack.
- DMA channel 1 reads actual emulated RAM via 8237 address/count/page/mask/mode, including 64-KiB offset wrapping. Samples are unsigned mono, processed against emulated audio time; completion requests IRQ5 (configurable internally to 7).
- DMA progresses even with WebAudio muted; no invented IRQ when the DMA channel is masked or programmed for the wrong transfer direction. PCM data is read, not written, preserving guest RAM.
- DSP unsupported command bytes are recorded, not claimed to function. No 16-bit stereo, DSP 4.xx or OPL3.
- **Explicit limitations:** no full ISA bus arbitration/timing, incomplete SB2 DSP command set, no DOS-game compatibility gate, incomplete mixer characterization and noncycle-accurate CPU. Auto-init tested at the device level; more independent hardware-derived vectors are needed.

### UX and runtime

- Optional Workbench click-to-enable audio and isolated **PC Speaker / Covox / AdLib / SB2** demos; diagnostic programs use real guest x86 IN/OUT and never overwrite the live DOS CPU/RAM/FDD.
- WebAudio is initialized only after user gesture; mute clears queued playback. No runtime npm, C++, WASM, bundler, transpiler or remote CDN.
- Existing platform constraints are unchanged: XT 8086 ISA / 8088 target, AT 80286, up to 1 MiB installed RAM.

## Sources and licenses

The user supplied `dbopl.cpp`, `dbopl.h`, `opl.h`, `dma.cpp` (named `dma(1).cpp` on upload), `dma.h` and the `parport.zip` sources on 2026-10-24. They were added **as C++ reference-only assets** to `optional/pc/vendor/dosbox-x-audio/` with SHA-256 manifest entries. They are **not** compiled or loaded by browser runtime.

Headers indicate GPL-2.0-or-later for the DOSBox team C++ reference files and LGPL-2.1-or-later for `opl.h`. Some additional `parport.zip` content and older `8255.cpp` have unverified per-file licensing metadata. User-upload provenance **does not** independently prove identity with the pinned DOSBox-X upstream commit `029bd65c5dcc7cdc7f2e14e35278620d9707d969`. Therefore **the upstream source gate intentionally remains BLOCKED**, despite all 15 currently required source paths being available; four *recommended* references remain absent. See `npm run phase3:source-gate` and `node optional/pc/phase3/check-audio-sources.cjs --stage=ALL`.

The newly authored browser JavaScript is project code licensed GPL-3.0-only; it is not a direct C++ translation or bit-exact DBOPL port.

## Fresh tests on this working tree

| Suite | Result |
|---|---|
| Markdown / Runtime (`npm test`) | **192 PASS** |
| Blocks (`npm run test:blocks`) | **54 PASS** |
| ZX (`npm run test:zx:unit`) | **31 PASS** |
| PC (`npm run test:pc:phase1`) | **241 PASS** |
| Phase 3 preflight/device (`npm run test:pc:phase3:preflight`) | **46 PASS**, 5 **TODO**, 0 FAIL |
| Chromium 3B/3C/3D (`npm run test:pc:phase3:browser`) | **6 demos PASS** (XT + AT for each hardware category) |
| Chromium 3A speaker | **XT + AT PASS** |
| Chromium FreeDOS | **XT/AT boot + XT DEBUG R/Q + AT DIR PASS** |
| Chromium UX Shell | **PC/ZX/Blocks PASS** |
| Source provenance (`npm run phase3:source-gate`) | **BLOCKED**, upstream revision unverified |

Total of the recorded **unit-level** suites above: **564 PASS + 5 TODO**; this total excludes browser checks and does not equate to completed hardware compatibility. A single monolithic `npm run test:release` was **not** executed for this milestone.

## Remaining Phase 3 quality gates

1. PC Speaker: exact mode/port/timing behavior and optional historical speaker filtering.
2. Covox: calibrated DAC, LPT quirks, stress and external timing vectors.
3. OPL2: validate operator tables, rhythm mode and timer status vs golden vectors; converge from approximate envelopes to proven native-JS OPL2 behavior.
4. SB2: expand actual DSP 2.01 command set, strict DMA terminal-count / IRQ handshakes, PIC EOI end-to-end and representative legally supplied DOS software.
5. Mixed real-time FreeDOS + video + sound long runs, snapshots mid-transfer, deterministic PCM hashes and `file://` Chrome/Firefox/Edge testing.
6. Independently establish DOSBox-X source revision and provenance; resolve unverified per-file license headers. **Do not mark Gate 3 PASS until these checks and behavioral limits are handled.**

**Important:** archival `PERSONAL` ZIP contains the user's OpenSE BASIC ROM, FreeDOS image and `DEBUG.COM` with redistribution rights that have not been fully validated. Not a public release.
