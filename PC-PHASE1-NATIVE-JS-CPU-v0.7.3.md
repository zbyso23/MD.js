# MD.js Ultra PC Environment — Phase 1 · native JavaScript CPU v0.7.3

**Status:** experimental Alpha. Phase 1 Gate OPEN. Date: 2026-10-22.

## Architectural freeze

Open HTML in a browser; the entire runtime is native, human-readable HTML/CSS/JavaScript. **NO COMPILATION, NO WASM, NO TRANSPILATION, NO BUNDLING.** DOSBox-X C++ from commit `029bd65c5dcc7cdc7f2e14e35278620d9707d969` is preserved only as GPL-licensed **reference source**. We have NOT compiled, executed or performed a wholesale port of DOSBox's original CPU cores. Optional test commands use Node/Chromium without producing any runtime binary.

## CPU work actually implemented

| CPU feature | Status | Notes |
|---|---|---|
| `F6/F7` | partial / tested | TEST, NOT, NEG, MUL, IMUL, DIV, IDIV byte/word, quotient overflow and zero division explicit failure |
| `FE/FF` | partial / tested | INC/DEC r/m, indirect near and far JMP/CALL, PUSH r/m16; reserved forms fail explicitly |
| `D0..D3` | partial / tested | ROL, ROR, RCL, RCR, SHL, SHR, SAR; flag checks and count 0 behavior |
| `C0/C1` | AT only / tested | immediate-count shifts; correctly rejected for XT 8086 ISA |
| `PUSH SP` | generation-aware / tested | 8086 pushes decremented SP; 286 pushes original SP |
| `ENTER/LEAVE` | AT only / tested | 286 stack frames; not available on XT |
| 286 Protected IDT | **partial** / tested | 8-byte interrupt/trap gates; same-ring, present, bounds, offset and type checks; IRET |

No FDD, VGA, Hercules/CGA, IDE, FreeDOS boot, prefetch simulation, full 286 protection/task switching or accurate hardware timing yet. The 1 MiB RAM cap and maximum 80286 are unchanged. Rejection of unsupported 386 features is intentional.

## Test execution

```sh
node --test optional/pc/tests/*.test.cjs
python3 optional/pc/tests/test_browser.py
npm run test:release
```

Tests are not required to use the application. `index.html` references **ordinary scripts** in the same folder. New `cpu-alu-groups-v073.test.cjs` checks arithmetic, signed/unsigned multiplication/division, overflow, rotations/shifts, calls/jumps, CPU-generation distinctions, 286 same-ring IDT and forbidden WASM execution. Real Chromium E2E performs the new ALU and protected IDT programs, plus old ROM boot and protected GDT demos.

## Known gaps and engineering caution

- This is an incomplete handwritten JavaScript interpreter, not the compiled DOSBox core and not certified 8086/286 instruction compatibility. `CPUFault` on divide errors is a development-time fail-fast rather than guest-visible `#DE` interrupt delivery. IRQ/event latency, fault restart semantics, instruction limits, precise flags for undefined cases, ring transitions/TSS, memory access checks and 8088 bus/prefetch timing require further work.
- `LOCK` remains intentionally unsupported. Many binary instructions not in this report still fail closed. Even with new opcodes this cannot yet boot FreeDOS.
- GPL-2.0-or-later C++ vendor snapshots retain source hashes and original notices, as documented under `optional/pc/vendor/`; GPLv3 project code stays separate and source readable. No copyrighted BIOS ROM or commercial games included.

## Acceptance

**Gate 1 remains OPEN** until instruction-level regression against an independent reference, fuller 286 Protected Mode and chipset/BIOS behaviors are demonstrably sufficient for the planned boot gate. No false claim of finished 8086/80286 emulation.
