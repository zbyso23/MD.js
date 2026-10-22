# MD.js Reborn — Phase 4.5: DocUX Mini / Interactive Docs

**Status:** proposal, not implemented. **Goal:** disproportionately useful reader features at a small implementation, maintenance and security cost, without npm/CDN/imports. **Phase 5** retains micro-IDE, assembler, bounded VM, and possible ZX emulator.

## The main idea

Keep `MD.js` as the pure, auditable Markdown-to-HTML parser. Use **opt-in enhancements** that receive already-rendered, safe DOM and build controls with `document.createElement`, `textContent`, `addEventListener`. Do not parse executable code in Markdown, accept raw SVG markup, use `innerHTML` with user strings, or execute embedded snippets. A document without add-ons must still be readable.

| Priority | Feature | Dev cost (relative) | Reader value | Implementation approach |
|---|---|---:|---|---|
| P0 | **CodeCraft Mini:** Copy, collapsible code, line numbers, Diff viewer | Very low–low | Huge | DOM controls around existing `<pre><code>`; safe clipboard on click with fallback |
| P0 | **Print/Export Reader:** print stylesheet, print-friendly diagram sizing | Very low | High | `@media print`, no unsafe HTML-to-PDF dependency |
| P1 | **ChartCraft Mini:** bar, line, sparkline, horizontal bar + pie | Medium | Very high | Strict tiny grammar → bounded data model → static SVG via `createElementNS` |
| P1 | **Smart Table:** sort, text filter, CSV export | Medium | Very high | DOM-only enhancement on existing safe tables; maintain column and row caps |
| P1 | **Document search:** keyboard-first search, next/previous occurrence | Medium | High | TreeWalker over visible text nodes; wrap only safe text content; no regex from users |
| P2 | **Tabbed examples:** JS/Python/Rust variants in one slot | Low–medium | High | `tabs` block parsed to bounded IR, native buttons + panels, ARIA tabs semantics |
| P2 | **Expandable details / FAQ** | Low | Medium-high | Native `<details><summary>` with safe title/contents |
| P2 | **Slide / presentation view:** `---` sections, navigation | Medium | Very high demo factor | Pure DOM/CSS view mode; print view stays canonical document |
| P3 | **Gantt-lite:** compact project timeline | Medium | High in technical planning | Reuse chart primitives + safe linear time geometry; no project management engine |

### Recommended **F4.5 MVP**

1. CodeCraft Mini — buttons `Copy`, `Show line numbers`, `Collapse`; diff highlighting for fenced `diff` blocks.
2. ChartCraft Mini — `bar`, `line`, `sparkline`, `pie` behind one parser. Everything stays inert SVG. Later add CSV import *only as a user interaction*, not auto-fetch.
3. Smart Table — sort ascending/descending, local-only filter, CSV export on deliberate click.
4. Print mode — remove toolbars, expand crucial text, scale diagrams, stable typographic colors.

Save document search, tabbed code and presentation mode for the second wave. Those are valuable, but their UI/interactions need more browser testing than a text formatter.

## ChartCraft Mini language (proposed, not supported yet)

````md
```md-chart
bar
TITLE: Tests by category
UNIT: tests
Syntax: 49
Safety: 41
UX: 27
```
````

Rules: exactly one chart type from an allowlist; max 64 points and 6 series for simple charts; numeric values finite, chart range bounded; labels <=100 Unicode characters; line/source max 8 KiB; no arbitrary SVG, CSS, expressions, HTML, links, URLs, colors from input, `eval`, or script execution. Fail closed to safely escaped source text.

The chart parser is NOT a generic Mermaid parser. ChartCraft shares only SVG helpers (shape/text/geometry) with our limited Mermaid renderer where the behavior is already audited.

## Strict architecture / security boundaries

- `MD.js` parses; optional `MD-docux.js` enhances reader UX; optional `MD-charts.js` owns chart DSL and SVG.
- Enhancements are bounded and idempotent across repeated `md.mount()` calls.
- Access original code via DOM `textContent`, never by interpolating raw Markdown into HTML.
- No automatic JS execution or data network access. **An embedded code block is always documentation, never a runnable command.**
- No arbitrary CSS selectors/URLs from markdown, no DOM event-attribute HTML injection, no `foreignObject`, no untrusted SVG strings.
- Keyboard support, focus management, screen reader labels, reduced-motion and high contrast are acceptance criteria.
- All interactive actions are explicit and local; user content stays offline by default.

## Budget proposal (engineering targets, *not measurements*)

- CodeCraft Mini: <=3 KiB gzipped JavaScript.
- ChartCraft Mini: <=10 KiB gzipped JavaScript.
- Smart Table: <=4 KiB gzipped JavaScript.
- Print CSS: <=2 KiB gzipped CSS.
- Integration objective: <=20 KiB extra gzipped assets for P0/P1 combined, not a guarantee.

Test each optional component separately and in combination with the light/dark reader, diagram controls, print CSS, and hostile text corpus. Reject additions that enlarge the trust surface without a corresponding real use case.

## High-leverage applications

- AICH Hospital report: diagnosis, code diffs, tested repairs, pass/fail charts, reproducible evidence, discharge summary.
- STASH design report: storage layout, parity comparisons, performance plots, compatibility matrix.
- MA Organization verified report: decisions, evidence, minority objections, issue timeline.
- Future ZX/ASM micro-IDE (F5): the markdown already has code controls and a document layout; execution lives in isolated, opt-in VM code.
