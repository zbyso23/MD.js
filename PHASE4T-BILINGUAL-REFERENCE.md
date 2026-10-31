# MD.js Ultra — Phase 4T: bilingual historical reference

## Delivered
- 88 encyclopedia articles total: 34 legacy + 54 new reference entries.
- New reference entries have Czech and English authored descriptions, titles and examples.
- Offline CS/EN toggle and bilingual cross-language search (even in English view).
- Seven complete user-provided manuals retained as converted UTF-8 text under `reference/historical/`. Original authorship notices retained.
- Covers 8086/8088 CPU registers, flags, segment/offset, 25 instruction cards, BIOS / DOS services, PC memory and BDA, port map, PIC/PIT, and video modes.
- Each new technical card has its historical source indicated and explicitly warns that it does not prove emulator support.
- Existing architecture, local file links and no-build runtime preserved.
- Source-code download filenames now carry YYYYMMDDHHMMSS suffix.

## Verification
- Node JavaScript syntax: PASS.
- Original encyclopedia Node tests: 4/4 PASS.
- New bilingual/source Node tests: 3/3 PASS.
- Existing inline Chromium F2 tests: PASS across tested entrypoints.

## Important scope boundary
- Original 34 legacy teaching articles are *not* fully translated. The English view clearly marks their original Czech body. All 54 new entries are bilingual at the authored reference level.
- Historical documents are incorporated as complete readable UTF-8 source files, not automatically translated; original source language is Czech.
- Historical materials contain obsolete information and occasional errors; the reference is educational, and exact historical claims need independent checking.
- Tests did not establish that all documented CPU/BIOS/DOS/hardware behavior is implemented in the emulator.
