## FreeDOS Gate 2 update (v0.8.0)

Default Workbench opens XT/Hercules amber, mounts embedded FreeDOS 720 KiB with DEBUG.COM and starts the guest boot. The display uses a lightweight amber phosphor simulation via CSS and Canvas. Keyboard input is passed to BIOS INT 16h. BIOS clock ticks progress deterministically with executed guest instructions. The CPU supports 8086 ESC (no 8087 present) for DEBUG.COM detection.

On XT, DEBUG.COM executes A/U/R/G/Q. On AT, FreeDOS and FAT12 work, but this DEBUG.COM has a 386 probe (66h) causing a guest #UD; full AT DEBUG compatibility remains a known limit. Original FDD timing, full 286 task switch and extensive 8087 emulation not added.

# PC Environment Phase 2 — v0.7.8 (current)

CGA/Hercules video hardware, usable BIOS `INT 10h`, and basic FDD/NEC 765/BIOS `INT 13h`/`INT 19h` have been added to the existing XT and 286 testbed. Native JavaScript, no build. The browser renders graphics directly from video RAM. Both platforms execute a self-created boot sector from a mounted disk. **Actual FreeDOS boot is not yet verified, so Gate 2 is open.**

To try it: open `optional/pc/index.html` (file:// or HTTP) and use *INT 10h text demo*, *CGA*, *Hercules*, *Vytvořit testovací A:* and *Boot A:*. Upload your own legally usable raw `.img/.ima` disk through the file selector; exporting machine JSON includes the image. Run `npm run test:release` for development regression. The user-supplied SE Basic ROM is available only in personal archive.

Full details in [`../../PC-PHASE2-VIDEO-FDD-v0.7.8.md`](../../PC-PHASE2-VIDEO-FDD-v0.7.8.md).

---

# PC Workbench — Phase 1 Alpha (MD.js Ultra)

**Date:** 2026-10-22 · v0.7.5 native JavaScript CPU/chipset hardening  
**Scope lock:** PC/XT 8086 ISA / 8088-class hardware target, PC/AT 80286; **maximum 1 MiB of installed system RAM**. No 386, VGA/IDE before phase 4, and no phase 5.

## What actually runs

- A real JavaScript instruction interpreter (not a mock) executing an **expanded yet deliberately limited** subset of 8086 instructions on both XT and AT profiles. New: 16-bit ModR/M effective addresses with BP→SS defaults, segment overrides, 8/16-bit ALU and memory operands, conditional loops, `REP MOVS/STOS/LODS/CMPS/SCAS`, `LEA`, `XCHG`, `TEST`, and (286 only) `PUSHA/POPA`, `PUSH imm`, `SMSW/SGDT/SIDT/LIDT` (partial). Unimplemented instructions throw `CPUFault` instead of succeeding silently.
- AT-only **partial 80286** protected-mode path: `LGDT [disp16]`, `LMSW AX`, a far jump to a 286 GDT code descriptor, basic present/type/limit checks, and execution of code at the descriptor's physical base. This is **not a full 286 protected-mode implementation**: task switching, many selectors/privilege checks, full IDT validation, ring stack transitions, hardware exceptions, many opcodes and exact cycles are absent. Selected same-ring interrupt/trap gate operations and IRET are supported.
- Genuine executed reset jump at `F000:FFF0` (XT) or the 286 reset hidden CS base `FF0000` + `FFF0` (AT), using a mirrored project-written 64 KiB ROM. The reset program sets stack/DS, initializes BIOS Data Area fields and invokes `INT 11h` and `INT 12h`, then halts.
- Real-mode interrupt frame (`FLAGS`, `CS`, `IP`) pushed on the guest stack, vector read from guest IVT and **guest IRET**. Small adapted JS BIOS callbacks update guest registers at dedicated ROM stub addresses: `INT 11h`, `INT 12h`, `INT 15h AH=88`, `INT 1Ah` (time), `INT 08h` (timer BDA); other slots are deliberately incomplete. New `PC-BIOS.js` (based on the supplied DOSBox-X BDA/callback and keyboard ring designs) supports INT 16h buffered key operations and clock get/set; full keyboard IRQ1 and FDD remain deferred.
- Hardware registers: **partial** 8259 PIC, 8253 PIT, 8237 DMA *register programming only*, XT/AT keyboard queues, 8042 A20 path, AT CMOS/RTC register RAM and port 92h A20 control. Full DMA bus transfers / precise timing are **not** implemented.
- Memory cap enforced at construction. XT: 640 KiB conventional; AT: 640 KiB conventional plus 384 KiB extended (addressed starting at physical 0x100000 when A20 enabled). 286 address bus capability 24-bit **does not increase installed RAM**. Video/option ROM hole stays unmapped.
- Browser Workbench with XT/AT selector, CPU step, ROM boot, live registers, memory bytes, basic hardware status, 286 PM demo, PIT IRQ experiment, and diagnostic button. No auto-running binary from Markdown.

## What is **not** implemented yet

**Phase 1 Gate remains OPEN.** This is an independently testable *alpha slice*, not a PC capable of running DOS. Missing full 8086/8088 and 286 instruction coverage, 286 precise protected-mode fault/gate/privilege behavior, prefetch/timing, complete PIC/PIT/DMA and 8042 behavior, chipset integration validation, and a complete BIOS layer. The ROM is a project-written test firmware, **not a historical POST**. The GPLv3 JS `PC-BIOS.js` now adapts selected concepts from user-provided DOSBox-X sources kept in `vendor/dosbox-x-reference/`, but the upstream C++ is **never compiled or linked**. The new DOSBox-X CPU snapshots in `vendor/dosbox-x-cpu/` are also **reference only**; the JavaScript CPU has been independently extended with some 8086/286 features using their behavior as guide, not replaced with upstream C++/WASM. The supplied Git revision is recorded in each vendor provenance manifest. There is still no complete DOSBox BIOS or FreeDOS boot.

**Phase 2 not started:** CGA, Hercules, floppy controller, FAT12 IMG, booting real FreeDOS. No commercial games or legacy IBM/AMI/Award BIOS ROMs in the package.

## Start

Open `index.html` from this directory, or launch the project root `./run-local.sh` and navigate to `/optional/pc/index.html`. No runtime dependencies or network. The optional PC environment is not loaded by the Markdown reader.

## Tests

```sh
npm run test:pc:phase1
python3 optional/pc/tests/test_browser.py   # optional Playwright + Chromium, no mocks
npm test && npm run test:blocks && npm run test:zx:unit
```

The browser test uses a static page with the **actual original JS CPU and machine sources** injected, avoiding restricted localhost navigation. It verifies XT BIOS boot, 286 protected-mode transition, PIT interrupt request, memory cap, no page errors, and writes the screenshot `pc-phase1-browser.png`.

## Source and licensing

Project-authored `PC-Core.js`, `PC-Machine.js` and `PC-BIOS.js` are GPL-3.0-only. The BIOS adapter gives explicit credit to the supplied DOSBox-X algorithms. The 13 unmodified DOSBox-X snapshots have GPL-2.0-or-later notices, SHA-256 manifests and a provenance README. Exact upstream revision remains unconfirmed. No upstream C++ is executing. See [`../../LICENSING.md`](../../LICENSING.md).

For the v0.7.1 intake details see [`../../PC-PHASE1-DOSBOX-IMPORT-v0.7.1.md`](../../PC-PHASE1-DOSBOX-IMPORT-v0.7.1.md).

## v0.7.2 CPU instruction upgrade

- Added actual ModR/M **memory** operations, signed 8/16-bit displacement and native segment selection/override. Formerly only `mod=3` registers were supported.
- Added ALU byte/word modes including flags, group 80/81/83, compare and test, and REP string instructions with CX/DF semantics. The Workbench now has a `ModR/M + REP demo` and checks it in browser diagnostics.
- Extended 286 opcode groups and basic bound checks, with no 386 runtime or 2 MiB RAM option. Supports only a fraction of 286 protected-mode semantics; no 16-bit TSS task-switching, IDT gates or faults.
- Intentionally unsupported LOCK and instruction combinations **fail closed**. Inaccurate timing, unmodelled interrupt response during long REP, missing CPU privileges/exception emulation and many opcode families mean this cannot yet boot DOS. Phase 1 Gate remains **OPEN**.
- Original `core_normal_8086.cpp`/`core_normal_286.cpp` are held unmodified in `vendor/dosbox-x-cpu/` for reference, with SHA-256 and license. There is **no Emscripten toolchain or compiled upstream core in this deliverable**.

## v0.7.3: native JavaScript CPU improvements

- Native `F6/F7`, `FE/FF`, `D0..D3`, 286 `C0/C1`, `ENTER` and `LEAVE`, plus direct ModR/M memory forms and flag/quotient checks.
- Preserved 8086 versus 286 differences: `PUSH SP` and full 8086 CL shift count vs the 286 five-bit mask.
- 80286 same-privilege protected-mode IDT 8-byte interrupt/trap gates, with guest stack frames and IRET. Invalid/non-present/unsupported gates, over-limit vectors and unsupported privilege stack switches throw `CPUFault`; complete privilege-task/fault semantics are not yet available.
- Workbench: ALU / SHIFT demo and 286 IDT demo. Both are exercised in actual Chromium alongside the earlier boot/PM/ModR/M/PIT checks.
- Absolutely **no compilation, WASM, transpilation or bundling**; browser directly executes the shipped `PC-Core.js`, `PC-BIOS.js`, and `PC-Machine.js` sources. Node/Playwright are optional test-only tools.


## v0.7.4 native-JS guest faults

Guest divide faults `#DE` (vector 0) and 286 signed `BOUND` faults `#BR` (vector 5) now dispatch to a guest-installed IVT/286 IDT interrupt handler, rather than being merely caught as host JavaScript errors. There are two real Workbench demo buttons. See `../../PC-PHASE1-CPU-EXCEPTIONS-v0.7.4.md`. This does not imply full 286 protected-mode conformance or a bootable DOS system.

## v0.7.5 — expanded native-JS instruction and PIC conformance

Added BCD/ASCII, far pointer and far call, 286 arithmetic and segment permission operations, and AT two-PIC cascaded interrupt tests. The 286 segment cache survives the initial real→protected transition; descriptors subsequently loaded in protected mode enforce null selector, access rights, privilege and expand-down limits. Invalid accesses currently raise host `CPUFault`, **not** proper guest `#GP`/`#SS`/`#NP`. The second 8259 handles PIC ICW1–4, EOI and AT IRQ8–15 through IRQ2. Remaining timer and DMA timing are approximations; this is **not** a complete AT chipset.

Full status: `../../PC-PHASE1-HARDENING-v0.7.5.md`.
