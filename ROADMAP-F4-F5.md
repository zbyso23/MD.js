# MD.js Reborn — phases 4 and 5 (approved direction, not implemented)

## F4 — Extended Markdown, maximum usefulness at minimal cost

**Question:** How much useful contemporary Markdown can MD.js support while staying zero-dependency, small, auditable and fast? Is comprehensive CommonMark / GFM conformance worth the added code and parsing complexity?

### Proposed scoring criteria

For each feature: **actual demand / compatibility gain / code + test cost / security surface / runtime cost / maintenance cost.** Do not add features solely to inflate a support badge.

| Candidate | Preliminary engineering value | Notes |
|---|---|---|
| GFM task lists (`- [x]`) | High | Text-only disabled checkboxes by default, no editing side effects |
| Better nested lists / tight & loose paragraphs | High | Fix grammar, don't stack brittle regexes |
| GFM autolinks, strikethrough edge cases | High–medium | Strict URL validator and canonical output |
| Escapes / entities / code span parity | High | Tests against CommonMark 0.31.x examples |
| Footnotes / reference links | Medium | Per-document symbol table, bounded references, unique IDs |
| Tables with escaped pipes + alignment | High | Upgrade existing parser, no new runtime dependency |
| TOC anchors / safe fragments | Medium | Avoid untrusted `id` collisions and injection |
| Definition lists / admonitions | Medium–low | Choose one dialect and document it |
| Math / LaTeX | Low initially | Full mathematical typesetting is a separate engine; don't pretend otherwise |
| HTML in Markdown | Avoid by default | Safe rendering would need a mature HTML sanitizer / trust mode boundary |
| Mermaid advanced syntax | Selectively | Extend allowlist only where explicit parsing/rendering is maintainable |

### Proposed measurement plan

1. Freeze v0.3 baseline and golden HTML output.
2. Run official CommonMark spec and a curated GitHub Flavored Markdown suite, with **measured passing rate by feature**, not only aggregate pass%.
3. Track bundle weight (raw + gzip), parser throughput, DOM render time, memory, and malicious-input corpus.
4. Prototype one item at a time on a feature branch; record incremental lines, tests and slowdown.
5. Decide between **MD.js compact edition** (default) and **MD.js extended edition** (more features without separate dependencies). Do not compromise the security baseline.

**Stop condition:** when a feature adds more compatibility burden, security risk and maintenance cost than observable usability value; call it unsupported, not partially compatible.

## F5 — Ultra edition: micro-IDE + VM + ASM + optional full ZX emulator

**Vision:** An *optional*, offline-first playground embedded in technical Markdown documents. A Markdown file can include an ASM snippet that the reader may edit, assemble, execute in a bounded virtual machine, inspect registers/memory and see output. Potential later ZX Spectrum 48K emulator view with display/keyboard and code/debugger workflow.

### Isolation: do NOT put a virtual machine inside the Markdown parser

The parser remains safe-by-default and produces text / SVG. VM execution is a **separate, opt-in user action**. A fenced block must **never auto-execute** just because the Markdown is rendered.

Proposed components, still zero import/CDN:

- `MD-IDE.js` — editor UI: tabs, cursor, line numbers, errors and disassembly/hex view, export source. Work with keyboard, touch and screen reader.
- `MD-ASM.js` — strict tokenizer + two-pass assembler, initially a selected Z80 instruction set; explicit diagnostics, labels, directives (`ORG`, `DB`, `DW`, `EQU`) and symbol table.
- `MD-VM.js` — deterministic execution step loop, cycle budgets, memory bounds, registers/flags, pausing and reset; snapshot tests with golden vectors. No `eval`, no `new Function`, no interpreted JavaScript.
- `MD-ZX.js` (later) — 48K memory map, Z80 timing/cycles, screen attributes, keyboard matrix, beeper/tape/interrupt model and ROM licensing review. An *actual full emulator* is significantly more than an instruction interpreter.

### Architecture and safety contract

- Untrusted Markdown code always displayed as **escaped inert text** until a human explicitly clicks Run.
- Worker isolation if available, with bounded step/cycle budget, stop control and timeout; synchronous fallback only for a few finite single-step operations and never an unbounded loop on the UI thread.
- Default **no network, filesystem, clipboard, host JS, dynamic import, or device access**. Virtual hardware state is an in-memory array.
- CPU and assembler test vectors independent of UX; checkpoint and rewind only after deterministic step core is proven.
- Format-compatible snapshot import/export only after validating dimensions, address ranges and memory sizes.
- Keep downloadable distribution small: **Core + Diagrams + Reader** remains independent of Ultra.

### Proposed milestones

**F5.0:** single-step Z80 subset with register display and assembler diagnostics. **F5.1:** labels, bytes, disassembly, memory viewer, breakpoints and stepping. **F5.2:** 48K memory/display prototype. **F5.3:** timing-correct compatibility work, video/keyboard/interrupts, ROM concerns, golden game/test ROM suite. **F5.4:** optional extended peripherals and sound.

### Hard acceptance criteria

- A thousand randomized instruction/assembler fixtures do not cause out-of-bounds writes.
- No automatic code execution from Markdown; no host JS bridge.
- Pause/stop always effective within a strict execution budget.
- A documented CPU instruction coverage table and real compatibility tests; **do not label a partial CPU demo a complete ZX emulator**.
- Keyboard-only control and touch-first usability from the first micro-IDE build.


## 22 October 2026 — Phase 4.5 implementation update

F4.5 DocUX delivered: bounded code-tabs, code toolbar/line numbers/diff, details/FAQ, bounded typo-tolerant search, smart table sort/filter, local gallery/lightbox, fullscreen, print mode and SVG export. See `PHASE-4.5-REPORT.md`. SVG mini-charts and Gantt-lite remain TODO, excluded by user decision. F5 stays a separately activated micro-IDE/VM/ASM/emulator effort, not part of Markdown parsing.
