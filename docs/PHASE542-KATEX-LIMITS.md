# Phase 5.4.2 — KaTeX capability audit / audit možností

Offline KaTeX version: **0.16.27**. Rendering tests use `renderToString` with `throwOnError:true`, `trust:false`, `maxExpand:1000`, `maxSize:10`.

- PASS: fractions, roots, limits, integrals, summations, Greek letters, matrices, `aligned`, `cases`, vectors, Fourier equations.
- REJECT as expected: undefined commands, malformed braces, `\ce` without mhchem extension.
- Markdown Showcase: all 10 extracted expressions render strictly.
- KaTeX returns both MathML and visual HTML; the MathML layer is hidden visually with CSS clipping while retaining its accessible content.
- Long inputs: a 25,000-character formula rendered in about 200 ms in Node; a 1,500-nested-brace formula was accepted. **These are not safe production limits**, and no browser stress/denial-of-service guarantee is claimed.
- `\href` with `trust:false` does not indicate permission to execute the target URL; host navigation/security should still be verified separately.
- Caveats: Chromium `file://` visual smoke test is not included in this audit; verify browser zoom, screen readers, Reader, Projector and Print.
- Run `node optional/math/test-katex-limits.cjs`; full baseline `npm test`.
