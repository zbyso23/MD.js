# MD.js Ultra v0.8.0 — Phase 2: FreeDOS / DEBUG Gate

**Date:** 2026-10-23  
**Status:** Phase 2 foundational acceptance **PASS** for XT and AT DOS boot/FAT12 and XT DEBUG. Some compatibility gaps explicitly remain.

## Delivery

- Native uncompiled JS, no WASM, no C++ runtime, no build process, no 386, 1 MiB physical RAM hard cap.
- Workbench now defaults to **XT + Hercules amber** CRT with a soft phosphor fade, slight glow and scanline overlay (CSS/CANVAS, not a static image).
- Default personal floppy **A:** is a preloaded **720 KiB FreeDOS 1.4 FAT12 developer image**.
- Added user-supplied **DEBUG.COM (22,324 bytes)** to the root, without altering FreeDOS kernel or COMMAND.COM. Updated FDCONFIG.SYS/FDAUTO.BAT only to boot straight to DOS shell rather than the installer language menu. Original disk image preserved for comparison.
- Separate 1.44 MiB disk images remain user-mounted, never in the embedded Base64 payload.
- Boot proceeds automatically in the Workbench; responsive `requestAnimationFrame` CPU runner includes Run, Pause, UI keyboard focus and typed command submission.
- BIOS INT 16h AH00 now suspends guest execution without fabricating input; resumes with host key. INT 16h AH01 polling remains available. BDA BIOS clock advances deterministically in guest-instruction units (approximation, not physical timing).
- CPU correctly decodes 8086 ESC 0xD8..0xDF instruction lengths with absent 8087; needed for DEBUG.COM coprocessor probe. 386 operand-size prefixes 66h/67h are illegal on 286 (#UD), not mistakenly accepted as 386 support.

## Acceptance evidence

1. Actual 720 KiB boot sector → real `KERNEL.SYS` → `FreeCom version 0.86` → interactive `A:\>` on **XT**.
2. Same on **80286 AT**.
3. `DIR` listing contains `DEBUG.COM`. Both profiles successfully use `COPY FDAUTO.BAT TEST.BAT`, `DIR TEST.BAT`, `DEL TEST.BAT`; real FAT12 data and directory structures are modified.
4. XT starts **DEBUG.COM**. Tested `R` registry display and `Q` return to DOS.
5. XT DEBUG assembler: `A 100`, `MOV AH,02`, `MOV DL,41`, `INT 21`, `INT 20`, `U 100`, `G` → actual guest DOS syscall prints **A**, then `Program terminated normally (0000)`.
6. Browser E2E in Chromium: XT real keyboard events typed `DEBUG`, `R`, `Q`; AT FreeDOS boot and `DIR`; amber Hercules screenshot generated from video RAM; not an image mock.
7. Unit integration validates exact content of supplied DEBUG.COM within the FAT12 cluster chain.
8. Legacy PC, ZX, Markdown, Blockly and runtime regression tests retained.

## Known limits (do NOT misrepresent)

- This specific user-supplied `DEBUG.COM` launches and works on **XT**, but **not yet on AT**. It executes a 386 prefix 66h during its CPU probing; on the 80286 this leads to a guest `#UD` handled by FreeDOS as an invalid instruction. A suitable 286-compatible DEBUG variant or correct software-level detection path is needed for AT.
- Not a full DOSBox replacement. Remaining limitations: partial CPU 286 protected mode and TSS, simplified diskette timings / 765 command coverage / DMA, simplified PC timer and IRQ scheduling, approximate character font/retrace, no game-level compatibility promise.
- **Direct `file://` browser navigation** could not be exercised in the restricted CI Chromium environment, although the offline opaque-origin JavaScript path and embedded assets passed.
- The embedded floppy includes user-supplied FreeDOS and DEBUG.COM; public redistribution rights for the DEBUG binary were **not established**. Treat as personal distribution only; ZX ROM also personal only.

## Files / how to run

1. Extract personal ZIP.
2. Open `optional/pc/index.html`; FreeDOS auto boots from A: in default XT/Hercules mode.
3. Click inside monitor to focus. Type `DEBUG`, press Enter, then use `R`, `A 100`, `U 100`, `G`, `Q`.
4. Change profile to AT to boot DOS there; select CGA if desired. Reset reattaches personal developer floppy. Manual IMG/IMA mount still supported; browser JSON save/import still includes media and VRAM.

## Next milestone

Phase 3 (sound) remains the next frozen project phase: PC Speaker, Covox via LPT, AdLib OPL2 and Sound Blaster 2.0 PCM/DMA/IRQ. Any further unsupported game/CPU compatibility issue found during sound integration must be addressed based on verified behavior, not hand-waved.
