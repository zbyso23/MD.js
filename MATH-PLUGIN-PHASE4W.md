# Math plugin / Matematický plugin – Phase 4W

Offline KaTeX 0.16.27 build (from locally installed Gradio assets), with WOFF2 fonts; license in `optional/math/vendor/KATEX-LICENSE.txt`. Uploaded `KaTeX-main.zip` contains **0.19.1 source**, not a compiled browser dist; the bundled renderer is explicitly version **0.16.27**, not the same version as that source.

Automatically enabled when Encyclopedia is loaded, via `optional/math/math.js`; disable with `window.MDMathPlugin.config.enabled=false` before rendering another article. Renders `$...$`, `$$...$$`, `\(...\)` and `\[...\]` in article text nodes; skips code/pre blocks. Untrusted HTML commands disabled (`trust:false`).

**Rendering only**: no evaluation, symbolic math, or R interpreter. See next discussion for scope. JavaScript and CSS packaged locally, no CDN, no runtime build. This installation extends Encyclopedia rather than changing generic Markdown APIs.

## CS
Příklad inline: `$E=mc^2$`. Blok: `$$f=\frac{1}{T}$$`. Při výuce matematiky používej LaTeX delimitery mimo bloky zdrojového kódu.

## EN
Inline example: `$E=mc^2$`. Display: `$$f=\frac{1}{T}$$`. Place delimiters outside source code blocks.
