# MD.js Ultra — Phase 4L: Developer Floppy B: (bootstrap)

Date: 2026-10-29. Status: functional media integration, **NOT a full bundled C toolchain**.

## Hardware contract

- Identical 720 KiB FAT12 developer disk **B:** for both XT/8086-ISA and AT/286.
- Embedded FreeDOS boot **A:** and developer **B:** auto-inserted **read-only** on first browser boot.
- Classic `PC-EmbeddedAssets.js` Base64: no fetch, npm runtime, WASM or bundler required; the `.img` can be separately imported/exported.
- Explicit media eject, replacing, and reset preserve guest intent: no silent remount of ejected B:.
- Button restores the pristine embedded B:; a separate button creates a writable working *copy* of B: (read-only original retained).

## Actual contents of the disk

| File | Bytes | Notes |
|---|---:|---|
| `EDIT.COM` | 9017 | Original 8086-compatible **line editor**, not a fullscreen IDE |
| `DEBUG.COM` | 22324 | Existing FreeDOS debugger reused from personal project |
| `HELLO.ASM` | 217 | NASM-compatible 8086 hello-world example, source only |
| `HELLO.C` | 225 | Ordinary C hello-world example, source only |
| `DEVHELP.TXT` | 1278 | Commands and read-only behavior |

Total payload: **33,061 bytes** (+ FAT12 overhead). Image size: **737,280 bytes**. Most of the floppy is empty: development tools are NOT yet installed.

## What is not shipped

`mininasm`, NASM16, TE, Insight, Small-C compiler, Small-Assembler,
YLink and C libraries were not available as verified DOS binary downloads in
this working environment. Including dummy executables would be deceptive.

When binaries become available, use `optional/pc/devtools/build_devdisk.js --tool NAME.COM=/path/to/file`
for each real verified DOS tool, retain license notices, rebuild, and run on
both XT and AT. The builder rejects an overfull 720 KiB image.

## Practical DOS workflow

- At `A:\>`: `DIR B:`
- `B:EDIT B:HELLO.ASM` then `:L` (list), `:D` (delete last line), `:C` (clear), `:W` (save), `:Q` (quit)
- `B:DEBUG` for instruction-level debugging (`A`, `R`, `U`, `G`, `Q`).
- On default RO B:, writing produces a FreeDOS write-protection critical error; this is **expected**.
- Press **Pracovní kopie B: (RW)** to make a writable personal copy, then save the image using FDD export. On AT, use writable IDE C: if desired.
- Press **Obnovit vývojovou B: (RO)** to restore an original protected copy.

## Test evidence

- FAT12 boot sector, root entries, embedded Base64 matching raw IMG, correct 720K size.
- Both XT and AT/286: real Chromium FreeDOS `DIR B:`, `B:EDIT B:HELLO.ASM` list/quit, `B:DEBUG` quit.
- Both embedded A: and B: mounted read-only; direct disk-sector writes denied.
- FreeDOS write-protect violation confirmed for actual guest `EDIT :W` on default B:.
- RW work-copy: guest `EDIT.COM` saved a real `NEW.TXT` file; original B: image remained unchanged.
- B: eject/reset preserves empty slot; explicit Restore B: remounts read-only.
- This does **not** certify all other unimplemented historical hardware behavior or multi-browser `file://` navigation.

## Source and license boundaries

Editor written specifically for this project under GPL-3.0-only. Existing FreeDOS and DEBUG.COM are from the user's PERSONAL archive; keep that distribution private unless binary provenance and license requirements are reviewed. The build does not copy third-party compiler code into the emulation runtime.
