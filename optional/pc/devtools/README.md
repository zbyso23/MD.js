# MD.js Ultra B: Developer floppy (bootstrap)

This is a real **720 KiB FAT12** disk image used by **both XT and AT/286**.
It is **write-protected** by default, just like the bundled FreeDOS A:.

It contains the actual project DEBUG.COM, an original 8086 DOS line editor
EDIT.COM (source `EDIT.S`), example `HELLO.ASM` and `HELLO.C`, and DEVHELP.TXT.

Important: at this checkpoint, `mininasm`, `NASM16`, Small-C compiler, linker,
and Insight are **not present**. Their upstream DOS binaries were not available
locally and could not be downloaded in this execution environment. Never label
this as a complete installed C toolchain until the requested binaries are
physically present, license reviewed, and executed in the emulator.

The `build_devdisk.js` script creates the image and embeds it in
`PC-EmbeddedAssets.js`. It can accept verified locally supplied binaries with
`--tool FILENAME=PATH` and checks filenames, size, and FAT12 space. Only include
redistributable and tested binaries.

Writing files requires a *separate writable drive* (AT IDE C:), or replacing B:
with a writable work floppy in XT. Both built-in disks are read-only intentionally.
A duplicate of this bootstrap IMG can be exported and mounted writable with
explicit user action.
