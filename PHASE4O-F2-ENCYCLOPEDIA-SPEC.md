# Phase 4O — F2 Encyclopedia / interactive handbook (original scope + Phase 4O-A delivery)

Status: **Phase 4O-A implemented (navigation + curated content)**; remaining advanced example validations below are still planned. 2026-10-29.

Delivered in this slice: two named sections (Markdown, Assembler); per-section categories; local text search; persistent visible icon; F2 overlay; Esc/focus handling; 26 locally embedded lessons including four full, existing tested ASM programs. **No guest code is auto-executed.**

Not yet certified here: real browser event/focus flows under local security policy (Chromium blocks both file:// and localhost in this executor); exact cross-browser `file://` certification; guest compilation and end-to-end verification of newly authored DMA/TSR/286 protected-mode examples (they are labeled reference-only). Browser gate script is supplied and must pass in an unrestricted browser before declaring 4O fully closed.

## Entry point and delivery

- F2 in the workbench opens a keyboard-accessible encyclopedia overlay/workspace; Escape returns focus to the exact previous display. Ensure it does not swallow keys while editing text in an ordinary host input, and preserve the existing drawer/back behavior.
- The encyclopedia must be entirely local, **`file://`**, no fetch dependency, imports, transpilation, bundlers or WASM. It uses our already available extended MD.js Markdown runtime + DocUX features, rather than introducing another rich-text stack.
- Dual navigation by *platform* (MD.js Ultra Markdown, ZX/Z80, PC XT/8086, AT/286 + x87, peripherals) and by *learning level* (first program, hardware reference, large projects). Index/search, TOC, forward/back, copyable code, runnable artifacts/examples when a compatible guest is active. Do not accidentally auto-run uploaded code.
- Distinguish tested guest-executable source from readable pseudocode and unsupported hardware documentation. Provide instructions and expected output, guest model/profile, video setting, build commands, and test vectors for each full lesson.

## A. MD.js Ultra extended Markdown handbook

- The actual Markdown and DocUX runtime semantics with worked samples: headings, links, code tabs and copy, Mermaid, Charts Mini, data tables and sorting/filtering, typo-tolerant search, details/FAQ, diff highlighting, gallery/lightbox, print and SVG export. Document limitations and browser-dependent permissions in `file://` mode.
- Real snippets rendering via the current native Markdown/DocUX stack, no separate Markdown parser.

## B. ZX / Z80 assembly handbook

- Registers and alternate register set, IX/IY, flags, memory maps, stack, `CALL/RET`, interrupts, timing, basic ZX display layout and keyboard input.
- Annotated complete examples, preferably assembly sources with verified instruction outputs, basic screen drawing, animated pattern, keyboard and sound where the installed ZX workbench actually supports it. Keep ROM and licensing notices explicit; no unowned ROM in public distribution.

## C. x86 / x87 core handbook — primary section

Each major lesson must have a full, extensively **commented, buildable source program** (not merely code fragments), a memory/port map, what each register does, how to step through it in DEBUG, and a verification script or screen/VRAM oracle. Include:

1. **XT + Hercules fractal** — complete 8086-safe fixed-point Mandelbrot; explain 16-bit integer scaling, overflow, register allocation, `MUL`, iterations, monochrome HGC VRAM banking, optimization vs historical XT runtime. Reuse and annotate our already functioning `HGCFRAC.COM` algorithm, and optionally a companion CGA version. The code cannot silently contain 186+/286 opcodes.
2. **AT/286 + VGA13 fractal with 80287XL** — complete annotated source for the existing Mandelbrot guest, explanation of x87 register stack, load/store, compare/branch, `FNSTSW`, precision modes; VGA mode 13h VRAM 320×200. Clearly label that our x87 coverage and extended80 are experimental and not a full historical 80287 implementation.
3. **DOS file services** — create/open/read/write/seek/close via INT 21h with error handling, file attributes, buffered copying and 8.3 names. Show safe operation on an explicitly writable work-copy B:.
4. **BIOS disk services and controller-level storage** — INT 13h CHS examples for diskette/IDE and separate FDC/ATA port overview with DMA boundaries, statuses and error cases. Reading examples may target built-in media; writing must target a scratch image only. Do not claim an unimplemented 286 BIOS service exists.
5. **OPL2 / AdLib** — register-level 0x388/0x389 examples, instruments, frequency blocks, note timing and cleanup; reference/test against our existing guest `TUNE.COM` and supported OPL2 subset.
6. **PC Speaker and programmable timer** — PIT 8253/8254 counter/channel 2, port 0x61, timer IRQ0 timing and BIOS tick coherence, restoration on exit.
7. **Custom interrupts** — install/query/restore an INT vector with DOS-safe critical sections; discuss saving registers/flags and chaining the original handler.
8. **TSR (terminate and stay resident)** — complete memory paragraph calculation, resident vs transient region, INT 21h AH=31h, safe install/uninstall strategy, reentrancy/`InDOS` constraints, valid exit behavior. Avoid presenting unsafe hook patterns as production safe.
9. **Sound Blaster 2.0 — 8-bit PCM through DMA** — annotated assembly to configure base 0x220 DSP, DMA channel 1, IRQ5, play a short raw sample, handle acknowledgement/EOI and avoid crossing a 64 KiB DMA boundary. Ground ports/commands in supported emulator implementation and explicitly note the guest driver is only implemented if tested on both 286/XT profiles where the hardware is exposed.
10. **80286 protected mode / VM concepts** — GDT, segment selectors and access rights, IDT and transitions, privilege/exception cases, and a small demonstrator only for the *actually supported* protected-mode subset. 286 DOES NOT have 386 paging or virtual-8086 (VM86) mode; explain the distinction instead of faking it. Stay within our fixed 1 MiB RAM cap and historical instruction sets.

## Verification and acceptance (Phase 4O gate)

- F2 open/close in real browser and focus restoration; no collision with ordinary typed keys; no server/network dependency.
- All examples have complete source, distinct platform/profile labels, build instructions and citations for factual reference material and third-party code origins.
- Guest examples that claim to work must actually assemble/link/execute on the correct target and have screenshot/VRAM, memory dump or output assertions; source-only examples must be labelled as such.
- The two major fraktál lessons (XT HGC and AT VGA/x87) get instruction-by-instruction commentary, memory maps, named test vectors, and repeatable screen checks.
- Audio, interrupts, TSR and protected examples must include warnings and explicit cleanup/restore. Unsupported capabilities are documented separately; **no new hardware beyond the frozen PC profile**.
