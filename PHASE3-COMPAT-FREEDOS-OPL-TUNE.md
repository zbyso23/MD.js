# MD.js Ultra — Phase 3 DOS/OPL2 Compatibility Milestone

**2026-10-24 · PERSONAL distribution only · Phase 3 limited preview, not a complete Yamaha/SB2 accuracy certificate.**

## Delivered

- `optional/pc/phase3/TUNE.COM` — 137-byte 8086-compatible binary, runs under FreeDOS 1.4 on XT **and** AT/286.
- `optional/pc/phase3/TUNE.s` — readable source (GNU assembler `.code16`, Intel syntax). Uses no 386 opcode, runtime build tools, external assets, or DOS protected mode.
- `TUNE.COM` added as a real root-directory FAT12 entry in `optional/pc/x86BOOT-720K-DEBUG-DEV.img`, which is inlined in `optional/pc/PC-EmbeddedAssets.js` for offline/`file://`-friendly usage.
- Notes: **C4 E4 G4 C5 G4 E4 C4**, sent over I/O ports `0x388` (OPL register) and `0x389` (data). Instrument initialized through OPL2 operator registers, individual note key-on/off and BIOS `INT 1Ah` clock delays. Exits via `INT 21h AH=4Ch`.
- Workbench now includes a short text hint. **Nothing plays automatically.** Click **Zapnout zvuk** (user gesture) and type `TUNE` at the real FreeDOS `A:\>` prompt.
- FAT12 injection, embedded-image consistency and real Chromium XT/AT execution now have reproducible tests. The Phase 3 tests are wired into the `test:release` command.

## Verification on the actual working tree

| Test suite | New result |
|---|---:|
| Standard Markdown/runtime | 192 PASS |
| Blocks/Arduino | 54 PASS |
| ZX | 31 PASS |
| PC legacy / FreeDOS | 241 PASS |
| Phase 3 audio + FAT12 tests | 51 PASS / 5 TODO |
| Total unit-like suites | **569 PASS / 5 TODO / 0 FAIL** |
| Chromium 3B/3C/3D isolated audio demos | 6 examples PASS (XT and AT) |
| Chromium 3A PC Speaker | 2 profiles PASS |
| Chromium `TUNE.COM` live DOS | XT and AT PASS |
| Chromium FreeDOS XT/AT, DEBUG on XT, AT `DIR` | PASS |
| Chromium UX Shell stress | PC + ZX + Blocks PASS (standalone run) |

The `TUNE.COM` browser gate reads the real FAT12 disk, confirms the executable, enters the command into FreeDOS, observes **7 notes / 8 key-offs** and nonzero PCM: **38,635 samples XT / 61,676 samples AT**. Both return to the `A:\>` prompt without guest exceptions. This does not prove analog fidelity or audibility on every host audio device.

## Run

```text
index.html → PC Workbench → PC zvuk: Zapnout zvuk
A:\>TUNE
```

Or use `optional/pc/index.html` directly. If the browser blocks local resource loading, use the existing file import fallback / local server as described in project documentation.

The source can be rebuilt as a **developer-only** action with GNU binutils:

```sh
as --32 optional/pc/phase3/TUNE.s -o /tmp/TUNE.o
ld -m elf_i386 -Ttext 0x100 --oformat binary /tmp/TUNE.o -o TUNE.COM
```

**No build is needed by end users.** The 137-byte executable is already on drive A: and separately in the project.

## Remaining risks — Phase 3 quality gate NOT fully closed

- OPL2 implementation still uses approximate envelope/timing/feedback algorithms; lacks accurate rhythm/percussion mode and comprehensive DBOPL golden vectors. `TUNE.COM` is evidence for **one real DOS program**, not complete AdLib compatibility.
- SB2 implements a useful 2.01 8-bit subset with DMA1 + IRQ5, but not the entire SB2 command set, PIC/ISA timing, IRQ/EOI interactions under representative real games, or long-run audio jitter tolerance.
- A five-scenario hardware TODO backlog remains. No automatic conversion of TODO into PASS.
- Source revision/licensing provenance for user-supplied DOSBox-X files is not independently pinned; do **not** make a public release from this PERSONAL image without clearing third-party rights (ZX ROM, DEBUG and FreeDOS files).
- Cross-browser `file://` in Chrome/Firefox/Edge remains unverified in this CI environment. Browser checks used inline scripts / Chromium.
- The combined one-command `npm run test:release` has not been demonstrated end-to-end in a single finished invocation. Relevant suites and UX stress were run successfully as independent commands.

**Decision:** This is a usable **Phase 3 functional compatibility milestone** suitable for entering Phase 4 with the above accuracy/legal gaps tracked, not a claim of complete historical audio fidelity.
