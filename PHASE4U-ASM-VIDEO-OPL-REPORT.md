# MD.js Ultra Phase 4U — Assembly, Video Palette, OPL2 & DMA

Build: 20261030083933 (Europe/Prague)

## Added
- 20 new CS/EN reference articles (108 total); twelve historical UTF-8 sources bundled, original author credits preserved.
- ASM deep dives: 8086 registers/addressing/stack, real mode/IVT/A20, 286/386 protected mode, GDT/LDT/IDT, 386 paging/TLB, V86 versus virtual memory versus VMs, 8087 FPU.
- DOS/PSP/INT 21h, XT/AT keyboard, 8250 UART, RS-232.
- Three NASM-syntax 16-bit DOS .COM examples in reference/demos/: EGA 320x200x16, VGA 320x200x256 (animated palette via DAC ports 3C8/3C9), VGA 640x480x16.
- OPL2 mono keyboard (A/S/D/F/G, Esc); DMA 8237/Sound Blaster hardware register reference fragment.

## Tests run
- Node encyclopedia suites: PASS 12/12 (including 5 Phase 4U tests).
- Chromium inline F2 on seven entrypoints: PASS. This does not verify direct file:// browser navigation.
- Arduino Graph suite: PASS 11/11 and Chromium graph interaction PASS.
- Node syntax: PASS for MD-Encyclopedia-Data.js.

## Unverified / caveats
- NASM assembler unavailable: the new DOS ASM code samples were **not actually assembled**, nor run in the MD.js guest. They are educational examples subject to guest acceptance testing.
- EGA/VGA 640 plotting uses slow INT 10h pixel API. VGA320 cycles all 256 DAC entries and may run at different speeds depending on guest.
- Sound Blaster DMA sample is deliberately incomplete; the DMA physical page-address calculation, DSP readiness/reset, IRQ acknowledgement, timing and buffer placement must be implemented before it can play samples. It must **not** be presented as a passing playback test.
- Existing English mode retains legacy untranslated Czech articles; new Phase 4U topics have CS and EN content. Historical originals remain Czech.
- Reference content is not a promise that the MD.js emulator supports every CPU/hardware feature described.

## Files
- `MD-Encyclopedia-Data.js` data update; no new runtime dependency.
- `reference/historical/`: 12 originals.
- `reference/demos/`: five ASM code files.
- `optional/pc/tests/encyclopedia-phase4u.test.cjs`: new tests.
