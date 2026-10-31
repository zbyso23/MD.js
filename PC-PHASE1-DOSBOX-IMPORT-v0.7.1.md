# MD.js Ultra PC Phase 1 — DOSBox-X BIOS source intake and adapter (v0.7.1)

**Status: working incremental alpha; Phase 1 gate OPEN.**

## Input

The user supplied 13 original C/C++ files from DOSBox-X: `bios.cpp`, `bios_disk.cpp`, `bios_int13.cpp`, `bios_keyboard.cpp`, `bios_memdisk.cpp`, `bios_vhd.cpp`, `callback.cpp`, `bios.h`, `callback.h`, `mem.h`, `pic.h`, `memory.cpp`, and `pic.cpp`. Unmodified copies are retained with SHA-256 manifests in `optional/pc/vendor/dosbox-x-reference/`. The original copyright headers mark these files **GPL-2.0-or-later**. Exact source tag/commit was **not supplied**. These files alone do **not** build a functional DOSBox-X library; they have numerous additional project dependencies.

## Implemented now

- Added **`optional/pc/PC-BIOS.js`**, a bounded GPL-3.0-only browser adapter drawing from the supplied BIOS layout, callback and keyboard-ring source. It is actually loaded by PC Workbench, not a mock.
- Real x86 guest `INT` enters guest IVT/ROM callback stub, host adapter reads/changes guest registers/BDA, and CPU executes the genuine guest `IRET` to restore flags and resume. **The native DOSBox-X C++ itself is not compiled or executed.**
- BIOS Data Area initialized at canonical addresses, including actual configured conventional RAM (not hardcoded 640 KiB), equipment, keyboard head/tail/geometry and timer ticks.
- `INT 11h` (equipment), `12h` (conventional memory), `15h AH=88` (bounded extended memory), `16h` (queued keyboard read/peek/shift status), `1Ah AH=00/01` (clock tick get/set), IRQ0 timer callback, with basic DOS-compatible error signaling for absent `INT 13h` FDD and unknown `INT 15h` functions.
- Added user-injectable **`queueBIOSKey(scan_ascii_word)`** as a tested host entrypoint to the BIOS ring; keyboard scancode-to-ASCII hardware IRQ1 translation is **not implemented** yet. Empty blocking `INT 16h AH=00` fails explicitly, pending async guest suspension/resume.
- PIC, PIT, DMA, CPU, A20 and max **1 MiB installed system RAM** remain bounded to earlier alpha. No graphics, disk boot or claim of fully functional 80286 PM.

## Deferred unchanged

- **Phase 1 unfinished:** complete x86 instruction coverage, 286 segment gates/exceptions/privileges, realistic BIOS POST, full 8042 and chipset timing. DOSBox-X callback design was adapted to a native JS/guest-IRET boundary rather than copying its private callback opcode or transplanting a large C++ subsystem.
- **Phase 2:** `bios_disk.cpp`, `bios_int13.cpp`, `bios_memdisk.cpp`; real FDD controller, CGA/Hercules and FreeDOS boot on BOTH XT and AT.
- **Phase 3:** Covox and genuine SB 2.0 OPL2/DSP/DMA/IRQ.
- **Phase 4:** VGA, IDE, tuning. `bios_vhd.cpp` is only a reference; VHD itself is **not** an agreed required feature.

## Test results (local, 22 Oct 2026)

- PC alpha unit + BIOS adapted-services tests: **42/42 PASS** (27 previous + 15 new).
- Genuine Chromium PC browser E2E: **PASS** on actual JS CPU + BIOS adapter, XT boot, 286 PM demo, PIT and diagnostics.
- Markdown/Mermaid/Charts/DocUX regressions **182/182 PASS**; Blockly/Arduino **49 PASS**; ZX unit **31/31 PASS**.
- No full DOSBox-X build, real FreeDOS boot, commercial game, 286 conformance suite, or physical machine was tested.

## Licensing

User-approved GPLv3 project decision. Upstream original source files and their individual notices retained unmodified; new adapter source identifies the upstream algorithms used. Before public release, identify the exact upstream DOSBox-X commit and verify dependencies, copyright/provenance and required corresponding-source/build distribution. Proprietary AMI/IBM ROMs are not included.
