# MD.js Ultra Phase 4V — Interrupt Reference (CS/EN)

- Extended existing Phase 4U project from 108 to 130 encyclopedia entries.
- Added 22 fully bilingual reference articles: INT 08h, 1Ch, 10h functions, 13h disk, 16h keyboard, 1Ah clock, 21h DOS, real-mode IVT/PIC, CMOS/RTC/PIT, MASM vs NASM.
- Added 20 illustrative 16-bit NASM .COM source examples under reference/demos/p4v-*.asm.
- Four historical sources added, retaining authorship: DOS2, MASM, CMOS and DOS_UVOD (full UTF-8). 16 historical files total.
- Shared AST/Graph and rest of existing MD.js Ultra preserved. Offline no build required.

## Validation
- Phase4V encyclopedia test: PASS.
- Phase4U encyclopedia suite: 5/5 PASS.
- Phase4T bilingual suite: 3/3 PASS.
- JS syntax: tested with node --check.
- ASM demos are educational and have NOT been NASM-assembled or executed inside the guest. Disk example reads floppy sector 1 only, and needs appropriate device present.
- Historical texts are references, not guarantees of guest emulator hardware implementation.
- Legacy 34 Czech educational articles remain untranslated, as in previous Phase4U.

## Recommended next gate
Compile each .COM with NASM, run under DOS guest; check video outputs, flags, disk failure paths and key inputs. For hook examples, use explicit save-restore/chaining and isolated hardware tests before making runnable TSR demos.
