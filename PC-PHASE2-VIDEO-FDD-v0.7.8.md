# MD.js Ultra v0.7.8 — Phase 2 video + floppy milestone

**23 October 2026 — native browser JavaScript, no compilation / WASM / bundler.**

**Scope:** first integrated Phase 2 deliverable implementing Hercules, CGA, BIOS `INT 10h`, and a bounded FDD/BIOS `INT 13h` subsystem on BOTH XT (8086 ISA) and AT (partial 80286). **Gate 2 is NOT yet closed: actual FreeDOS boot and DOS command prompt are unverified.**

## Video implemented

- New `optional/pc/PC-Video.js` with **CGA 16 KiB VRAM mapped at B8000h** (mirrored within B8000h–BFFFFh) and **Hercules 64 KiB video memory mapped at B0000h–BFFFFh**. VRAM is distinct from capped system RAM.
- CGA BIOS modes 0–3 text; 4/5 320×200 4-color; 6 640×200 two-color. Correct even/odd bank interleave for graphic pixels. 6845-like indexed CRTC port registers, mode/palette ports, synthetic status register (NOT cycle accurate).
- Hercules text mode 7 and 720×348 mono graphics enabled by HGC control registers `3BFh` and `3B8h`. Correct four-way 8 KiB scanline banking. Extended CRTC indexed registers; status approximated.
- `INT 10h` service subset: AH 00/01/02/03/05/06/07/08/09/0A/0C/0D/0E/0F. Actual guest `INT`, BIOS callback, and guest `IRET` for supported services. Unsupported AH fails explicitly.
- Canvas renders directly from guest-visible video RAM; text glyph drawing uses browser monospace rather than ROM-exact 8×8/9×14 PC fonts. No external image or sprite assets.
- Video configuration/CRTC/VRAM/cursor included in JSON save, import and browser storage, with backward compatibility for old video-less v0.7.7 PC JSON snapshots.

## Disk subsystem implemented

- New `optional/pc/PC-Floppy.js`: A:/B: floppy image mounts via user-selected File API or manual Base64. Raw sector geometries: 160/180/320/360/720 KiB, 1.2/1.44 MiB. Images are copied on mount, not written back to the user's original host file.
- BIOS `INT 13h` AH=00 (reset), 01 (status), 02 (read sectors), 03 (write sectors), 04 (verify CHS), 08 (drive parameters), 15 (disk type), 16 (change status, partial). Missing medium, invalid CHS and 64 KiB buffer boundary report CF + AH error instead of fake success.
- Minimal NEC 765-compatible port protocol `3F2h/3F4h/3F5h/3F7h`: specify, seek, recalibrate, sense interrupt, read ID, read/write sector with **DMA channel 2** and IRQ6. Only supported programmed transfers are accepted; no flux-level or rotational timing, delayed DRQ or complete controller specification.
- Boot loader: `PCMachine.bootFloppy(0)` checks 55 AA signature, loads one 512-byte boot sector to `0000:7C00`, executes the real guest CPU. BIOS `INT 19h` also chains to the same boot loader. This DOES NOT provide MS-DOS/FreeDOS itself.
- Test disk generator creates a **free user-space 720 KiB raw image with a tiny hand-written x86 boot sector** that prints `MD.JS ULTRA BOOT OK` via BIOS `INT 10h`, then HLT. This proves real boot-sector execution, **not** FreeDOS boot.
- Mounted media and FDD command state are embedded in portable JSON snapshots. This can make snapshots large; `localStorage` errors are handled and manual JSON export/import stays available. Uploaded commercial/software disk images are never distributed as part of public project ZIPs.

## Test gates run

- **235 PC unit tests PASS** (including 28 new video/floppy tests, 207 retained Phase 1 tests).
- **192 MD/runtime**, **49 Blockly/Arduino**, **31 ZX** tests PASS; sum **507 unit/regression tests PASS**.
- Real Chromium E2E: both legacy PC profiles, CGA/Hercules rendering to Canvas, BIOS text/pixel ops, video snapshot, boot of hand-written floppy boot sector on both XT and AT, floppy image JSON snapshot, existing PC/ZX Universal Runtime, Blockly/Charts/Markdown regression.
- Test command: `npm run test:release`. No `npm install`, build or compiler required for the runtime. Developer test dependencies are optional.
- Browser tests emulate offline opaque-origin use; direct `file://` navigation is sandbox-blocked and **not claimed verified** on the user's actual PC.

## Remaining before Phase 2 Gate 2 may close

1. Independently obtain/validate legal FreeDOS boot-floppy images appropriate for XT/AT and **actually boot both systems**.
2. Repair uncovered ISA/BIOS/chipset gaps: the Phase 1 educational 8086/286 CPU implementation is deliberately **not a complete ISA**, and full DOS boot cannot currently be guaranteed.
3. Verify DOS prompt, keyboard input, `DIR`, multiple sector reads, FAT12 file access, `.COM` and compatible `.EXE` guest execution, persistent image write/read roundtrips and reference framebuffer comparisons.
4. Improve 765 DMA scheduling and interrupt timing as needed for the real boot; do not count successful synthetic boot as a FreeDOS PASS.

**Hard lock:** no 386+, no more than 1 MiB installed system RAM, no WASM/C++ runtime/compilation, no VGA until Phase 4, no Sound Blaster until Phase 3. This version remains source-only HTML/JS/CSS (GPLv3), with the DOSBox-X C++ inputs preserved solely as attributed references.
