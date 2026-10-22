# MD.js Reborn v0.4.5 — Arctic Edition

**F1–F4.5: modern, dependency-free Markdown + strict Mermaid-like SVG + smart, accessible reader.**

- Vanilla JavaScript (`<script src>`), no runtime imports, npm dependencies, CDN, fonts, eval, Function, iframe or network access required for the JS engine.
- Markdown images may reference external HTTPS resources, as explicitly authored by the document; for a fully offline demo, all images here are local SVGs.
- Existing `new MD({mode:'extended'}).parse(markdown)` still works without a browser or DocUX.
- Opt-in interactivity: `md.mount(article, markdown)` loads browser enhancements **only when the optional scripts have been included**.
- The parser intentionally does not promise full CommonMark/GFM/Mermaid compatibility. Unknown diagram DSL falls back to escaped source code.

## Start

```bash
unzip mdjs-reborn-v0.4.5.zip
cd mdjs-reborn-v0.4.5
node --test test/*.test.js   # no npm install
node test/performance.js
xdg-open examples/index.html
```

Or open `examples/reader.html` for the standalone Reader. Open `examples/docux-smoke.html` for a **manual browser integration smoke test** which should show `PASS: F4.5 integration` if it succeeds. Its successful execution has **not** been verified in this environment because Chromium did not complete startup.

### Embedding

```html
<link rel="stylesheet" href="MD.css">
<article class="md-root" id="article"></article>
<script src="MD.js"></script>
<script src="MD-diagrams.js"></script>
<script src="MD-docux.js"></script>
<script src="MD-UX.js"></script>
<script>
  const md = new MD({mode:'extended'});
  md.mount(document.getElementById('article'), '# Hello!');
</script>
```

**Load order:** core Markdown, optional diagram SVG engine, optional DocUX, optional Reader. All scripts are classic scripts, not ES modules. Nothing is fetched by the engine. Unmount/re-render via `md.mount()` resets transient interactions and retains theme/zoom/width prefs on the container.

## Phase 4.5: active features

| Feature | Details |
|---|---|
| Code Tabs | Bounded `code-tabs` fenced DSL, 2–12 languages, buttons and arrow/Home/End keyboard navigation |
| Copy, line numbers, collapse | Code toolbars, clipboard API + fallback, togglable 1–2000 line gutter, collapse |
| Diff | Escaped fenced `diff` blocks, line-by-line `+/-/@@` background highlights |
| Collapsible FAQ | `:::details Question` and `:::faq Question`, safe nested Markdown, bounded body |
| Typo-tolerant document search | Case/diacritic insensitive, up to one edit for 3–5 chars or two edits for 6+; Damerau edit distance includes adjacent swaps; precise short queries; no HTML substitution |
| Sortable/filterable tables | Stable numeric/text sorting, third click restores initial order, local filter, no arbitrary selectors or fetched data |
| Image gallery | Standard Markdown images, opt-in click to open modal, arrow navigation, Escape, local-only controls |
| Fullscreen | Native Fullscreen API with CSS fallback, Escape; full reader instead of only editor |
| Print | Native browser print / Print-to-PDF with scoped print stylesheet; details expanded temporarily, all tabs printed |
| Save SVG | Download stand-alone SVG diagram with current theme colors inlined and background attached |

**Explicit TODO:** ChartCraft mini-graphs and Gantt-lite are **not part of this release**. They remain deferred. Full F5 micro-IDE / VM / Z80 emulator is a separate optional project.

### Tabs grammar

The whole code-tab block must be in one fenced `code-tabs` block, with an explicit language marker for each tab. Text is always literal code; there are no nested fences, no code execution, no imports.

````md
~~~code-tabs
::: javascript | JavaScript
const md = new MD();
console.log(md.parse('# Hello'));
::: python | Python
print('Hello')
::: rust | Rust
fn main() { println!("Hello"); }
~~~
````

Invalid tab blocks fall back to escaped code. `language | User label` labels are textContent-only.

### Details/FAQ grammar

````md
:::details How is Markdown made safe?
**Input** stays plain text and links get a protocol allowlist.

- Markdown is parsed into escaped HTML.
- Executable code is never run.
:::
````

Bounded to 120 source lines and 16 KiB of body. Directives must be top-level and cannot nest recursively. An unmatched directive is rendered as escaped ordinary text. Details/FAQ requires `mode:'extended'`.

### Live search methodology

The document is indexed *once after rendering* (max 2,500 text blocks, 400 KiB index text); search is debounced by 110 ms. The user query is capped at 100 characters and six tokens. Matched text is not rewritten or injected into markup; the Reader highlights the whole matching DOM block, scrolls to it and opens any enclosing `<details>`.

Ranking: exact substring has priority, otherwise per-token bounded Damerau–Levenshtein for 3+ character tokens, with max 1 edit for lengths 3–5 and max 2 for 6+. A 1–2 character token requires an exact word/substring match to avoid thousands of irrelevant results. The result list is limited to 30 items. Search is scoped to visible article text elements, not code blocks or the embedded Mermaid source. It will not catch every possible linguistic error (e.g. arbitrary long-distance transpositions or phonetic variations).

### Smart tables

GFM tables and original compact tables are enhanced automatically. A table over 3,000 rows or 32 columns stays read-only for responsiveness. Numerical cells (including decimal commas and percent signs) sort numerically; other cells use a locale-aware collation. Filtering ignores case and diacritics. Search and sort happen entirely in DOM. There is no CSV export in this scope (not requested for this wave).

### SVG download

SVG is exported by cloning the **renderer-created** SVG, inlining a strict allowlist of computed presentation CSS properties, and adding a solid background. All labels are already DOM text nodes. The download is triggered only by a deliberate click. No foreignObject, embedded HTML, scripts or external resources are generated.

## Security and release status

- HTML input is escaped. URL destinations go through `safeURL`; `javascript:` and `data:` are rejected, as are unsafe scheme/entity tricks.
- Diagram parser has strict limits and unknown directives fall back to escaped source; DOM is created only with SVG DOM primitives.
- No Markdown source, code-tab value, gallery caption or search text is inserted through `innerHTML`.
- Native browser print, clipboard, fullscreen and downloads run **only on user action**.
- Script extensions are **trusted code** (not sandboxes). Rendering arbitrary third-party Markdown is not a substitute for a CSP, separate-origin isolation or security audit.
- Tests: **170/170 Node tests** passed here (161 previous plus 9 focused F4.5 checks), but the browser integration test is **not certified**. Run the included browser smoke on Chromium/Firefox and complete a CSP/fuzz/accessibility audit before production.
- Licensing: The uploaded original sources have a GPLv3 header and MIT repo-license discrepancy. Resolve with the original author before specifying a published derivative license; none is invented here.

See `ROADMAP-F4-F5.md` for broader roadmap, and `PHASE-4.5-REPORT.md` for implementation notes and acceptance criteria.
