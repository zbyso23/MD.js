# MD.js Ultra — Phase 4S hotfix + SYSMan-inspired reference

## Changes
- Arduino C++ `repeat` emits `for (int ...)` rather than JavaScript `for (let ...)` (including nested loops). JavaScript and Python generators unchanged.
- Graph test asserts nested Arduino loops have proper C++ declarations and JS/Python retain their original syntax.
- F2 Encyclopedia: eight **newly authored** reference articles for x86 instructions, DOS INT 21h, BIOS INT 10h and INT 16h, real-mode memory, PC I/O ports, and Arduino Graph.
- F2 search: normalized exact substring matching remains primary; single-edit typo tolerance for title/category words (queries of >=4 characters).
- Offline/no-fetch/no npm runtime dependencies preserved. This is a SYSMan-inspired organization of independently authored reference material, NOT a reproduction of SYSMan.

## Verification performed
- 54 Blocks tests PASS.
- 11 Graph unit tests PASS (including nested export and optional g++ compile).
- Existing Encyclopedia Node tests PASS.
- Chromium Graph browser test PASS.
- Targeted nested-loop Arduino C++ export parsed by g++ -std=c++11 -fsyntax-only with stubbed Arduino API PASS.
- JavaScript syntax checks for MD-Encyclopedia.js and MD-Encyclopedia-Data.js PASS.

## Remaining boundaries
- Real Arduino toolchain (arduino-cli and AVR core) not installed; no full board compile or hardware testing claimed.
- This milestone did not implement arbitrary dataflow, typed wires, or drag-to-wire; Graph remains structured and variable-based.
- SYSMan-sized encyclopedia is a larger editorial project; these eight technical entries are a starter reference, not a comprehensive hardware manual.
