# Phase 4M.1 — shared developer B: (XT / AT/286)

`x86DEV-720K-XT286.img` is a real 720-KiB FAT12 disk, embedded byte-for-byte
as `MDPC_EMBEDDED.devtools720k` for offline `file://` operation.
It mounts **automatically as B: read-only** alongside FreeDOS A: read-only on
both XT and AT/286. For writing, use the **Pracovni kopie B: (RW)** control,
then export your working image; the original always stays immutable.

## Programs in the developer B:

`EDIT.COM` (small DOS line editor with source `EDIT.S`), `DEBUG.COM`,
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
