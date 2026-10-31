> **SUPERSEDED FOR BUNDLED CONTENT BY PHASE 4M.1:** NASM is removed from the distributed image and project. Historical checks in this report refer to Phase 4M only. See PHASE4M1-NASM-REMOVAL.md.

# MD.js Ultra — Phase 4M: Developer B: complete toolchain

**Checkpoint date:** 2026-10-29 (Europe/Prague). **Artifact:** PERSONAL development build.

## What is delivered

A real 720-KiB FAT12 disk image `optional/pc/x86DEV-720K-XT286.img` is bundled as the same byte-for-byte Base64 data in `PC-EmbeddedAssets.js`. It is auto-mounted as **B:** on both XT and AT/286; **A:** boots FreeDOS. Both startup images remain **read-only** by default. For writing, use **Pracovní kopie B: (RW)** in the PC Workbench. The built-in original remains untouched and can be restored; user must export the writable IMG to persist work outside the browser session.

### Exact image payload

| Program/file | Bytes | Verified guest target |
|---|---:|---|
| `EDIT.COM` | 9,017 | XT, AT |
| `DEBUG.COM` | 22,324 | XT, AT |
| `NASM.EXE` | 223,623 | **AT/286 only**: version 0.98.39 |
| `CC.EXE` | 82,272 | XT, AT: Small-C 2.5 |
| `ASM.EXE` | 64,352 | XT, AT: Small Assembler 1.2 |
| `YLINK.EXE` | 37,104 | XT, AT: YLink 1.2 |
| `CLIB.LIB` | 32,368 | XT, AT C link library |
| `STDIO.H` | 4,213 | XT, AT C header |
| `HELLO.ASM` | 217 | NASM x86 real-mode sample |
| `HELLO.C` | 225 | Small-C C example |
| `DEVHELP.TXT` | see image | DOS usage notes |

There is ample free capacity for work files, subject to FAT12 720KiB constraints. All third-party binaries are **actual MZ DOS executables**, supplied by user; the compiler/linker runs within emulated FreeDOS, *not* the JS host.

## Verified guest end-to-end compilation

After explicitly switching B: to writable work-copy:

```dos
B:
CC HELLO
ASM HELLO
YLINK HELLO.OBJ,CLIB.LIB -e=HELLOC.EXE
HELLOC
```

**XT 8086: PASS; AT/286: PASS.** `HELLO.OBJ` generated, a **4,896-byte DOS MZ executable** produced, actual DOS guest output: `Hello from 16-bit DOS C!`.

On AT/286 only:

```dos
B:
NASM -v
NASM -f bin HELLO.ASM -o HELLO.COM
HELLO
```

**AT/286: PASS.** 33-byte `.COM` created, DOS guest output `HELLO FROM XT/286!`.

**NASM 0.98.39 is NOT an XT executable**: supplied MZ binary executes `LEAVE` (80186+) and the emulator correctly rejects it on 8086. XT has an actual assembler in `ASM.EXE`, whose output is linked with YLink. Do not make 8086 accept `LEAVE` merely to force the NASM executable to launch.

Important: `CC HELLO` generates/overwrites `HELLO.ASM` on the writable clone because the examples share the same base name. **Run NASM first**, then C; or recreate the B: work copy. Original RO B: stays unchanged.

**The mininasm ZIP contains only source code**, and no compiled `mininasm.com`. It is retained under `devtools/upstream/mininasm-master.zip` but is **not installed** or presented as verified on B:. It can be added later after acquiring and testing an 8086 DOS build.

## Verified regression/test strategy

- New `optional/pc/tests/devdisk-bootstrap.test.cjs`: verifies FAT12 geometry, required real file sizes, embedded image equality, RO/RW isolation, provenance and build script.
- New `optional/pc/tests/test_dev_toolchain_browser_phase4m.py`: separate clean Chromium/FreeDOS guest workflows for XT and AT; verifies generated `.OBJ`, 4,896-byte `.EXE`, 33-byte `.COM` (AT), actual console output.
- Older `test:pc:devdisk` remains intact for auto-mount, editor, DEBUG, default RO, writable clone, eject and restore.
- New `npm run test:pc:phase4m` included as final stage in `npm run test:release`.
- `cpuFrame()` now recognizes DOS prompts on any drive (`A:\>`, `B:\>`, `C:\>`); previously stopping only on A caused avoidable infinite CPU frames at B prompt.

**Full `npm run test:release` gate: PASS, exit code 0**, including XT and AT guest compiler/linker/NASM integration; full log attached separately. A successful guest compile is not proof of universal DOS compatibility.

## Legal/provenance considerations

- Small-C, Small-Assembler and YLink: user's `Small-C-master.zip`; historical author notices and royalty-free distribution notice preserved (`optional/pc/devtools/upstream/SMALL-C-LICENSE.txt` and source archive).
- NASM v0.98.39: user's `nsm09839.zip`; the **2005-era license is not the modern BSD-2-Clause** (NASM changed at v2.07). Old source/license must be checked before public redistribution; this bundle is **PERSONAL**. Historical source URL: https://sourceforge.net/projects/nasm/files/nasm%20sources/0.98.39/ .
- mininasm: user's source ZIP and BSD-style LICENSE preserved; no DOS binary included.
- Other project software license/provenance retained as before.

No WASM, transpiler, bundler or JS runtime npm dependency has been added. Installation/compilation is *guest-side* 16-bit DOS. The only host-side assembly is assembling the FAT12 bytes ahead of distribution.

## Remaining issues

1. Provide a tested DOS `MININASM.COM` (source archive alone does not supply it), if desired as a NASM-compatible XT assembler in addition to existing Small-Assembler.
2. Public release of historic NASM needs an explicit audit of its corresponding license and source obligations.
3. Editors remain line-oriented; a full-screen interactive editor (and Insight debugger) is not part of this milestone.
4. `file://` browser behavior in multiple *user desktop* browsers remains separately unverified in this CI environment, although embedded image is serverless and Chromium execution works with inlined scripts.
5. 286 protected mode, complete 80-bit FPU and complete SB2/OPL2 accuracy remain bounded historical-compatibility work, unrelated to successful C/ASM toolchain compilation.

## Release confirmation

- Full release gate completed in one run: **exit code 0** (verified by runner).
- PC unit suite **354 PASS**; release also includes Markdown, ZX, Blocks, audio, graphics, IDE/FDD, debugger and real DOS toolchain browser tests.
- Earlier screenshots restored from pristine previous Phase 4L project: 12 files.
