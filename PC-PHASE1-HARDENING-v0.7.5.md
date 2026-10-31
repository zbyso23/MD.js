# MD.js Ultra — PC Phase 1 hardening v0.7.5

Date: 2026-10-22. Scope: XT 8086/8088-class; AT 80286, at most 1 MiB installed system RAM. Four frozen project phases. Strict native HTML/CSS/JS — **no WebAssembly, C++ compilation, transpilation, or runtime build**. GPLv3 JS; GPL-2.0-or-later DOSBox-X CPU/BIOS source snapshots remain *references*, pinned to user-provided DOSBox-X commit `029bd65c5dcc7cdc7f2e14e35278620d9707d969`.

## Implemented in this increment

1. **x86 real mode:** `CBW`, `CWD`, `XLAT` (including segment override), `WAIT` (without an emulated coprocessor), `INTO`, `CALL FAR imm16:16`, `LES`, `LDS`, `AAA`, `AAS`, `DAA`, `DAS`, `AAM imm8`, `AAD imm8`. `AAM` with zero base is a guest divide fault via IVT/IDT (within existing exception limitations).
2. **286-only:** `IMUL r16,r/m16,imm16/imm8`, `INSB/INSW/OUTSB/OUTSW` with REP/DF behavior, `ARPL` (protected mode), `VERR` and `VERW` descriptor verification. No 386 instructions added.
3. **286 segment checks:** real→protected segment hidden-cache continuation, read-only vs writable descriptors, null selectors loaded in PM, DPL/RPL checks, expand-down boundaries, no partial writes across segment limit. Incomplete exception paths currently raise `CPUFault`; not a 286 conformance claim.
4. **PIC:** proper single/cascaded initialization via ICW1–4, command reads of IRR/ISR, EOI, in-service priority, AT second PIC ports A0h/A1h, IRQ8–15 cascade through master IRQ2. Browser guest program executes `OUT A0h, AL`, `OUT 20h, AL` and `IRET` for IRQ10.
5. **Workbench:** BCD test and IRQ10 cascade demo buttons, 10 browser diagnostics, real Chromium rendering.

## Verified commands

- `npm run test:pc:phase1`: **197/197 PASS** (formerly 135/135).
- `npm run test:pc:browser`: **PASS** (real Chromium and guest instruction execution, no emulation mocks).
- `npm run test:release`: Markdown **182**, Blockly/Arduino **49**, ZX **31**, PC **197** = **459 node/unit tests PASS**, plus PC and general Ultra browser tests.
- Runtime directly opens `optional/pc/index.html`; `npm` is **only optional developer test tooling**, not part of browser startup.

## Gate 1 conformance decision: OPEN

A large number of green tests is not proof of a complete PC. The following acceptance requirements remain outstanding and prevent declaring Phase 1 finished:

| Gate requirement | State / evidence gap |
|---|---|
| Full 8086/8088 instruction semantics | Partial interpreter; instruction families and undocumented/error corner cases missing; no external differential or broad conformance suite |
| Complete 80286 real/protected mode | **Incomplete** LDT, 16-bit TSS, task gates/task switch, ring transitions, `#GP/#SS/#NP/#TS` delivery and error codes |
| Privilege protection and faults | Selected access checks; invalid descriptors currently raise JS `CPUFault` rather than guest architectural exceptions |
| Timing/interrupt behavior | Simplified cycles/PIT/DMA and no accurate instruction prefetch; no instruction-boundary interrupt shadow for `STI` / `MOV SS` |
| AT peripherals | Partial 8042 keyboard and RTC/CMOS; dual 8259 now present, second DMA and much of hardware handshake remain incomplete |
| BIOS bootstrap and services | Self-authored test ROM plus limited adapted DOSBox-X BIOS services; no full AT POST nor boot-grade BIOS |
| Reference comparison | No exhaustive independently validated 8086+286 instruction/gate test suite against DOSBox-X or another reference |

**Phase 2 not started**: CGA/Hercules, FDD sector support, booting actual FreeDOS on both profiles. VGA, IDE and sound are not accidentally enabled.

The goal is to actually close Gate 1 once these conditions are met. Do not interpret this milestone as 'fully compatible 80286' or 'FreeDOS-ready'.
