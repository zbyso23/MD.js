# MD.js Ultra — Phase 4N Developer Workbench

**Date:** 2026-10-29 | **Source:** Phase 4M.1 NASM-Free PERSONAL, preserving original Git data and embedded FreeDOS/ROM.

## Implemented (NOT a proposal)

- Built a **native 16-bit 8086 DOS `.COM` full-screen editor**: `optional/pc/devtools/IDE.S` + compiled `IDE.COM` (18,436 B). It executes as *guest code* in FreeDOS, uses BIOS INT 16h and genuine Hercules B0000/CGA/VGA B8000 text memory, and DOS INT 21h for filesystem access. No WASM, no JS runtime editor substitution, no external software required to run it.
- Editor supports cursor arrows, Home/End, PgUp/PgDn, Backspace/Del, insertion at arbitrary positions, Enter/newlines, F1 help, F3/Ctrl+S save, Esc/F10 exit, explicit confirmation for discarding modified text, and automatic vertical/horizontal viewport scrolling. ASCII only, capped at 16 KiB, no syntax highlighting, multi-file tabs, undo/redo, or advanced encoding.
- **Original `EDIT.COM` was retained.** The new editor is invoked as `IDE B:HELLO.C`; `EDIT` still offers the old line-based UI.
- `BUILD.BAT` is on the shared 720-KiB FAT12 B:, invoking the existing verified DOS `CC.EXE` → `ASM.EXE` → `YLINK.EXE + CLIB.LIB` chain. `BUILD HELLO` makes `HELLO.EXE`; the script explicitly changes to B:, so `B:BUILD HELLO` works from the A: prompt. It checks compiler/tool exit codes. There is no bundled NASM executable.
- A new **Developer Workbench menu** appears in the PC workbench. Its controls create an explicit RW copy of B:, launch the native DOS editor, build and run HELLO, and export B: IMG. The built-in A: and B: remain read-only and automatically inserted; desktop output still works offline in `file://` mode.
- Keyboard forwarding from the browser's emulated monitor supports BIOS scan codes for arrows, Home/End, PageUp/PageDown, Delete, F1/F3/F10, and Ctrl+S. F2 encyclopedia is *planned for Phase 4O* and is **not implemented in 4N**.
- `optional/pc/devtools/README4N.TXT` and updated devtools README document the work-copy, build, editor, and exporting paths.

## Real guest-browser validation

A Playwright/Chromium test loads MD.js Ultra HTML + scripts inline to reproduce the offline/opaque-origin situation. On **both XT and AT/286** it confirms:

1. FreeDOS boot with read-only B:; explicit RW work copy.
2. `B:IDE B:HELLO.C` draws a full-screen DOS editor and displays the actual source.
3. F3 saves and Esc exits to the DOS prompt without crashing the guest CPU.
4. `B:BUILD HELLO` actually runs CC → ASM → YLINK; `B:HELLO.EXE` actually prints the expected string.
5. `IDE B:NOTE.TXT` inserts `ABC`, receives a real BIOS ArrowLeft scan, inserts `Z` between B and C, saves with F3; DOS `TYPE B:NOTE.TXT` returns **ABZC**.

Unit tests additionally validate the FAT12 directory/files byte-for-byte, embedded base64 image identity, presence of sources, absence of NASM, and host keyboard/menu wiring.

## Bounds and limitations

- The native DOS editor deliberately remains small (ASCII, 16KiB). Its VRAM code runs on the bounded PC video emulation; it is **not** evidence of faithful timing or compatibility with arbitrary historical video cards.
- The diskette is 720KiB FAT12 with 13 files and ~273,427 bytes of payload, leaving sufficient space for simple source/objects/EXEs on the explicit RW copy. Files are stored on a *new* developer B: image, not added to the boot A: image.
- DOS tools and source archives retain their respective license/notice data. `NASM.EXE` and `NDISASM.EXE` remain excluded. Public distribution still requires the project's broader ROM/FreeDOS/third-party license review; a PERSONAL package is not by itself clearance for public redistribution.
- F2 encyclopedia, Z80 ASM reference, large commented HGC/VGA x87 fractals and hardware tutorials are **Phase 4O only**, with the full scoped specification in `PHASE4O-F2-ENCYCLOPEDIA-SPEC.md`.

## How to use

Open `optional/pc/index.html` as a local file; in Developer Workbench choose **Pracovní kopie B: (RW)**. At the DOS prompt:

```dos
B:
IDE HELLO.C
BUILD HELLO
HELLO.EXE
DEBUG HELLO.EXE
```

Use **F3** in the editor to save and **Esc** to return to DOS. The read-only built-in B: is untouched; export the work-copy image through the Developer Workbench to preserve changes.

## Release validation

See the companion `PHASE4N-RELEASE-GATE` log and completed test exit status; the complete repository `npm run test:release` was run with Phase 4N tests appended as a mandatory final step. Some `file://` Chromium navigation tests are sandbox-blocked by browser administrative policy; opaque-origin/inlined-script tests cover offline behavior but do not certify all real desktop browsers.
