# MD.js Ultra — Phase 4A VGA milestone (24 October 2026)

**Status:** VGA 4A functional preview and own DOS test binaries **PASS**; full Phase 4 Gate **OPEN**. AT IDE **not yet implemented** (source-first dependency missing). Phase 3 historical accuracy questions remain open, even though practical audio regression passes.

## Source / frozen architecture

- Based on the real latest Phase 3 Compatibility PERSONAL archive containing the 137-byte `TUNE.COM` and the Stabilization 1 + 2 code.
- Native, uncompiled JavaScript/HTML/CSS only; no WASM, C++ compilation, bundles, runtime npm, 386, OPL3, SB16, or extra system RAM.
- `optional/pc/PC-VGA.js` implements a bounded VGA controller in a separate class. `PC-Video.js` CGA/HGC remains untouched, except for normal machine integration via `PC-Machine.js`.
- VGA selection restricted to the AT/286 profile, 256 KiB VRAM independent of the **≤1 MiB system RAM** limit.
- Architectural guidance from the user-supplied `vga.cpp`, `vga_memory.cpp`, `vga_gfx.cpp`, `vga_dac.cpp`, `vga_attr.cpp`, `vga_crtc.cpp`, `vga_draw.cpp`. The C++ files remain reference-only; hashes are recorded in the vendor manifest. The exact upstream commit is **unverified**.

## Implemented

1. **VGA text mode** on AT/286: browser rendering of BIOS-compatible B8000 text cells, allowing FreeDOS 1.4 to reach `A:\>`.
2. **Mode 13h**: BIOS `INT 10h` mode select, 320×200×256, VGA chain-4 mapping of CPU guest memory `A000:0000`, pixel APIs, DAC 6-bit palette via ports `3C8h/3C9h`, read index `3C7h`, mask `3C6h`.
3. **Mode 12h**: BIOS 640×480×16, 4 × 64 KiB planes, `A000:0000`, sequencer plane write mask (`3C4h/3C5h`), graphics read-map select/write modes 0–3 subset (`3CEh/3CFh`), basic latch and color compare, attribute palette registers (`3C0h/3C1h`).
4. **Snapshots**: VGA VRAM/DAC/graphics/sequencer/attribute registers preserved, invalid payloads rejected. Older CGA/Hercules snapshots remain supported.
5. **Display geometry**: opt-in historical 4:3 CSS correction, while existing raw, 1×, 2× and Fit modes persist. No changes to framebuffer data. VGA Mode 12h is 4:3 by construction.
6. **Two genuine 16-bit DOS binaries** on the real embedded FAT12 disk: `VGA13.COM` (**39 bytes**) and `VGA12.COM` (**33 bytes**). Both use actual BIOS `INT 10h` and guest writes to video memory; press any key for `INT 16h` continuation and return to text mode 03h and DOS. Original TUNE/DEBUG/FreeDOS files unchanged; both FAT copies consistent.
7. **Workbench UX:** VGA option available on AT, isolated guest x86 VGA 13h/12h previews in the CPU Test drawer. Selecting XT while VGA is active falls back to CGA rather than enabling VGA on XT.

## Verification, current session

- `npm test`: **192 PASS**, `npm run test:blocks`: **54 PASS**, `npm run test:zx:unit`: **31 PASS**.
- `npm run test:pc:phase1`: **253 PASS**, including **12 Phase 4A VGA/FAT12 tests**.
- `npm run test:pc:phase3:preflight`: **51 PASS, 5 TODO** (not counted as PASS).
- **581 passing unit/preflight tests** (192+54+31+253+51), plus separately executed browser tests. Passing numbers do not certify all historical hardware behavior.
- `npm run test:pc:phase4a`: PASS: AT VGA FreeDOS text, 13h/12h isolated guest drawing, CRT correction with unchanged state, actual DOS `VGA13.COM` / `VGA12.COM` and keyboard-return to text mode.
- Browser regressions: original FreeDOS XT/AT and DEBUG XT; Phase 3 `TUNE.COM` on XT and AT with audible PCM from actual guest x86; all six Covox/OPL2/SB2 demo cases; UX Shell PC 30, Blocks 25, ZX stress — all **PASS individually**.
- A fresh one-shot `npm run test:release` monolithic run was **not completed** in this milestone; all listed component suites were run individually. Do not misrepresent it as a full release gate.
- Native desktop Chrome/Firefox/Edge `file://` open is **not fully certified** in this CI environment.

## Still unsupported / not guaranteed

- **No AT IDE/ATA yet** — reference `src/hardware/ide.cpp`, matching headers and BIOS services are not available in the uploaded sources. Obtain these before implementing IDE under our source-first policy.
- VGA functionality is **bounded and not cycle-accurate**: VGA registers do not yet cover all undocumented combinations, plane latch details, hardware scrolling, CRTC timing/blanking, pixel clocks, full BIOS VGA services, chipset extensions or diverse games. Some default DAC entries are approximations.
- Graphics mode demo compatibility is proven with our own actual `.COM` binaries, **not arbitrary DOS software** or Flashback.
- 286 instruction set, protected mode, sound timing and OPL2/SB2 fidelity still have documented limitations, to be addressed as blockers or during the agreed post-Phase-4 stabilization.
- PERSONAL build embeds user-supplied ROM, FreeDOS and DEBUG. **Not a public/redistributable clean OSS binary** without an independent licensing review.

## How to use

Open `optional/pc/index.html` on a desktop browser, select **AT · 80286** then **VGA**. After FreeDOS reaches `A:\>`, enter `VGA13` or `VGA12`. Press any key to restore text mode and DOS prompt. `TUNE` remains available for AdLib music. Under diagnostics you can also preview VGA modes without mutating the live guest. Raw pixels are the unchanged default; CRT 4:3 is an explicit presentation toggle.

## Required for Phase 4B

Please supply a consistent, license-compatible set of **DOSBox-X `src/hardware/ide.cpp` and relevant IDE headers/BIOS integration sources** from an identifiable revision (ideally with Git commit plus per-file license headers). On receipt, implement AT-only ATA PIO/ports, BIOS INT 13h hard disks, disk image copy-on-write, export/import and write-durability tests. XT IDE is outside the frozen scope.
