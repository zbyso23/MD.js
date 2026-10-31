# MD.js Ultra — Phase 4O-A F2 Encyclopedia

Date: 2026-10-29. Release stage: **implemented, static/unit verified, browser certification pending**.

## Implemented

- One common F2 overlay across nine user entrypoint pages (landing, PC, ZX, Markdown editor/charts/reader, Blocks, ZX Markdown demo and ZX screen demo).
- Always visible 📖 launcher; F2 toggle in guest monitor / non-host-editing UI, Escape closes and returns focus. Native host input/textarea F2 is not intercepted. Fullscreen event repositions launcher/overlay inside fullscreen subtree; mobile responsive layout and reduced-motion support.
- Two top sections: Markdown (8 chapters) and Assembler (18 chapters). Each has categories, local offline search of title, summary, and whole article, and per-article history back/forward.
- Existing `new MD({mode:'extended'}).mount(...)` renders articles. Existing MD-diagrams.js / MD-Charts.js / MD-docux.js enhance diagrams, charts, code blocks, tabs, tables and FAQ; no duplicate Markdown rendering stack.
- Exact original guest-tested source: XT/Hercules HGCFRAC.s, XT/CGA CGAFRAC.s, AT/286+80287XL VGA MANDEL.s and AdLib TUNE.s, with on-demand source download buttons. Complete source is embedded locally as data for file:// and never executed automatically.
- ASM/Z80 introductory chapters plus reference articles for DOS files, FDD/IDE, PIT/speaker, interrupts, TSR, SB2 DMA and 286 protected mode. **Reference-only** lessons clearly indicate that the displayed code is not an independently verified guest program.
- Core CPU, FPU, ROM, original boot A:, developer B:, IDE.COM and images are byte-for-byte preserved from Phase 4N. NASM remains excluded.

## QA evidence

- `npm test`: **192 PASS / 0 FAIL**.
- `npm run test:blocks`: **PASS**.
- `npm run test:zx:unit`: **31 PASS / 0 FAIL**.
- `node --test optional/pc/tests/*.test.cjs`: **361 PASS / 0 FAIL** (includes 4 Phase 4O tests).
- `npm run test:encyclopedia:unit`: **4 PASS / 0 FAIL** (same 4 also included in the 361 count).
- Node parser successfully rendered all 26 embedded chapters; no parser exceptions.
- Nine HTML entrypoints checked for existing local script/style resources: **no broken resource links**.
- SHA-256 / byte compare shows unchanged: `PC-EmbeddedAssets.js`, both FDD images, `PC-Core.js`, `IDE.COM`.
- Browser scenario file `optional/pc/tests/test_encyclopedia_browser_phase4o.py` supplied; **NOT PASSED in this execution environment**. Chromium blocks navigation to both `file://` and local HTTP with `ERR_BLOCKED_BY_ADMINISTRATOR`. This is a browser management policy, not proof that the page or F2 event handler fails or succeeds.
- `npm run test:release` extended to include the new browser gate; **full release gate NOT certified** here. Do not claim exit 0 for the full gate.

## Open / future completion

- Run browser scenarios on a normal desktop across Chrome, Firefox and Edge, including pure `file://`, F2/ESC/focus, keyboard forwarding, fullscreen, search, charts, code copy and responsive navigation.
- Add actual **guest-assembled and guest-executed** DMA1/IRQ5 SB2 .COM, TSR/IRQ real-mode demo and protected-mode demonstrator before changing their status from reference-only to tested. Additional Z80 ASM program verification and full independent oracle for examples also pending.
- Packaging is personal as original ROMs remain; a separate complete public license/ROM audit is needed before distribution.
- The existing full source examples use GNU as syntax (and ship their actual original compiled binaries in the existing boot media). **Do not pretend Small-C ASM.EXE on B: can assemble those .s files**.

## Offline architecture

Static relative `<script src>` and `<link>` only. No mandatory `fetch`, imports, WebAssembly, bundler, build step, external data, or persistent storage. Keyboard shortcut deliberately ignores editable **host** form fields, but listens in the guest screen. Code samples shown through the Markdown renderer remain passive; source export only on user click.
