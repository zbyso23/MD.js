# Arduino Graph — Phase 4R

## Implemented
- Offline `optional/blockly/index.html` supports `Blocks / Graph` toggle.
- Click-to-connect execution wiring and variable data wiring with fan-out; automatic layout and draggable placements; detached branches retained in `program.loose`.
- No new runtime: all AST edits checked by `MDBlocks.validate` and `MDBlocksArduinoGraph.model.check` before one shared undo commit.
- Existing output generators (JavaScript, Python, Arduino C++) and board simulation stay canonical.
- Optional per-node trace from the real interpreter drives highlighted steps; old trace untouched by default.
- JSON import/export preserves optional `loose` and `pos` visual metadata; invalid detached nodes rejected.

## Boundaries
- Control graph is acyclic and structured (no arbitrary flow loops; use `repeat`).
- Variable-based graph connections, not a generic expression evaluator.
- Click two ports to connect; no drag-to-wire gesture in this milestone.
- Hardware is still simplified Arduino Toy Lab, not an AVR/electrical simulator.
- Direct `file://` requires local-machine acceptance because this sandbox may block it.

## Commands
`npm run test:blocks`
`npm run test:arduino:graph`
`npm run test:release`

## Verification
- `npm run test:blocks`: PASS (54 old blocks tests, 8 new graph unit tests, interactive Graph Chromium test).
- Original Arduino browser tests: PASS (Playground, DnD, education playback).
- `npm run test:release` exit code: 0
- Real Chromium tested via inlined local script fixture; direct file:// navigation is blocked by the administrator policy in this execution environment.
- Preserved 11 ROM/media files byte-for-byte against Phase 4Q.
- Captured `optional/blockly/arduino-graph-CHROMIUM-PROOF.png`.
