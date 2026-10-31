# KaTeX stylesheet regression repair (v5.4.6a)

## Root cause
The shipped `optional/math/vendor/katex.min.css` included 378 rules prefixed with `.gradio-container-6-5-1` (a host-specific namespace). The editor uses no such container, so essential KaTeX layout rules did not match. Consequences observed by the user include broken matrix alignment, tiny/flattened formulas and extremely wide reaction arrows. This was a CSS bundling mistake; the math parser was not the primary cause.

## Repair
Removed host-specific selector prefix from the vendored CSS and kept the original KaTeX font-face declarations. Added `optional/math/test-katex-css.cjs` to prevent regression. Restored original personal `.git` directory from v5.4.5; no other v5.4.5 runtime files had been removed by the v5.4.6 release.

## Verification
- `npm test`: 197 / 197 pass.
- `node --test optional/math/test-katex-css.cjs optional/math/test-katex-limits.cjs`: both suites pass.
- Chromium full-page visual screenshot attempt timed out in this environment. Visual comparison in the user's browser is still required.
