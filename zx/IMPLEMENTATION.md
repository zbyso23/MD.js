# ZX Ultra 0.1 – engineering notes

## Delivered
- Optional module, source-only zero-dependency bootstrap, UI and safe file loader.
- Emulation implementation target: MinZX (MIT) Z80/ULA/beeper/SNA and OpenSE BASIC 48K (GPL-2+ / CC BY-SA 3.0); exact source links and licences in `LICENSES.md`.
- Only screen inline; fullscreen expands to CPU inspector, 128 B RAM display, load/save controls, run/pause/step/reset.
- `.tap` parser with checksum and bounded sizes, experimental 0556 ROM fast-loading of standard tapes.
- Included self-authored tiny BASIC HELLO.TAP (header, two PRINT lines, autostart 10).
- User ROM `.rom` 16KiB selection before boot.

## NOT delivered / not claimed
- Vendor sources and ROM physically downloaded in this sandbox (outbound DNS blocked).
- Verified browser boot (needs successful setup on networked environment).
- TAP real-time pulse emulation or turbo loaders, TZX, Z80/SZX snapshots.
- Full Z80 assembler, breakpoints, disassembler or a full IDE (ASM Lite is implemented).
- Verified real-ROM sound pause, and multi-emulator concurrent lifecycle management (still unverified with vendor core).

## Risks / next checks
- Verify MinZX init with Debian OpenSE 3.2.1 (entrypoint compatibility may vary).
- Verify exact behaviour of OpenSE tape LD_BYTES fast trap (original 48K ROM uses 0x0556; OpenSE may modify semantics).
- Snapshot loading and saving real files.
- Roundtrip demo TAP through actual ZX ROM, physical PC keyboard compatibility.
- AudioContext user gesture restrictions; watchdog for malformed snapshot/game.
- Browser CSP and bounded CPU frame time after UI hangs.
- Upstream vendoring currently follows MinZX/master and should be pinned to an audited commit/hash before release.
