# MD.js Ultra v0.8.1 — UX Stabilization

Date: 2026-10-23  
Runtime architecture: original browser HTML/CSS and uncompiled JavaScript only (no WASM, no bundler, no external Blockly).

## PC Workbench — destructive demos eliminated

- The **running FreeDOS machine remains untouched** when selecting ALU/SHIFT, BCD, ModR/M, IRQ/PIC, protected mode, #DE/#BR, PIT and test ROM buttons.
- Each diagnostic creates its **own PCMachine** instance, executes the test on it and reports PASS/FAIL in the trace.
- Video test buttons (**INT 10h text, CGA, Hercules**) draw to a **separate diagnostic Canvas**, preserving the actual DOS screen.
- "Obnovit obraz" was renamed to **"Překreslit VRAM"**, reflecting its actual redraw-only behavior.
- Explicit **Reset**, **change PC profile**, and **change video adapter** continue to reset the live PC, as deliberate user actions.
- Chromium browser gate confirms that 13 diagnostic controls preserve live CPU registers, memory, VRAM, floppy bytes and instruction counter.

## ZX Spectrum 48K — keyboard and virtual keyboard

- `Backspace` / `Delete` → CAPS SHIFT + `0`, real ZX DELETE.
- Cursor keys → CAPS SHIFT + `5`, `6`, `7`, `8`.
- `Shift` = CAPS SHIFT; `Control` = SYMBOL SHIFT.
- 40-key interactive on-screen keyboard, with keyboard keyword labels and additional quick DELETE/cursor/BREAK controls. Both physical and virtual keys use the real emulated ZX ULA keyboard matrix. Supports Pointer Events.
- Modern browser shortcut capture is **best-effort only while the ZX canvas has focus**; F5, Ctrl+R and Ctrl+W cannot be guaranteed because browsers/OS may reserve them.
- This personal build ships the user's **OpenSE BASIC 3.2.1**, *not* the stock Sinclair 48K ROM. OpenSE BASIC intentionally replaced Sinclair's one-key K keyword mode with a text tokenizer.
- Therefore a **user-toggleable compatibility shortcut** is enabled for an empty BASIC input line: `J` → `LOAD `; `P` → `PRINT `; `R` → `RUN`; `K` → `LIST`; `G` → `GO TO `. Each key in the word is delivered through the real guest ZX keyboard matrix over time; the BASIC RAM is never forged. Disable the shortcut to type those letters at the start of a line. This is a convenience emulation, not a claim that OpenSE has native Sinclair keyword-mode semantics.
- Real Z80 + user supplied ROM browser tests confirmed `J` inserts the typed command and Backspace deletes it. Virtual `J` and quick DELETE also passed.

## Blocks Lite — original native drag-and-drop

- **NO Google Blockly dependency, embedding, source bundle, CDN or transpiler**.
- Original drag-and-drop editor implemented with Pointer Events: toolbox, drag handles, highlighted insertion slots, nested insertion, mouse/touch pointer handling, continuous workspace auto-scroll, zoom, undo/redo, duplication.
- Editor still uses the exact existing `MDBlocks` program model and code generators for JavaScript, Python and Arduino C++ and the original Arduino simulation and JSON import/export.
- Browser tests inserted toolbox blocks, inserted into a nested body, verified block counts, undo/redo, zoom and ZX key matrix.
- This is a lean **Blockly-like interaction**, not feature parity with Google's full editor. No claim of complete accessibility or Blockly workspace import compatibility.

## Validation

- Core tests: **192 Markdown/runtime + 49 Blocks Lite + 31 ZX + 239 PC = 511 PASS**.
- Chromium: existing XT/AT FreeDOS boot, XT DEBUG, video/FDD, browser state export/import, original Markdown/ZX integration passed in individual steps.
- New browser tests for isolated PC diagnostic state, native drag/drop and physical/virtual ZX keyboard passed.
- A single monolithic release-script run completed all previous browser gates and the new Blocks/browser test but exceeded the runner timeout before completing the **final repeated** ZX/browser checks; those final checks passed separately. Do not misrepresent that single composite run as a completed green gate.

## Known constraints

- XT/AT CPU/fault/hardware compatibility remains partial, as in v0.8.0.
- `DEBUG.COM` on 286 remains affected by an unsupported later-CPU instruction in its detection path; XT DEBUG is tested.
- Keyboard input capture cannot override every browser/system shortcut.
- `file://` execution is intended and all runtime code is classic scripts, but direct browser `file://` navigation was blocked by the test environment; actual standalone opaque-origin tests passed.
- The user's ZX ROM, FreeDOS disk and DEBUG binary are provided for this **personal release**; do not re-distribute without checking those binary assets' licenses.
