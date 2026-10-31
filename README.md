# MD.js Lite — Offline Markdown & EDU Workbench

Lightweight standalone HTML/JavaScript platform for **reading, editing, explaining and experimenting**. No build, no frameworks, no server requirement: open `index.html` using `file://`.

## Start

- Open `index.html` to browse the modules.
- Open `examples/index.html` to edit Markdown, preview formulas, and try examples.
- Open `examples/reader.html` for document reading, search, projector and print.
- Open `optional/math/edu.html` for live MiniChem education.
- Open `optional/micror/index.html` for numerical computing and Micro R statistics.

## Capabilities

- Markdown renderer: GFM-oriented subset, tables, code fences, dark/light Reader, DocUX, print.
- Original MD.js syntax-highlighting palette: commands (purple), controls/numerals (amber), strings/symbols (green), comments (muted), attribute names (blue) and values (green). Built-in lexers for JS, Python, HTML, CSS, INI, JSON, Bash, PHP. Unsupported languages are shown safely, but not highlighted.
- Offline SVG diagrams and charts; interactive Encyclopedia (CS/EN), syntax examples.
- Offline KaTeX for mathematical notation and MiniChem Basic → Plus III for chemical formulas, charges and reaction arrows.
- Micro R Statistics Lab and numerical M0/M1/M2 (arrays, matrix computations, FFT, DSP, basic ODE routines).

## Explicit exclusions

**PC/XT/AT, ZX Spectrum emulation and Arduino/Blocks labs are not included** in Lite. Their development history remains in MD.js Ultra.

## Development / tests

Requires Node.js only for testing, not for using the platform:

```sh
npm test
npm run test:highlight
npm run test:lite
```

Syntax test samples and expected HTML token classes: `test/lite-highlighting.test.js`. A complete visual browser/print/a11y test is **not** claimed.

## Licensing and redistribution

Project-authored code uses GPL-3.0-only as declared in root `LICENSE`. See `LICENSING.md` and `THIRD-PARTY-NOTICES.md` for component-specific terms; KaTeX is MIT. Historical reference files and other retained third-party assets may have separate rights; this is a preliminary inventory, not a clearance for public redistribution.

## Math fidelity

Standalone `$$...$$` blocks bypass Markdown inline escaping so LaTeX matrix row separators (`\\`), `aligned`, and `cases` survive unchanged. Inline formulas are handled by the math plugin.

## Syntax highlighting

Language-specific colors and labels follow the original MD.js palette for JavaScript, Python, HTML, CSS, INI and PHP. Code-tabs and diff blocks retain DocUX controls. Highlighted code is text only and never executed.
