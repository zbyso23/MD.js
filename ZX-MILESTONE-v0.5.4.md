# ZX Ultra 0.5.4 — Real CPU Milestone (22 Oct 2026)

**REAL Chromium E2E: 3/3 PASS.** These tests loaded uploaded original MIT MinZX/Z80 JavaScript and the user-supplied 16 KiB SE BASIC ROM, with no mocks and no HTTP navigation. Browser loaded the source as classic scripts and ROM through a byte-array injection into the existing explicit ROM override path.

- ROM SHA256 `7038f98c22105a03d8416f213fab0b53a248405bbb7e351366f0a7158cae4815`; exact ROM mapping verified.
- Real BASIC keyboard input `PRINT 2` executed; screen showed `2` and `OK, 0:1`.
- Real TAP: `HELLO.TAP` mounted, `LOAD ""` typed, two real ROM loader entry calls (`$0556`) detected, BASIC payload present in RAM and output displayed.
- Real ASM: assembled instructions, executed by original Z80 interpreter, write to screen RAM `$4000` verified.
- Real SNA: 49179 bytes exported and reimported, screen RAM conserved.
- Browser page-error count 0 in these tests.

### Tests

- `npm run test:zx:unit`: 31 PASS including genuine Z80.js instruction tests.
- `npm run test:zx:real`: 3 strict offline E2E PASS.
- `npm run test:zx:browser`: existing mock-based UI suite, separate from CPU correctness.
- `npm test`: original MD.js suite.

### Limitations

- TAP loader is a **ROM trap**, not pulse emulation. Handles only standard `LD_BYTES` at `$0556` in compatible ROMs, not turbo/protection loaders.
- Unknown CPU corner cases, AY (not 48K), sound accuracy, TZX/Z80 snapshot, ROM variations, browser audio permissions remain out of scope.
- `seBasic321.rom` was provided by the user. Its redistribution license has **not** been verified; public/clean-source archive excludes it even though local personal test package includes it.
- Historical documentation from v0.5.2/v0.5.3 contains previously blocked status; this milestone supersedes those claims.
- Atari/C64/Apple II/DOS: roadmap only.
