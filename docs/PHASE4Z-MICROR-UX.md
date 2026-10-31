# Phase 4Z — Micro R entry point

- Homepage: Micro R Statistics Lab is a visible primary laboratory tile.
- Removed the unrelated example-document link from the hero.
- Added example chooser: summary, regression, distribution, and vector operations.
- Micro R is an R-like subset, not the R interpreter. `lm(y,x)` is intentionally non-R-compatible.
- KaTeX renders math, Micro R evaluates expressions. No implicit code execution from Markdown.
- CSV input, data frames, formula syntax `lm(y ~ x)`, richer plots are not implemented.
