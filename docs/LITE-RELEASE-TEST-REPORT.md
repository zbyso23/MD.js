# MD.js Lite — release test report

Base: MD.js Ultra v5.4.6a PERSONAL ZIP. This is a separate Lite snapshot, not a modification of original Ultra.

## Tested

- Core Node suite: **198/198 PASS** (including new highlighting regressions).
- Highlighting regression suite: **11/11 PASS**: JS, Python, HTML, CSS, INI, Bash, JSON, PHP, distinct CSS colors, escaping, unknown language.
- ZX core: **31/31 PASS**.
- `MD.js` passes `node --check`.
- HTML homepage has balanced div tags.
- `optional/pc`, `optional/blockly`, `optional/arduino` are absent.
- Headline documentation, licensing map and notices updated for included code.
- No additional dependency or build step introduced.

## Limitations

- Token and palette checks are objective automated tests; **full visual browser testing** of themes, high contrast, print and responsive mobile layout was NOT performed.
- No claim of complete legal clearance for personal ZX ROM or other historical media.
- Math renderer is still KaTeX. Original v5.4.6a Markdown `\\` issue is not declared fixed in this Lite packaging pass.
- Some retained historical reference/example text still mentions PC or Arduino as history, but no such labs are installed.
- Link scan: 0 unresolved relative HTML references, mostly legacy/examples or runtime assets (inspect before public release).


