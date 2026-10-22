# Phase 4.5 — completion and evidence

Date: 22 October 2026. Based directly on v0.4 from the prior turn, not a rewritten unrelated demo.

## Delivery checklist

- [x] Python/JavaScript/Rust Code Tabs (bounded `code-tabs` grammar)
- [x] Copy code (permission-aware), per-line numbering and collapse
- [x] Diff: `+`, `-`, and `@@` highlighting
- [x] Collapsible FAQ/details (`:::details`, `:::faq`)
- [x] Debounced typo-tolerant search: 1/2 edits for longer tokens, ins/del/substitute/adjacent transpose
- [x] Interactive tables: sortable columns and live filter
- [x] Gallery + keyboard lightbox (standard Markdown images)
- [x] Fullscreen + fallback
- [x] Print + browser Print-to-PDF stylesheet, temporarily open details
- [x] Export portable SVG with computed static colors + canvas
- [ ] Mini SVG charts: TODO, explicitly deferred
- [ ] Gantt-lite: TODO, explicitly deferred

## Architecture

- `MD.js`: Markdown + bounded details directive + safe recognition of code-tabs fences; keeps standalone `parse()`.
- `MD-diagrams.js`: unchanged trusted limited Mermaid-like DOM/SVG renderer.
- `MD-docux.js`: optional, no imports; tabs, code controls, smart tables, gallery, SVG export and bounded fuzzy search helpers.
- `MD-UX.js`: optional Reader; light/dark, type scale, width, outline, fullscreen, print and search.
- `MD.css`: theme-aware interactive styles and print CSS.
- `examples/index.html`: live editor / preview incl. DocUX preset.
- `examples/reader.html`: standalone document Reader.
- `examples/docux-smoke.html`: browser-only smoke test, passes only once actually executed successfully.
- `test/docux.test.js`: pure Node tests of parser additions, fuzzy edit distance, safety and sorting.

## Known limitations / risks

1. The browser smoke test was authored but **not run to completion** in this runtime: the provided Chromium installation consistently timed out on launch. Node tests do not replace real DOM/browser integration checks.
2. Save SVG relies on browser `getComputedStyle`, `XMLSerializer`, Blob and object URLs. Confirm export in Chrome/Firefox/Safari across light/dark themes, especially complex diagrams.
3. Fuzzy search is intentionally *word-level and bounded*; there is no full-text index, semantic retrieval, DOM text wrapping, or regular expression search. It searches content blocks, excluding fenced code source, with a maximum of 30 results.
4. Live Markdown editor rerenders the document on each edit; transient tab/filter/search/gallery state resets. Theme, scale and reader width persist on the container between mounts.
5. Custom syntax `~~~code-tabs` and `:::details` is not CommonMark/GFM portable. In a standard Markdown viewer these blocks show as text.
6. Some external image URLs can make browser requests; this is inherent to normal Markdown image behavior. The demo uses local images.
7. `mode:'extended'` is needed for FAQ/details and some advanced Markdown. Syntax-highlighting tokens remain an intentionally small subset.
8. Mermaid support is a strict subset, **not** the real Mermaid interpreter. The supported families are flowchart, sequence, state, pie, class and timeline.
9. Production safety needs CSP, browser fuzzing, keyboard/screen-reader checks, and review of embedding origins and policies.

## Validation

- `node --check` over scripts: PASS.
- `node --test test/*.test.js`: **170 passed, zero failed**.
- Browser integration: **UNVERIFIED** (not counted as a pass).
- Runtime dependencies: **zero** (only built-in Node test runner during tests).

## F5 boundary

F5 would be an explicitly activated micro-IDE, assembler and emulator runtime. **No code in this release is executable because a Markdown document says so.** Its VM must have a sandbox and deterministically bounded time/memory/I/O; keep it an optional, isolated implementation.
