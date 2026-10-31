# MD.js Ultra PC Environment — Phase 1 CPU expansion v0.7.2

**Date:** 2026-10-22  
**Status:** Functional incremental milestone; **Phase 1 acceptance gate remains OPEN**.  
**Scope:** PC/XT 8086 ISA (8088 class) + PC/AT 80286, **max 1 MiB installed system RAM** (XT 640 KiB; AT 640 KiB + 384 KiB). No 386 execution, no >1 MiB RAM, no floppy or video boot yet.

## DOSBox-X source receipt and provenance

- Repository: https://github.com/joncampbell123/dosbox-x
- Upstream commit **supplied by the user**: `029bd65c5dcc7cdc7f2e14e35278620d9707d969`.
- Inputs: `/cpu` archive and `cpu.h`, `regs.h`, `dosbox.h` from user uploads.
- Selected unmodified CPU reference files are in `optional/pc/vendor/dosbox-x-cpu/`: notably `cpu/core_normal_8086.cpp`, `cpu/core_normal_286.cpp`, CPU decoder tables, `cpu.cpp`, `flags.cpp`, and headers. Their exact snapshot hashes are in `UPSTREAM-MANIFEST.json`; GPL-2.0-or-later copyrights and `COPYING.GPL-2.0` are retained.
- The separate BIOS reference snapshot remains at `optional/pc/vendor/dosbox-x-reference/`.
- **The DOSBox-X C++ CPU cores are NOT built into WASM and NOT called by the running Workbench.** The actual runtime is still a JavaScript interpreter. This release applies targeted 8086/286 ISA behavior using the provided source as reference, not a complete mechanical port. Compiling the original cores needs additional DOSBox-X runtime dependencies and a suitable WASM toolchain.
- Git commit attribution is recorded but **has not been independently verified byte-for-byte against upstream Git**.

## Running improvements (JavaScript interpreter)

1. **8086 ModR/M memory operands:** all eight 16-bit effective-address bases, register addressing, signed displacements (8/16), direct `[disp16]`, BP-based default SS, and segment override prefixes. Loads/stores through RAM are real, not stubbed.
2. **Byte/word ALU:** `ADD`, `ADC`, `SUB`, `SBB`, `CMP`, `AND`, `OR`, `XOR` on register/memory operands, immediate groups `80h/81h/83h`, sign extension, carry/zero/sign/overflow/parity/auxiliary flag calculation (subset). `MOV` byte/word via ModR/M, `XCHG`, `LEA`, `POP r/m`, `TEST`, `LAHF/SAHF`, `CLC/STC/CMC` and control-flow additions.
3. **String instructions:** `MOVSB/MOVSW`, `STOSB/STOSW`, `LODSB/LODSW`, `CMPSB/CMPSW`, `SCASB/SCASW` including `REP/REPE/REPNE` condition, `CX`, `DF`, `SI/DI` behavior and source segment override. The current interpreter treats each whole `REP` operation as one CPU step: interrupts/cycles during the sequence are **not** accurately modeled.
4. **AT-only 286 subset:** `PUSHA`, `POPA`, `PUSH imm8/imm16`, `SMSW`, `LMSW`, `SGDT`, `SIDT`, `LGDT`, `LIDT` basic forms. Further protected-mode privilege, IDT, exception and task-switch behavior still missing.
5. Unsupported instructions/LOCK/unsupported REP combinations continue to raise **CPUFault**. No fake success and no silently enabled 386 opcodes.
6. New `ModR/M + REP demo` button in the Workbench and real Chromium verification of the result.

## Tests run

Command: `npm run test:release` (exit status 0).

| Test group | Result |
|---|---:|
| Core MD / Markdown / diagrams / charts tests | 182 pass |
| Blockly / Arduino tests | 49 pass |
| ZX unit tests | 31 pass |
| PC unit, BIOS, chipset, CPU and vendor-hash tests | **75 pass** (42 before CPU upgrade) |
| **Total automated non-browser tests** | **337 pass** |
| PC real Chromium E2E | pass (XT ROM, 286 PM, five diagnostics, memory/REP demo, IRQ0) |
| Ultra Chromium regression | pass (charts, sorting/filtering, Blockly/Arduino) |

All tests use project sources. The binary tests in browser are not backed by a mock CPU. Source provenance hashes are checked; they are not proof of full CPU correctness or upstream identity. Clean source: no ROM/game binaries distributed.

## Outstanding Gate 1 blockers

- Complete 8086/8088 and 80286 opcode coverage; 8088 bus/prefetch/cycle behavior.
- Complete 286 Protected Mode: LDT, TSS, IDT gates, privilege rules, exceptions/triple fault and protected interrupt entry/return.
- Timing-accurate PIC/PIT/DMA/8042, real DMA transfers, peripheral integration and BIOS coverage.
- Actual C++ DOSBox-X 8086/286 core build/link or equivalent separately validated backend if that is the chosen implementation strategy; provide corresponding source/build scripts.
- Hardware/firmware/FreeDOS boot: **not yet** (graphics and FDD are Phase 2).

This milestone is a tested extension to the Phase 1 alpha, **not closure of Phase 1**. No new phases or new hardware are proposed.
