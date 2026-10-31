# MD.js ZX Ultra test run — current sandbox

Source: prior `feature/zx-ultra` package, with testing updates on same local branch.

| Test group | Result | Grounding |
|---|---:|---|
| MD.js regressions | **170 passed** | `npm test` |
| New+old ZX Node tests | **18 passed / 3 skipped** | `npm run test:zx:unit` |
| Browser mock E2E | **9 passed** | `npm run test:zx:browser` with Chromium/Playwright `page.set_content` |
| Independent TAP oracle | **186 test vectors**, part of 18 unit tests | Python 3 script invoked from Node |
| Actual vendor Z80 CPU tests | **3 skipped** | `zx/vendor/Z80.js` not present |
| Real OpenSE boot/render E2E | **BLOCKED** | `zx/vendor` and `zx/roms` missing; hard-fail exit code 2 |
| SkoolKit independent emulation | **BLOCKED** | `skoolkit` not installed; hard-fail exit code 2 |

**Why no green check for real emulation?** The sandbox does not permit external DNS. The previous bootstrapping package does not contain MinZX or OpenSE ROM. The successful browser E2E run uses a *fake* CPU implementation deliberately; it verifies only browser integration, not Z80 instructions or ROM boot.

**Actual bug identified and fixed:** Node `Buffer` memory aliasing in `readTAP`: parsed blocks could be mutated via the caller's input. It now explicitly copies the bytes; a regression test reproduces the issue.

**Important:** Real E2E smoke currently tests startup and that the displayed canvas contains multiple colors. It **does not** yet test typing `LOAD ""`, completing the BASIC program, timing/audio accuracy or SNA roundtrip with the vendor CPU. `zx/tests/TEST-PLAN.md` lists remaining acceptance gates.
