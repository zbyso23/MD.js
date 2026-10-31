# Phase 4M.1 — shared developer B: (XT / AT/286)

`x86DEV-720K-XT286.img` is a real 720-KiB FAT12 disk, embedded byte-for-byte
as `MDPC_EMBEDDED.devtools720k` for offline `file://` operation.
It mounts **automatically as B: read-only** alongside FreeDOS A: read-only on
both XT and AT/286. For writing, use the **Pracovni kopie B: (RW)** control,
then export your working image; the original always stays immutable.

## Programs in the developer B:

`IDE.COM` (full-screen DOS source editor, `IDE.S`), `BUILD.BAT` (one-command Small-C build), `README4N.TXT` (on-disk usage), `EDIT.COM` (original line editor, `EDIT.S`), `DEBUG.COM`,
`CC.EXE` (Small-C 2.5), `ASM.EXE` (Small-Assembler 1.2), `YLINK.EXE` (1.2),
`CLIB.LIB`, `STDIO.H`, `HELLO.C`, `DEVHELP.TXT`, `NOTICE.TXT`.

### Verified guest compilation in *both* XT and AT/286

```dos
B:
CC HELLO
ASM HELLO
YLINK HELLO.OBJ,CLIB.LIB -e=HELLOC.EXE
HELLOC
```

Output: `Hello from 16-bit DOS C!`, real 4,896-byte MZ EXE.
`CC` generates `HELLO.ASM` from `HELLO.C` on the writable B: copy.

## Phase 4N workflow (XT and AT/286)

From the default read-only B: click **Pracovní kopie B: (RW)** in the Developer Workbench. The original built-in disk remains immutable.

```dos
B:
IDE HELLO.C
BUILD HELLO
HELLO.EXE
```

`IDE.COM` is a true 16-bit DOS program: arrow keys/Home/End/Page keys, Backspace/Delete, insert, CRLF, F1 help, F3/Ctrl-S save, Esc/F10 quit (double Esc/F10 to discard unsaved changes), capped at 16 KiB ASCII. No syntax highlighting, Unicode, undo/redo or filesystem browsing. It writes with DOS INT 21h to the explicitly writable copy. Host shortcuts are on the Developer Workbench menu; the host forwards extended BIOS scan codes when its video shell has keyboard focus. Export the writable B: as IMG at the end.

`BUILD.BAT` compiles the basename via CC -> ASM -> YLINK and produces a DOS EXE. It changes to B: so that invoking `B:BUILD HELLO` from an A: prompt also works. `DEBUG HELLO.EXE` is available for stepping; this doesn't claim an integrated symbolic debugger.

Phase 4O / F2 encyclopedia is **planned only**; see `PHASE4O-F2-ENCYCLOPEDIA-SPEC.md` in the project root.

## Rebuild 720-KiB image and embedded offline payload

```sh
node optional/pc/devtools/build_devdisk.js --bundle-verified
```

NASM is **excluded from this version** because the historical binary archive
lacked the matching source/license material. There is no NASM executable,
archived binary or NASM-only example in the deliverable. `mininasm-master.zip`
is retained as **source only**, not installed as a DOS executable. The
verified Small-Assembler still works for Small-C-generated assembly.

## Attribution

- Small-C / Small-Assembler / YLink: `upstream/SMALL-C-LICENSE.txt` (historical custom license; preserve notices and required credit), original source `upstream/Small-C-master.zip`.
- mininasm source: `upstream/mininasm-master.zip`, BSD-2-Clause, not compiled or installed.
- `DEBUG.COM` / `EDIT.COM`: see project `LICENSING.md` and `EDIT.S`.

Guest tests cover the stated C/ASM/OBJ/EXE workflow. They do not prove full
historical CPU, DOS or compiler compatibility.
