# MD.js Ultra PC Phase 1 — Foundation Gate Report (23 October 2026)

**Milestone:** v0.7.7; baseline Gate 1 accepted for the deliberately bounded 8086/80286 educational PC lab. No claim of complete ISA, full hardware accuracy, DOS boot, or actual task switching. The full DOS-compatibility gate is in Phase 2.

## Tested foundation

- Separate XT 8086 instruction profile (8088-oriented board) and AT 80286 with protected-mode GDT/IDT paths; real reset vectors executed in browser, CPU-based BIOS callback handoff.
- 286 new instructions executed: `SLDT`, `STR`, `LLDT`, `LTR`, GDT/LDT selector resolution, 16-bit TSS descriptor **load** and busy-bit marking (not TSS task switch); negative tests for invalid selectors and privileges.
- Typed 286 protection faults `#GP`, `#SS`, `#NP` (and too-small 16-bit TSS `#TS` at load). Where a valid IDT gate is installed, guest exceptions push a 16-bit error code above the saved return frame; demonstrated guest code removes error, adjusts IP and returns via `IRET`. Invalid/missing gates fail closed.
- CLI/STI, port IO, HLT, LMSW, LGDT/LIDT and POPF privilege restrictions for implemented CPL/IOPL model.
- System RAM maximum: XT up to 640 KiB, AT 640 KiB conventional plus up to 384 KiB extended, total never above 1 MiB; BIOS BDA, keyboard/clock callbacks, PIC/PIT and basic DMA register model.
- GPL DOSBox-X CPU/BIOS source references preserved with provenance commit `029bd65c5dcc7cdc7f2e14e35278620d9707d969`; executable is **our native JS adapter/interpreter**, not compiled C++ or WASM.

## Explicitly not yet implemented / limitations

- **Not a complete 8086/80286 ISA or timing-accurate chipset.** Some opcodes trap as unsupported.
- **Full 286 16-bit hardware task switching**, ring transitions requiring TSS stack switching, double-/triple-fault CPU shutdown, exhaustive descriptor and privileged-return behavior remain incomplete. LTR supports loading TSS descriptor only, not a task switch.
- The current BIOS ROM is a project-owned reset + minimal firmware stub, not IBM/AMI POST; integrated BIOS covers a bounded set of services (e.g. INT 11h/12h/15h/16h/1Ah), not real INT 10h video or INT 13h drive I/O.
- PIT/DMA are register-focused and **not fully cycle-accurate or hardware-transfer-complete**. Full FDD, CGA/Hercules, FreeDOS boot, graphic output remain Phase 2.
- `file://` navigation is administratively blocked in the test environment; opaque-origin classic JS/Blob Worker and ROM fallback were tested. Actual desktop direct-file opening should be smoke-tested independently.

## Reproducible tests

- `npm run test:release`: Markdown / DocUX / Charts, Blockly/Arduino, ZX, PC and Chromium regressions.
- `npm run test:pc:phase1`: 207 CPU/chipset tests (including new 286 LDT/TR and guest #NP tests).
- `npm run test:zx:personal-rom`: actual Chromium opaque-origin Z80 boot from personal embedded ROM without a file picker.
- `npm run test:zx:unit`: 31 Z80 / assembler / tape / screen tests.
- `file://` direct navigation not verified due to Chromium administrator block.

**Release rule:** Phase-1 educational foundation is stable enough to start Phase 2. Do not claim FreeDOS compatibility, all-instruction 286 correctness, or historical machine accuracy until independently demonstrated.
