> **Current Phase 3 status (2026-10-24):** 3A/3B/3C/3D limited previews implemented.
> TUNE.COM now runs in *real FreeDOS* on XT and AT; upstream provenance and
> full hardware accuracy remain open. Earlier "unimplemented" sections below
> document the historical source-first design and are not current status.

# Phase 3 — Audio SOURCE GATE / Design and test contract

**Status as of Phase 3A preview:** the user provided the five required PC Speaker reference files; an initial limited PIT2/61h → PCM → opt-in WebAudio implementation and browser/unit regressions now exist. **Formal provenance gate remains BLOCKED** because the ZIP contains no independently verified upstream commit/revision; see `../../../PHASE3-3A-PC-SPEAKER.md`. Phases 3B/3C/3D remain unimplemented.

## Frozen goals

- Native, unbundled browser JS/HTML/CSS. No WASM, C++ compilation, CDN, build or mandatory Node at runtime.
- XT 8088 target (existing 8086 ISA core), AT 80286 only, installed system RAM never above 1 MiB.
- Only PC Speaker, passive Covox LPT DAC, AdLib/OPL2 and SB 2.0. No OPL3, SB16, 386.
- Every audible signal must originate from *guest CPU I/O*, PIT/PCM/DMA. WebAudio is only the output adapter after an explicit user gesture.
- No part of the normal Markdown renderer should launch optional emulation or audio automatically.

## Source-first gate

Existing vendor source set has `pic.cpp`, `pic.h`, BIOS and CPU, but not `pcspeaker.cpp`, `timer.cpp`, `dma.cpp`, `sblaster.cpp`, OPL2 or mixer.

`source-requirements.json` pins the same DOSBox-X revision mentioned in prior handover: `029bd65c5dcc7cdc7f2e14e35278620d9707d969`. Ask the user for these exact files, their relevant headers, a commit/version statement and preserved license/copyright headers. Do NOT introduce an independent reimplementation of a peripheral until its semantics have been reviewed from suitable sources.

File placement when provided: `optional/pc/vendor/dosbox-x-audio/src/hardware/...`; `UPSTREAM-MANIFEST.json` must have `upstream`, `revision`, and `files: [{path,sha256,license}]`. `node optional/pc/phase3/check-audio-sources.cjs --stage=3A` checks the first milestone (5 required files). Add `--stage=3B`, `3C`, `3D`, or `ALL` for later/comprehensive gates; each later milestone includes earlier files. **A passing manifest check does NOT prove the files match upstream**; independently confirm against the pinned commit and review each license/copyright notice. This is dev-only tooling.

The source gate deliberately returns a failing exit code when sources are missing. This is a correct **blocked** outcome, not a project-wide unit-test failure.

## Planned audio architecture (proposal, subject to source review)

```
Guest x86 IN/OUT
   |          |           |           |
 PIT2/61h   LPT data    0x388/389   SB2 DSP 0x22x
   |          |           |           |
 Speaker     Covox        OPL2        DMA1 <- guest RAM
   |          |           |           |
   +----------+-----------+-----------+
                    |
     deterministic emulated-time PCM mixer
                    |
           opt-in WebAudio adapter
```

- One emulated time domain, not one oscillator tied to `requestAnimationFrame` per device. PIT clock 1,193,182 Hz as an engineering target, subject to verified reference details.
- Headless deterministic PCM buffer generator for golden vectors, plus browser WebAudio after user gesture; no reliance on host audio timing in device protocol.
- One shared OPL2 FM instance for AdLib and SB2; no double output.
- DMA1 reads bounded guest RAM using programmed address/count/page/mode; hard-stop unsupported commands and out-of-bounds operations.
- IRQ path via existing PIC with explicit DSP ack and DOS-compatible EOI semantics.
- Retain snapshot restore backward compatibility where practical; clear queued output on reset/pause/import.
- Audio should not keep playing after guest reset, page navigation, destroyed workbench, or user mute.

## Existing technical obstacles confirmed in this archive

1. `PIT8253.advance(ticks)` currently only changes channel **0** (IRQ0), not channel 2 for speaker. `PCMachine.run(n)` advances a separate BIOS guest-instruction accumulator, not a unified PIT clock.
2. Port `0x61` is just `kbcOutput` read/write, no gate/output waveform.
3. DMA8237 records register state but explicitly has no peripheral transfers. DMA1 page port `0x83` is not wired; only channel2 page port `0x81` is partially handled.
4. PIC is present, but no DSP-triggered IRQ or audio device exists.
5. LPT and 0x388/0x389 and SB2 DSP are not hooked into `PCMachine.in8/out8`.

## Implementation milestones and gate

- **3A Speaker / Clock:** from genuine x86 `OUT 43h,42h,61h` produce sample-accurate headless mono PCM; test mode/gate/frequency/reset/pause. Only after reviewing speaker/PIT/PPI sources.
- **3B Covox:** guest `OUT 378h` passive 8-bit DAC produces PCM changes. The Disney Sound Source is *not* the same device; no invented DMA support.
- **3C OPL2:** guest register writes 388h/389h trigger actual OPL2 FM synthesis, envelopes/status/timers, no OPL3; golden PCM/status tests.
- **3D SB 2.0:** DSP reset, version identification, supported 8-bit mono commands, real DMA1 RAM→PCM plus 5/7 IRQ ack/EOI; reject SB16 extensions.
- **Combined Gate:** XT+AT FreeDOS boot, video, audio concurrency, snapshot/restore and deterministic PCM hashes; test browser user gesture, mute and `file://` (if test environment permits).

## Running this milestone

```sh
npm run test:pc:phase3:preflight   # 13 PASS + 5 TODO; no sound claimed
npm run phase3:source-gate              # 3A gate, intentionally BLOCKED until 5 files provided
npm run phase3:source-gate -- --stage=ALL  # 14 required references for all milestones
npm test
npm run test:blocks
npm run test:zx:unit
npm run test:pc:phase1
```

Do NOT advance beyond the source gate without the required source files, explicit provenance and license check.
