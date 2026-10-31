# Phase 4B — ATA IDE PIO bounded implementation

Scope: AT/286 only. Pure vanilla JS, `PC-IDE.js`, coupled to existing PC-Machine and BIOS INT 13h; no XT IDE. VGA, FreeDOS and Phase 3 unchanged.

Implemented: one primary master ATA interface `1F0h..1F7h`/`3F6h`, legacy CHS and 28-bit LBA register decoding, READ SECTORS 20h, WRITE SECTORS 30h, IDENTIFY EC, FLUSH E7, simple status/error flags, BIOS INT13 AH00/01/02/03/04/08/15 DL80h. Guest `IN AX,DX`, `OUT DX,AX` use actual 16-bit PIO. Export/import of raw images, AT-only mount UI; 32 MiB upper limit. Source buffer cloned on mount, modified sectors are stored in an overlay Map; no modification to original user's IMG without explicit export. Snapshot roundtrip includes working image and transfer state. Mounted IDE image is carried through Workbench profile/adapter resets until explicit eject or import of a different machine snapshot.

**Not yet a complete hard drive:** no FAT16 partition creation, DOS drive-letter integration, C: filesystem mount/boot proof, ATAPI, LBA48, PCI, full timing, reliable real IRQ14 service/cascading tests, hardware master/slave concurrency or broad software compatibility. IDE initialization without mounted image remains absent/unsupported. Therefore 4B remains **preview**, not full Phase 4 Gate PASS. The provided source files' original commit isn't verified. The IDE interface header has no explicit license header.

**New evidence**: headless Node tests exercise guest x86 IN AX,DX, ATA IDENTIFY, actual PIO read/write, BIOS INT13 DL80, copy-on-write export/import, snapshot corruption rejection and XT exclusion. Browser GUI needs end-to-end verification separately.

**FPU Phase 4C:** See `FPU-287XL-PHASE4C-FROZEN.md`; user-provided `fpu.h`, `fpu_state.h`, `fpu_types.h` are archived as source references, but actual `fpu.cpp` and x87 decoder are still needed before implementation.
