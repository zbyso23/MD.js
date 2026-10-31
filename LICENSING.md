**v5.4.6 note:** See [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) for KaTeX and PERSONAL redistributability caveats. Full archive is not cleared for public redistribution.

# MD.js Ultra — license map and reuse policy

## Project decision (22 Oct 2026)

The project maintainer has approved **GNU GPL version 3** as the license for MD.js Ultra project-authored code and **accepted GPL code reuse** for the future PC/XT + 286 laboratory. The repository root `LICENSE` contains the full GPLv3 text. The original 2016 `legacy/MD.js` expressly declared GPL version 3; we intentionally select **GPL-3.0-only** as the conservative combination target until the copyright notices of any newly imported code are reviewed. No assumption that all files can be relicensed is made.

GPL does **not** ban commercial use. Distribution of a combined program must satisfy GPL terms (including corresponding source code, copyright, license notices and build/install scripts as applicable). Merely copying the GPL text is not enough.

## Third-party code already bundled

- `zx/vendor/`: original **MIT** code by **David Crespo Tascón** (MinZX and peripherals) and **Molly Howell** (Z80 core). Original file headers and `zx/vendor/LICENSE` remain valid; the license allows combination with GPLv3 provided the MIT attribution and license text are retained. See `zx/LICENSES.md`.
- Personal-use `seBasic321.rom` / `zx48.rom`: **not in clean-source distribution**; public redistribution rights have not been established. A user-supplied file is not automatically covered by the project GPL.
- The user's privately loaded DOS/game/tape/disk contents are not licensed by this repository.

## DOSBox-X BIOS source intake and bounded JS adaptation: PRESENT

- The user has supplied 13 **DOSBox-X BIOS source reference snapshots** under `optional/pc/vendor/dosbox-x-reference/`. The original copyright headers identify GPL-2.0-or-later, and the files remain byte-for-byte identical. Their SHA-256 manifest is checked by tests.
- A new **`optional/pc/PC-BIOS.js`** is a JavaScript adaptation of limited data-layout, callback and BIOS keyboard-buffer mechanisms grounded in those upstream sources. It is GPL-3.0-only and explicitly attributes the DOSBox-X sources in its header.
- **No original DOSBox-X C++ sources are compiled or executed** by the current browser PC Workbench. The supplied files have missing dependencies; merely retaining them does not constitute a DOSBox-X port.
- Before public publication, confirm the supplied upstream commit against the repository, inspect all inherited source licenses, and distribute the required corresponding source and build materials. User approval of GPL use does not waive its conditions.
- The historical IBM, AMI, Award or 86Box proprietary ROM images remain excluded from distribution; the alpha still uses its project-written firmware shim, not authentic POST.
- CPU source intake now uses the user's specified DOSBox-X revision `029bd65c5dcc7cdc7f2e14e35278620d9707d969`; the selected 8086/286 C++ cores, shared CPU headers, and their GPL-2.0-or-later headers are retained verbatim under `optional/pc/vendor/dosbox-x-cpu/`. Includes `COPYING.GPL-2.0`, a checksum manifest, and provenance notes. Full/dynamic/386 cores were not imported. The SHA-256 manifest proves integrity *within the supplied snapshots*, not upstream Git provenance.
- The browser CPU is still JavaScript and not the user-supplied C++ core. `PC-Core.js` now implements additional 16-bit addressing, ALU and string operations with DOSBox-X 8086/286 reference behavior; C++→WASM integration is FORBIDDEN by the uncompiled-project architecture; only native human-readable JavaScript may execute. Clearly distinguish inspiration/adaptation from byte-for-byte upstream reuse.
- The later disk BIOS sources are preserved as **reference only**, with FDD in Phase 2 and IDE in Phase 4; they are not yet functional emulated peripherals.

## Background reading

- https://www.gnu.org/licenses/gpl-faq.html#v2v3Compatibility
- https://github.com/joncampbell123/dosbox-x/blob/master/README.source-code-description
- https://github.com/dosbox-staging/dosbox-staging/blob/main/LICENSE

## Architectural constraint: uncompiled source only

MD.js Ultra is a browser-first, no-build project. No WASM or generated binaries are permitted in the active runtime, and no build tool is required to open the HTML. Any original DOSBox-X C++ snapshot is kept as **reference source only** under its original GPL notices. Behavioral adaptations in `PC-Core.js` and `PC-BIOS.js` run directly as JavaScript with the project's GPLv3 terms. Optional `npm` commands invoke tests, not a build.
