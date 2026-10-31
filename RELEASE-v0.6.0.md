# MD.js Ultra 0.6.0 — integration and bugfix

## Delivered
- Single folder/ZIP with common launcher `index.html`.
- ZX 48K emulator and Blocks Lite/Arduino Playground kept fully optional.
- Charts Mini in separate 0-dependency file `MD-Charts.js`.
- Bar (vertical), bar-horizontal, line, pie; chart and axis titles, bounded data, theme-aware SVG, source/zoom/save.
- GFM table delimiter fix: `|:--|--:|` now renders as a sortable/filterable HTML table, not Markdown source.
- Existing Markdown/ZX/Blocks files retained from their validated bases; no change to ZX CPU code or execution model.
- Node + browser regression focused on actual DOM rendering and table sorting/filtering.

## Intentionally not implemented
- Multi-series charts, stacked/grouped bars, negative-valued charts, dates/continuous axes.
- Blockly drop-to-build GUI as full Google Blockly replacement.
- Atari/C64/Apple II/PC emulator code.
- JS-Torch, Gantt, 3D, CAD/CNC.

## Validation boundaries
- Browser UI E2E is run in headless Chromium with document HTML and JS injected from local files because file:// and localhost navigation are restricted in the verification environment. Real DOM, SVG and click events; no mocked chart or table implementation. Test uses the actual renderer and DocUX code.
- ZX compatibility certification is not implied by this integration; it retains its original verified BASIC/TAP scope.
