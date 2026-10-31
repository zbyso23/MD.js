# MD.js Ultra v0.8.0 — Phase 2 FreeDOS & DEBUG release (23 October 2026)

**New milestone:** Boot real FreeDOS 1.4 from an embedded 720 KiB FAT12 floppy on XT and 286 AT, with an amber Hercules CRT and actual executable DEBUG.COM on XT.

- Open `optional/pc/index.html` directly. The personal build includes `PC-EmbeddedAssets.js`, automatically mounts drive A: and boots FreeDOS without a server.
- Click the Hercules monitor or `Klávesnice → DOS` and type using the host keyboard. Or enter DOS commands in the text input and click `Odeslat + ENTER`.
- XT: `DEBUG`, then `R`, `A 100`, `U 100`, `G`, `Q` were executed by the real x86 guest interpreter.
- XT/AT: `DIR`, `COPY`, `DEL` and real FAT12 writes pass. `DEBUG.COM` on AT currently fails its CPU-detection attempt at 386 opcode 66h, correctly invalid on 286. See report; do not treat as full 286 application compatibility.
- A: is embedded 720 KiB; 1.44 MiB images remain import-only (File API, not Base64-embedded).
- Original 720 KiB image preserved (`x86BOOT-720K-DEBUG.img`); the dev variant bypasses the installer menu by modifying only FDCONFIG.SYS and FDAUTO.BAT and adds the user-supplied DEBUG.COM.
- Pure plain JavaScript; no build step, WASM, or 386 processor; strict ≤1 MiB installed system RAM.
- The personal build contains user-supplied ROM and DOS image: check redistribution rights before making this exact package public.

See `PC-PHASE2-FREEDOS-DEBUG-GATE-v0.8.0.md` for tests, scope and limitations.

---

# MD.js Ultra v0.7.8 — Phase 2 CGA/Hercules + FDD milestone

**Latest release:** video and floppy hardware now work as native, readable JavaScript in the optional PC Workbench. Both XT and AT execute BIOS `INT 10h` text/graphics and can load/execute a real guest boot sector from a raw floppy image via `INT 13h` and `INT 19h`. **FreeDOS has NOT been booted yet; Gate 2 is open.**

- **Display:** `PC-Video.js` implements CGA text/4-color/mono graphics and Hercules 720×348 monochrome, mapped video RAM, video ports, and a Canvas screen reading the true VRAM buffer.
- **Floppy:** `PC-Floppy.js` implements A:/B:, image uploads, limited NEC 765 I/O, DMA2/IRQ6, CHS BIOS services, boot-sector execution and transferable JSON media snapshots. No copyright-protected disk images are bundled.
- **Testing:** 235 PC, 192 Markdown/runtime, 49 Blockly/Arduino, 31 ZX tests (**507 PASS**), plus real Chromium video/floppy/ZX/browser E2E. `npm run test:release` rechecks them. FreeDOS prompt remains an unpassed Gate 2 test.
- **Absolutely unchanged:** no build, WASM, ES modules or required web server; source-only JS. Max 80286, max 1 MiB system RAM; no 386. Original user's ZX ROM is included only in the personal ZIP, not the public clean-source ZIP.

Detailed report: [`PC-PHASE2-VIDEO-FDD-v0.7.8.md`](PC-PHASE2-VIDEO-FDD-v0.7.8.md). The historical release notes below are retained for provenance.

---

# MD.js Ultra v0.7.7 — PC Phase 1 foundation release

**Distribution:** This working directory is the *personal* build with the user's supplied ZX 16KiB SE Basic ROM and inline Base64 fallback. Do not publicly redistribute the bundled ROM without permission from its copyright holder. A separate clean-source archive omits these ROM bytes and allows the user to load their own ROM.

**Phase 1 baseline:** XT/AT CPU instruction testbed, basic protected mode and LDT/TR registers, interrupt handlers, PIC/PIT/DMA register models, GPL BIOS adapter, strict max 1MiB RAM, and 207 PC tests. **Not a complete 80286:** unimplemented 16-bit TSS hardware task switching, ring stack transitions, full ISA decoding and accurate hardware timings are documented rather than silently declared complete. Real FreeDOS boot is a Phase-2 acceptance test, not claimed here.

**Runtime:** pure classic JavaScript + HTML/CSS, direct source, no WebAssembly/compilation/bundlers. fetch where supported, manual File API fallback; optional Blob Worker; always JSON import/export, browser localStorage optional. Personal ZX build uses embedded ROM on failed fetch.

More details: `PC-PHASE1-FOUNDATION-RELEASE-v0.7.7.md` and `ZX-ROM-PERSONAL-NOTICE.md`.

---

# MD.js Ultra v0.7.6 — Universal Runtime (Phase 1 Alpha)

One distribution, small optional labs. Pure vanilla JavaScript. No npm/CDN/browser runtime dependencies.

**Open `index.html`** (landing page) or run `./run-local.sh` and visit `http://127.0.0.1:8000`.

| Component | Path | Loaded with core? | Purpose |
|---|---|---|---|
| Markdown ES6 | `MD.js`, `MD.css` | **Yes — standard** | GFM-oriented text, safe HTML, H1–H6, extended features |
| Mermaid-like SVG | `MD-diagrams.js` | **Yes — standard** | Strict subset of Mermaid-like diagrams |
| Charts Mini | `MD-Charts.js` | **Yes — standard** | Bar/column, horizontal bar, line, pie |
| Document UI | `MD-docux.js`, `MD-UX.js` | **Yes — standard** | Sort/filter tables, zoom, theme, print, SVG save |
| Blocks Lite | `optional/blockly/` | **No** | Visual blocks, exports JS/Python/Arduino |
| Arduino Toy Lab | `optional/blockly/index.html?preset=playground` | **No** | Virtual LED, button, switch, pot, PWM, servo, stepper, synthetic mic |
| ZX Ultra | `zx/` + `zx-ultra.html` | **No** | Real 48K Z80/ROM emulator, BASIC/TAP/SNA/SCR, ASM Lite |
| PC/XT + PC/AT Phase 2 | `optional/pc/index.html` | **No** | 8086/partial 286, CGA/Hercules, VRAM + INT 10h, FDD + INT 13h, test boot sector; **NOT FreeDOS boot** |

Blockly and Arduino deliberately **share one optional environment**, not duplicate framework code. ZX is an independent optional environment. Markdown itself does not run source code or emulated binaries just because the document was opened.

## Charts Mini (`~~~chart`)

Using a simple strict line format, not JavaScript/JSON:

    ~~~chart
    type: bar
    title: Benchmarks
    x: Component
    y: MiB/s
    data:
    Parser: 12
    ZX: 9
    Blockly: 8
    ~~~

Change `type:` to `bar-horizontal`, `line`, or `pie`. Aliases `column`, `horizontal`, `barh`, `vertical` are accepted. `title`, `x`, `y`, `unit` are optional. Values are finite, nonnegative numbers; data has at most 24 rows. Unsupported/invalid chart syntax stays **escaped source**. Charts use SVG DOM with `textContent`, not dynamic HTML or eval.

**Standard document setup:** Load `MD.js`, `MD-diagrams.js`, `MD-Charts.js`, `MD-docux.js`, `MD-UX.js` in that order (classic script tags). These are standard MD.js Ultra modules, not opt-in labs. Then `new MD({mode:'extended'}).mount(article,markdown)`; `parse(markdown)` alone still returns safe text/HTML and chart source blocks.

A rendered chart has source/zoom buttons and an SVG export button when DocUX is loaded. The existing `mermaid` `pie` directive remains supported independently.

## GFM sortable table fix

Older versions required **at least three dashes** in the alignment separator, while the bundled examples used `:--` and `--:` — the parser therefore showed raw Markdown. Now one or more dashes are accepted as GFM permits:

    | Project | Tests | Time |
    |:--|--:|--:|
    | ZX | 31 | 12 |
    | Blocks | 49 | 3 |

The renderer creates a real `<table class="md-table">`; `MD-docux.js` adds stable ascending, descending, then original-order sorting and text filtering. CSS ensures filtered `<tr hidden>` are invisible even with third-party styling.

## Universal Runtime v0.7.6 — HTTP-first, file:// fallback

The shared `MD-Runtime.js` is a **classic JavaScript script**, not an ES module and not a compiled artifact. ZX and PC labs load it only when opened. All application code runs as plain JS/HTML/CSS: **no WASM, compilation, bundling, imports, runtime npm or CDN**.

- **Keep automatic loading:** attempt `fetch('./asset')` whenever allowed (including HTTP(S)); when it fails due to `file://`, missing file or security policy, expose manual loading through a file picker; allow Base64 paste for ZX ROM if File API is unavailable.
- **Workers:** a text-only worker source is embedded directly in each lab's HTML. `Blob` + `URL.createObjectURL()` creates the classic JS Worker. Snapshot JSON serialization falls back to main-thread JS if worker creation or execution fails. **The CPU core itself is still on the main thread** in this milestone; do not represent worker serialization as worker CPU emulation.
- **Persistence:** localStorage save/load is optional. Both PC and ZX offer **JSON export and import regardless of localStorage**; pasted JSON is available if file selection is not. No third-party ROM is bundled in exported ZX JSON. ZX import requires the same ROM fingerprint; it stores CPU registers, 48 KiB RAM, screen border and loaded TAP blocks/cursor. PC JSON captures 8086/286 guest state, conventional/extended RAM, available PIC/PIT/DMA/CMOS/BIOS state.
- **Format:** `mdjs-ultra-machine-state` version `1`, `machine` is `pc` or `zx`. JSON is user-controlled input and checked for machine/profile/sizes. Do not import unknown or oversized data. Data is kept client-side.
- **URL limitation:** this runner's Chromium blocks direct `file://` and `localhost` navigation by administrator policy, so we ran browser checks in an opaque-origin page with scripts injected as plain classic JS and unit tests for successful/failed `fetch`; **direct `file://` and actual HTTP navigation need a separate smoke test in an ordinary browser**. They are design targets, not externally certified across browsers.

See [`UNIVERSAL-RUNTIME-v0.7.6.md`](UNIVERSAL-RUNTIME-v0.7.6.md) for implementation details, browser restrictions and test steps.

## Tests

    npm test                 # Markdown, diagrams, docs, charts and table regression
    npm run test:blocks      # block/Arduino unit tests
    npm run test:zx:unit     # includes genuine Z80 unit tests
    npm run test:pc:phase1   # bounded 8086/286 CPU and chipset tests
    npm run test:pc:browser  # real CPU in Chromium (Playwright dev tool)
    npm run test:ultra:browser  # Chromium via Playwright (dev-only)
    npm run test:release
    npm run test:runtime:browser  # opaque-origin PC+ZX tests in real Chromium

Tests require Node.js; optional browser E2E requires Python Playwright and local Chromium. **No `npm install` required to use MD.js Ultra.**

## ZX ROM packaging

Two builds are produced. `public-clean-source` contains ZX emulator sources under MIT but **not** the user-supplied ROM. It requires a compatible 16KiB ROM supplied by the user. `personal-rom` contains the privately supplied `seBasic321.rom`, and is **not cleared for public redistribution**. No automatic enforcement of ownership for user-loaded TAP/ROM/other files; validation is technical only. The classic `zx/run-local.sh` may attempt a fetch if the clean package has no ROM, while the root `run-local.sh` never does.

## Roadmap, not bundled emulators

Atari 800, Apple II, C64 and Micro JS-Torch remain roadmap-only. PC/XT + PC/AT are currently at **Phase 2 video/FDD milestone**: XT/AT CPU foundation, CGA/Hercules + FDD/boot-sector capability in `optional/pc/`. **Gate 2 remains open; no FreeDOS prompt is claimed.** The four-phase frozen implementation plan is [`PC-ENV-ROADMAP-v1.1-FROZEN.md`](PC-ENV-ROADMAP-v1.1-FROZEN.md). See [`PC-PHASE-1-ALPHA-REPORT.md`](PC-PHASE-1-ALPHA-REPORT.md). Optional 3D/CAD concepts remain deferred.

## Scope and security

Bounded chart DSL and nonnegative finite numbers. No direct HTML inserted from chart labels. Docs and labs share the **distribution** but not an execution context. License decision: GPLv3 accepted for MD.js Ultra original/project code; see [`LICENSE`](LICENSE) and [`LICENSING.md`](LICENSING.md). MinZX remains MIT with its existing copyright notices. The vendored DOSBox-X CPU/BIOS *reference snapshots* retain their GPL-2.0-or-later notices; selected BIOS/CPU behaviors are implemented in native GPLv3 JavaScript. The original C++ files never execute in the browser. Personal ZX ROM is still excluded from public builds.


## PC/XT + PC/AT environment — GPL accepted, scope frozen

See [PC-ENV-ROADMAP-v1.1-FROZEN.md](PC-ENV-ROADMAP-v1.1-FROZEN.md). The four mandatory test gates are:

1. **Both CPU platforms together (8086/8088 XT and 80286 AT)**, chipset and a DOSBox-style BIOS service layer. Authentic AMI/IBM ROMs are **not** bundled. A minimal original reset/ROM shim plus GPL BIOS callbacks is permitted. Test real CPU instructions, 286 protected mode, port/interrupt behavior and BIOS services.
2. **Hercules/CGA + FDD**; boot **real FreeDOS** from a floppy image on **both** XT and AT, run DOS programs and test framebuffer/input/BIOS disk services.
3. **Covox + Sound Blaster 2.0 (AdLib-compatible OPL2, DSP, PCM, DMA, IRQ)**; verify hardware-facing behavior and real sound on both configurations.
4. **VGA + AT IDE + compatibility/performance tuning**; retain CGA/Hercules and earlier test gates.

**Hard cap: maximum 1 MiB of installed system RAM, including extended RAM on the AT.** No 386, paging, V86, SB16, OPL3 or general DOSBox clone. Independent device/VRAM and ROM regions are not part of the system-RAM count; CPU address-space width is separate. PC is an optional lab, never auto-started by rendering Markdown. Embedded PC BLOB limit remains 128 KiB each, with disk images external.

### Copyright and source-code obligations

The project's acceptance of GPL is a product decision, **not** a claim that a future code import is compliant merely because a `LICENSE` exists. For each DOSBox / DOSBox-X / DOSBox Staging source file copied or adapted, preserve provenance, original authors/copyright headers, individual SPDX/version terms and modification notes; provide the corresponding source and license notices for redistributed/adapted code, and keep the resulting combined work compatible with GPLv3. MD.js Ultra expressly excludes WASM, C++ compilation and any runtime build requirement. Check each file — `GPL-2.0-only` is **not** interchangeable with `GPL-2.0-or-later`. DOSBox-X C++ reference snapshots are vendored with GPL notices but not executed; the initial firmware remains project-authored and explicitly incomplete. See [`LICENSING.md`](LICENSING.md).

## PC BIOS intake v0.7.1

Thirteen user-supplied DOSBox-X GPL-2.0-or-later C/C++ reference files are preserved unchanged under `optional/pc/vendor/dosbox-x-reference/`, with SHA-256 hashes. The running optional PC lab now uses `PC-BIOS.js` (a small GPLv3 JavaScript adaptation of BIOS BDA/callback/keyboard buffer concepts), **not** the full DOSBox-X binary. PC Gate 1 is **still open**. Read `PC-PHASE1-DOSBOX-IMPORT-v0.7.1.md`.

### PC Phase 1 CPU extension (v0.7.2 alpha)

Optional `optional/pc/index.html` now runs a broader **JavaScript** 8086/286 subset: ModR/M memory operands, segment overrides, REP string instructions and several additional 286 instructions. CPU source references from DOSBox-X commit `029bd65c5dcc7cdc7f2e14e35278620d9707d969` are vendored and checksummed separately under `optional/pc/vendor/dosbox-x-cpu/`, **not** compiled into a WASM runtime. This is incremental integration, not a full DOSBox-X CPU port; phase 1 acceptance gate remains open. Use `npm run test:pc` for Node and real Chromium tests.

### PC Phase 1 native JavaScript CPU upgrade (v0.7.3 alpha)

**Hard architecture contract:** the entire project remains uncompiled. Open `index.html` directly from disk. No transpilation, bundler, toolchain, Emscripten, WASM or compiled CPU artifacts. Node and Chromium are used **only to run optional tests**, not to build the application. The DOSBox-X files remain source references with upstream copyright and GPL-2.0-or-later notices.

`PC-Core.js` now executes additional 8086/286 instruction groups: `F6/F7` TEST/NOT/NEG/MUL/IMUL/DIV/IDIV, `FE/FF` INC/DEC/near and far CALL/JMP/PUSH, `D0..D3` shifts and rotates, 286-only `C0/C1` immediate shifts and `ENTER/LEAVE`. Important generation distinctions include the original 8086 `PUSH SP` behavior and 8086-versus-286 shift count masking. On the 286, protected-mode interrupts use an 8-byte IDT gate (with limited same-privilege interrupt/trap handling) rather than silently reading a real-mode IVT.

Workbench has runnable **ALU / SHIFT** and **286 IDT** buttons. The browser E2E exercises both with the **actual JS interpreter**, not mocked results. Unsupported opcodes, reserved subfunctions, unsupported ring transitions, zero-divisors and invalid IDT gates fail explicitly. The **Phase 1 acceptance gate is still OPEN**: missing many opcodes, 286 tasks/privileges, accurate faults and instruction timings, full BIOS and chipset fidelity.

See `PC-PHASE1-NATIVE-JS-CPU-v0.7.3.md` for precise limitations and reproducible tests.


### PC Phase 1 native JavaScript guest CPU exceptions (v0.7.4 alpha)

`optional/pc/PC-Core.js` now routes selected real x86 faults (`#DE` from `DIV/IDIV`, `#BR` from 286 `BOUND`) to actual guest interrupt handlers via real-mode IVT or the currently supported 286 protected-mode IDT. Unsupported/missing handlers still fail closed. Chromium PC Workbench has guest fault demo buttons and 8 diagnostic checks. **No WASM/compilation/bundling whatsoever.** Gate 1 remains open. Details: [`PC-PHASE1-CPU-EXCEPTIONS-v0.7.4.md`](PC-PHASE1-CPU-EXCEPTIONS-v0.7.4.md).

## v0.7.5 — PC native-JS hardening

Phase 1 remains **OPEN**, with real running improvements in `optional/pc/`: 8086 BCD/ASCII adjustments, `CBW/CWD`, `XLAT`, `INTO`, far `CALL`, `LES/LDS`, AAM/AAD, 286 immediate `IMUL`, `INS/OUTS`, `ARPL`, `VERR/VERW`; more faithful 286 descriptor cache/segment access checks; full 8259 ICW initialization and AT slave-PIC IRQ8–15 cascade (IRQ10 E2E). These are not a substitute for exhaustive CPU conformance tests.

The new Workbench **BCD** and **AT IRQ10** demos run machine instructions in the user's browser. The original project remains **uncompiled**: no transpilation, bundling, WebAssembly, or C++ runtime dependency. See [`PC-PHASE1-HARDENING-v0.7.5.md`](PC-PHASE1-HARDENING-v0.7.5.md) for verified tests and explicit unresolved Gate 1 blockers.

## Update v0.8.1 — PC/ZX/Blocks Lite UX stabilization

See [`UX-STABILIZATION-v0.8.1.md`](UX-STABILIZATION-v0.8.1.md) for a detailed changelog and verification status.

- PC Workbench CPU and video diagnostics use isolated temporary emulators instead of resetting live FreeDOS.
- ZX: physical key alias mapping, 40-key virtual keyboard and user-optional OpenSE BASIC keyword shortcuts.
- Blocks Lite: fully original Pointer Events drag-and-drop editor; **not embedded Google Blockly**.

Run `npm run test:ux:browser` for the added real Chromium checks. The existing `npm run test:release` retains all previous gates.
