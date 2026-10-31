# MD.js Ultra — Phase 4X: Reference + Micro R Statistics Lab

## Overview

Offline, no-build evolution of Phase 4W. KaTeX remains enabled by default for mathematical typesetting in F2 Encyclopedia. Micro R is a separate, self-contained optional module available at `optional/micror/index.html` and linked from its Encyclopedia article. It does **not** run automatically when Markdown or LaTeX is rendered.

## Documentation / Dokumentace

- F2 Encyclopedia: 137 chapters, CS and EN article bodies. The 34 previously Czech-only chapters now have newly written English explanations; these English versions are sometimes condensed rather than literal full-length translations.
- Instruction reference: table of 8086 instructions, operand forms, FLAGS effects (not a complete opcode encyclopedia; processor timing / opcode encoding not exhaustively enumerated).
- Interrupt map: CPU traps, BIOS, DOS, selected hardware IRQ, and common register selectors.
- Demo sources: `reference/demos/beam-wait.asm`, `flags-demo.asm`, `opl-piano.asm`.
- Micro R interpreter: `optional/micror/micro-r.js`, UI: `optional/micror/index.html`.
- Original TXT source books remain in the historical archive for provenance, but are no longer offered as inline download links from the F2 encyclopedia.

## Micro R syntax

One statement per line. Supported: `x <- expression`, decimal and scientific literals, vector constructor `c()`, `+ - * / ^`, parentheses, unary signs, named variables, `sum`, `mean`, `median`, `min`, `max`, `length`, `var` (sample), `sd` (sample), `quantile` (linear interpolation), `seq`, `rep`, `sqrt`, `abs`, `log`, `exp`, `round`, `summary`, `lm(y,x)` (ordinary least squares), `hist`, `plot`. No arbitrary R syntax, string data, files, packages, loops, factors or data frames yet. No JS eval and no network calls. Vectors max 10,000 in seq/rep; program max 10,000 characters and 100 expressions.

```r
x <- c(3,5,7,9,11)
y <- c(2,4,8,8,13)
summary(x)
lm(y,x)
hist(x)
plot(x,y)
```

## Hardware demo notes / Poznámky k demům

- Vertical retrace demo polls 3DAh bit 3; it can hang on unsupported adapters and assumes VGA-compatible status register behavior. It uses VGA mode 13h and overwrites the screen.
- FLAGS test captures flags after signed overflow, to be inspected in a debugger.
- AdLib piano uses keyboard letters ASDFGHJ/ZXCVBN mapped to OPL2 channel 0 pitches. The code writes OPL registers via 388h/389h and is intended for DOS hardware/emulation supporting AdLib. It is monophonic and not a full tracker.
- Hardware demos have **not** been compiled by NASM or run end-to-end in a DOS guest in this environment. Treat them as unverified source examples, not guaranteed working binaries.

## Security / Bezpečnost

All formulas are rendered, not executed. Micro R parses a restricted expression grammar, no JS `eval`, calls only allowlisted functions. Hardware I/O examples are for controlled emulator setups; running bare-metal programs may alter video state or block on unavailable hardware.

## Verification

Run `node --test optional/micror/micro-r.test.cjs optional/pc/tests/encyclopedia-phase4x.test.cjs`. Existing regression suites also remain. `node --check MD-Encyclopedia.js`, `node --check MD-Encyclopedia-Data.js`.
