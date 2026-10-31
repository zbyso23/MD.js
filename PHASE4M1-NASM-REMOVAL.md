# Phase 4M.1 — NASM removed

- Removed historical DOS `NASM.EXE` and `nsm09839.zip` from project and bundled B:.
- Removed its NASM-specific `HELLO.ASM` sample; `HELLO.ASM` is produced by `CC HELLO` in writable work copy.
- Rebuilt 720-KiB FAT12 `x86DEV-720K-XT286.img` and identical offline `PC-EmbeddedAssets.js` Base64 payload.
- Retained Small-C, Small-Assembler, YLink, CLIB, STDIO, editor and DEBUG.
- Default B: remains automatically inserted RO for XT and AT/286, with opt-in RW working copy.
- No new hardware, CPU instructions, dependencies or runtime build introduced.
- Retained mininasm *sources* only, not an executable.

Testing: see release logs and `optional/pc/tests/devdisk-bootstrap.test.cjs` plus browser test `test_dev_toolchain_browser_phase4m.py`.
