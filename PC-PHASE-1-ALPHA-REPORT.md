# MD.js Ultra — PC Phase 1 Alpha report

**2026-10-22 · preliminary executable milestone, NOT Gate 1 completion**

## FROZEN scope intact

- CPU family: XT 8086 ISA (target 8088 bus), AT 80286 (including eventual full Protected Mode).
- Installed system RAM: XT 640 KiB; AT 640 KiB conventional + 384 KiB extended = **exactly 1 MiB maximum**. No 386 / 2 MiB.
- The four approved phases are unchanged: (1) CPU/chipset/BIOS → (2) CGA/Hercules/FDD/FreeDOS → (3) Covox/SB2.0 → (4) VGA/IDE/tuning.
- Markdown/Mermaid/Charts remain standard. PC lab is OPTIONAL with no autoload.

## Executed code and verifiable behavior

- XT + AT guest ROM reset and BIOS `INT 11h` and `INT 12h` calls, both halting after **17 CPU instructions**. Each produces `AX=0280h` (640 KiB).
- AT 286 executes guest `LGDT`, `LMSW`, `JMP FAR` with a GDT entry with base `003000h`, then loads `AX=1234h`, halts in Protected Mode. Segment-present and code-size limit rejection tested.
- PIC IRQ/mask/EOI; PIT IRQ0 after counting; DMA channel address/count/mask registers; A20 switch and gated memory; keyboard IRQ request; AT CMOS register access.
- No false full CPU compatibility claims; unsupported opcodes throw a visible exception.
- Actual Chromium E2E with real JS CPU from this release, no CPU mocking.

## Verification (latest run)

| Suite | Result |
|---|---|
| PC instruction/chipset unit | 27 passed, 0 failed |
| PC Chromium real CPU E2E | PASS: XT boot, AT GDT demo, 4 diagnostics, PIT IRQ |
| Existing MD.js / Charts / Mermaid / DocUX | 182 passed |
| Existing Blockly/Arduino | 49 passed |
| Existing ZX unit | 31 passed |

Browser screenshot: `optional/pc/pc-phase1-browser.png`.

## Known limitations and next gate work

1. Choose pinned suitable original upstream 8086/286 core or expand and conformance-test current small interpreter; run independent CPU conformance vectors including exceptions, segmentation and protected mode. No full-CPU gate claim yet.
2. Import and adapt compatible DOSBox GPL BIOS services with correct copyright and source provenance (the code has NOT been fetched/imported in this alpha); map callback instruction/interrupt bridge into the actual CPU.
3. Complete XT/AT chipset: PIC initialization/cascading, PIT modes and timing, DMA request/ack, 8042 data protocol, CMOS timer, A20/286 reset semantics.
4. Unit + independent reference + full browser tests for both profiles; **then** declare Gate 1. Only after Gate 1 may phase 2 start.

The minimal firmware is **not** historically authentic ROM POST. This milestone does not boot FreeDOS. No incompatible ROMs, games, FAT disk images or paid software are shipped.
