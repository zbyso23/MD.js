# Phase 4Y — Reference, Arduino & Micro R

## Scope
- Responsive Mermaid: initial width is 100% of the diagram viewport and height scales with SVG viewBox. Manual zoom remains available.
- Added 12 bilingual encyclopedia entries, including 8086 instructions, FLAGS, five interrupt catalogs, interrupt usage examples, Arduino and Micro R.
- INT 21h: 96 service entries extracted from provided historical DOS2 reference. This is a *historical index*, not an exhaustive listing of all newer DOS extensions.
- INT 08h is a hardware IRQ0 handler, *not* an AH-selected BIOS API. INT 1Ch is a separate callback; INT 1Ah provides the timer query API.
- Added four introductory NASM-syntax .COM examples under reference/demos/phase4y-*.asm.
- Added examples/from-hardware-to-statistics.md and a link from the home page.

## Validation
- node --test test/phase4y-regression.test.js test/diagrams.test.js optional/pc/tests/encyclopedia-phase4x.test.cjs: 49/49 passed.
- npm test: 197/197 passed (includes phase4y tests).
- npm run test:phase4x: 7/7 passed.
- No interactive cross-browser layout proof; visual result still needs to be checked in desktop and mobile browsers.
- ASM examples are source examples, not confirmed compiled or executed in the DOS guest.

## Boundaries
- Some historic DOS descriptions have version-dependent behavior. Avoid writing to real disk devices. INT 13h writes and formatting should be attempted only with disposable disk images.
- The Arduino lab is an educational simulator, not an accurate real-board electrical model.
- Micro R intentionally supports only a small R-like numerical language.
