# MD.js Ultra — PC Environment V1.1 (FROZEN)

**Date:** 22 Oct 2026  
**Status:** Phase-1 foundation acceptance completed 23 Oct 2026 (bounded CPU implementation; no full ISA or DOS boot claims). Phase 2 still pending.  
**Distribution:** Optional PC lab in MD.js Ultra. Mermaid and Charts remain built-in standard modules.

## Locked machine configurations

| Property | XT configuration | AT configuration |
|---|---|---|
| CPU | 8088 @ 4.77 MHz (8086 ISA, 8-bit bus); 8086 family test vectors | 80286 (target 12–16 MHz), real and protected mode |
| System RAM | up to 640 KiB conventional | **up to 1 MiB total installed** (conventional + any extended) |
| CPU address space | 20-bit XT physical map | 24-bit 286 physical address capability; does **not** grant >1 MiB installed RAM |
| Video | CGA, Hercules; switchable | CGA/Hercules initially, VGA in phase 4 |
| Storage | FDD 360 KiB image (and supported formats tested) | FDD, IDE added in phase 4 |
| Audio | PC Speaker; Covox + SB 2.0/AdLib added phase 3 | Same |
| OS target | FreeDOS from disk image | FreeDOS from disk image |
| Embedded DOS binary | 128 KiB maximum per BLOB | Same; floppy/IDE images external |

**Out of scope permanently:** 80386 or later, >1 MiB installed system RAM, paging/V86, OPL3, SB16, general DOSBox compatibility, and escalating to a larger DOSBox replacement. Flashback (floppy DOS) is an **aspirational compatibility target**, not a reason to break the hard cap. Commercial games are user-supplied.

## BIOS design: a single GPL-compatible path for XT and AT

**Approved decision:** direct reuse/adaptation of DOSBox BIOS source is permitted; we no longer require newly invented free AT ROM firmware. Candidates: DOSBox-X `src/ints/bios.cpp` and matching BIOS/callback/INT handlers; DOSBox Staging BIOS modules. **Not** the DOSBox internal DOS kernel as a substitute for guest FreeDOS.

A *small project-owned guest reset ROM/entry stub* must execute on the emulated CPU; it can set up vectors/BIOS entry points that dispatch to the emulator's native callback layer. INT 10h, 13h, 16h, 1Ah services and board initialization must be validated with actual 8086/286 calls. DOSBox's special callback-instruction mechanism requires an explicit bridge to the chosen CPU emulator; copying the C++ source alone will not make it executable.

**Truthful test boundary:** native BIOS service callbacks + a reset stub provide a functional emulated BIOS environment, **not** a historically authentic IBM/AMI POST ROM. For an educational PC lab the former is enough, unless real POST is separately requested. No IBM/AMI/Award dump will be bundled.

**License target:** project-authored integrated code GPLv3 (conservative GPL-3.0-only); only import files whose explicit licenses permit GPLv3 combinations, e.g. GPL-2.0-or-later, MIT or compatible terms. Keep upstream copyright, source, modifications and build scripts. See `LICENSING.md`. GPLv2-only code cannot silently be used in the GPLv3 combined build.

## Phase 1 — 8086 family + 80286, chipset, GPL BIOS

- Choose an actual 8086/8088-capable and 80286-capable CPU engine, or compatible bounded implementations; run independent instruction vectors, flags, exceptions, real mode, 286 protected mode, reset and segment-descriptor tests.
- XT/AT bus, RAM/ROM/MMIO map, I/O ports; PIT 8253/8254, PIC 8259, DMA 8237; XT keyboard handling and AT 8042, CMOS/RTC and A20 as appropriate.
- Implement/reset ROM stub and integrated **DOSBox-derived GPL BIOS callbacks**; trace CPU <-> BIOS bridge explicitly. Initialize BIOS Data Area and machine-specific tables needed for later boot.
- Test in MD.js Ultra with headless CPU test runner and browser integration. Minimal status output via register/log debugger — **no CGA/Hercules yet**.

**GATE 1 (both profiles):** CPU instruction, interrupt, port, PIC/PIT/DMA, reset/ROM-stub, BIOS-call and 286 protected-mode tests green. Validate strict installed-RAM cap with boundary tests. No claims of authentic POST.

## Phase 2 — Hercules + CGA, FDD, genuine FreeDOS boot

- CGA text/320x200 4-color/640x200 mono and Hercules text/720x348 graphics, with VRAM mapping, keyboards, display output and portable framebuffer renderer.
- XT/AT FDD controller (DMA channel 2, IRQ6 as appropriate), 360 KiB images initially; BIOS INT 13h and boot-sector loading; test file reads/writes against external disk images without mutating source media.
- **Actually boot FreeDOS** from disk images on both XT and AT. A successful DOS prompt is a browser E2E requirement, not inferred from BIOS unit tests. Test .COM and compatible .EXE programs, DOS filesystem and input/display functionality.

**GATE 2 (both):** two independent FreeDOS boots, command execution, disk roundtrips, keyboard, CGA/Hercules framebuffers and deterministic image hash tests. Preserve all Gate 1 tests.

## Phase 3 — Covox + Sound Blaster 2.0

- PC Speaker baseline; Covox 8-bit PCM over LPT.
- Sound Blaster 2.0 **real port protocol**, DSP reset/commands, 8-bit mono PCM, single-cycle and auto-init DMA behavior where supported, PIC IRQ and DMA channel 1; AdLib-compatible OPL2 (YM3812) music via SB, using permitted/reusable open-source core. Avoid double-mapping a second OPL2 at port 388h.
- Audio generation via Web Audio, synchronized with emulated CPU/device time. Realistic behavior, not a sound-only fake API.

**GATE 3 (both):** Covox sample, FM music, verified DMA read and IRQ/ack behavior, concurrent CPU/GFX/audio smoke test, and output regression. Gates 1–2 remain green.

## Phase 4 — VGA, AT IDE and final tuning

- VGA 320x200x256 (Mode 13h), 640x480x16 (Mode 12h), palette DAC/register behavior, pixel aspect/scanout; compatibility with older CGA/Hercules remains.
- IDE/ATA image for 80286 AT plus BIOS disk services and disk consistency tests; XT need not acquire an IDE port.
- Tune cycle pacing, 80286 real/protected mode switching boundaries, DMA/IRQ/sound scheduling, input latency, long-run stability; robust pause/reset/snapshot if it fits **without** scope growth.
- Acceptance software: own test binaries first, optional user media — Metal Mutant (Hercules XT), Eye of the Beholder 1 (CGA XT), Flashback floppy (VGA AT) where supported by actual program requirements. A game failing within frozen hardware limits is an explicit compatibility limitation, not authorization to raise hardware limits.

**GATE 4:** VGA palette/framebuffer reference vectors, IDE FAT/filesystem write durability, FDD nonregression, audio/CPU smoke tests and user-media compatibility reports. No unsupported game is bundled.

## Integration and release requirements across all four phases

- One **optional** `pc/` environment with machine profiles XT and AT; not injected into the Markdown parser or run automatically on document render. Embedded view is only framebuffer; full-screen Workbench exposes CPU, memory, I/O and hardware trace.
- Real CPU and real guest FreeDOS; no mocks accepted at phase gates; mocks allowed only in separate UI unit tests.
- Independent CPU reference vectors and ROM/BIOS service conformance; browser end-to-end tests for real boot and data movement.
- No hidden emulator network access; user explicitly selects external IMG/EXE/COM; validate format/size; never auto-execute arbitrary Markdown code.
- Preserve provenance/version pinning of reused DOSBox source and release corresponding editable JavaScript sources. **No WASM or compilation under any circumstance.**
- `PC-ENV-ROADMAP-v1.1-FROZEN.md` is the current authoritative plan; earlier generic references to future DOS/VGA in F4/F5 roadmap are historical. No phase 5.
