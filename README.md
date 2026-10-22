# MD.js Reborn — modernized 2016 parser

**Standalone vanilla ES6. Zero runtime imports. Zero npm dependencies.**

Based on the three user-provided files: `MD(1).js`, `MD.css`, `U(1).js`. Unmodified originals are retained in `legacy/`. This is a rewrite, not a claim of 100% CommonMark conformance.

## Run in a browser

```html
<link rel="stylesheet" href="MD.css">
<div id="article" class="md-root"></div>
<script src="MD.js"></script>
<script>
  const md = new MD({ mode: 'extended' });
  document.querySelector('#article').innerHTML = md.parse('###### Hello, ES6!');
</script>
```

Or simply open **`examples/index.html`**, a split-pane live editor. No web server required in an ordinary local browser environment.

Run in Node (no dependencies; `require` is only a Node host integration, not a package dependency):

```js
const MD = require('./MD.js');
const html = new MD({ mode: 'extended' }).parse('**Hello!**');
```

## Compatibility and improvements

| Feature | Legacy MD.js (2016) | MD.js Reborn |
|---|---|---|
| `new MD({mode:'extended'}).parse(text)` | Yes | Yes |
| `U.js` global dependency | Yes | No |
| ATX headings | H1–H4 | H1–H6 |
| Setext headings | No | H1/H2 |
| Standard numbered list `1. item` | No | Yes |
| Standard unordered list `- item` | Custom ordered semantics | Yes |
| Nested lists and blockquotes | Limited/none | Common patterns |
| Tables | GFM-like and compact | GFM-like and compact in extended mode |
| Fenced code | Yes | Yes (` ``` ` and `~~~`) |
| Syntax highlighters | HTML-fragment transformers | Escaped token-based lexers |
| Raw HTML | Unsafe / passed into HTML fragments | Escaped as text |
| Links / images | No reliable URL validation | Protocol allowlist and attribute escaping |
| Reuse one parser instance | Persistent format indexes | Stateless per parse call |
| Mermaid fenced code | Code text | Code text (diagram engine in phase 2) |

**Deliberate syntax change:** `- item` now creates `<ul>` as standard Markdown requires; `1. item` creates `<ol>`. Existing documents using the old `-` = numbered-list dialect will render differently. Basic vs extended controls compact legacy tables and available highlighting languages, not HTML safety.

## Security model

Markdown input is **not** filtered by deleting suspicious characters. Instead, the renderer:

1. **Escapes all untrusted text** at the HTML emission boundary (`& < > " '`).
2. Uses **a closed set of output tags** (`p`, `h1`–`h6`, `a`, `img`, `pre`, `code`, `span`, `em`, `strong`, `del`, `ul`, `ol`, `li`, `blockquote`, `hr`, `br`, `table`, `thead`, `tbody`, `tr`, `th`, `td`).
3. Uses static HTML attribute names and CSS classes. URL destinations are restricted to `http:`, `https:`, `mailto:` (links) and `http:`, `https:` (images), plus relative URLs. Protocol-relative URLs, controls and backslashes are rejected.
4. Prevents extension callbacks from returning HTML: they return plain text and predefined token types which are escaped on rendering. An invalid/throwing extension falls back to plain escaped code.
5. Caps input size (4 MiB default, configurable up to 16 MiB), line size (65,536 chars), nesting and highlighter work.
6. Displays ` ```mermaid ` as escaped source until the isolated diagram engine is implemented.

**Limits:** This is a defense-in-depth design, **not** a formal proof of XSS safety or a drop-in HTML sanitizer. It does not run arbitrary raw HTML. Custom CSS, browser vulnerabilities, embedded network image requests, link privacy, and denial-of-service beyond configured limits remain outside these tests. When allowing untrusted content in production, deploy a strict Content Security Policy, consider a vetted HTML sanitizer at the final HTML sink, and perform cross-browser tests/security review. This code is not CommonMark-conformance-certified.

## Safe extension API

Legacy highlighters once returned HTML, which is unsafe for third-party/untrusted plugins. The **new** contract is intentionally incompatible:

```js
const md = new MD({ mode: 'extended' });
md.registerCodeHighlight('mydsl', (source, language) => [
  { text: source, type: 'command' } // text will be HTML-escaped
]);
```

Allowed types: `command`, `controls`, `symbol`, `comment`, `attribute-name`, `attribute-value`. The callback must not mutate DOM or use `innerHTML`; it is treated as trusted JS code executing with application privileges. The tokens it emits cannot inject raw HTML via the renderer.

## Tests and performance

```bash
node --test test/md.test.js
node test/performance.js
```

No `npm install` is required. `npm test` and `npm run bench` are convenient shortcuts using empty dependency lists.

Tests cover 76 cases (including individual adversarial vectors and a deterministic 350-input corpus). A browser DOM smoke page is supplied at `examples/security-smoke.html`, **but was not executable in the current sandbox because headless Chromium timed out**. Open it locally to check your own browser; it is supplementary, not a formal security audit.

One local benchmark on Node 22.16.0 (best of five parse calls; warm parser; Markdown headings/paragraphs/links; times vary by host/load):

| Input | Elapsed (ms) | Throughput (MiB/s) |
|---:|---:|---:|
| 4 KiB | 0.86 | 4.53 |
| 16 KiB | 2.49 | 6.28 |
| 64 KiB | 5.18 | 12.06 |
| 256 KiB | 22.41 | 11.15 |

This is **not** a like-for-like comparison with the 2016 version; those versions have different behavior and work per input. For defensible historical benchmarks, compare the same feature subset and document how the syntax/highlighting differs.

## Phase 2: strictly bounded Mermaid-style diagrams

See [`MERMAID-PHASE-2.md`](MERMAID-PHASE-2.md). Diagram code is deliberately **not executed** in the current parser. The future path is a tiny, allowlisted diagram grammar + internal graph representation + **safe native SVG elements**, not importing Mermaid or interpreting its entire language.

## Licensing note

The supplied historical JS file header references GPLv3, while previous project metadata discussed an MIT license. This package does not guess how that conflict should be resolved. **Confirm and explicitly set the new distribution license before public release.** The original files and their copyright headers are preserved under `legacy/`.
