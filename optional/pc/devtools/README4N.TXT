MD.JS ULTRA 4N - DEVELOPER B: XT / AT286
======================================
B: is read-only by default. Use Workbench -> B: work copy RW
BEFORE editing or compiling; export B: IMG to keep your work.

B:IDE B:HELLO.C       fullscreen 16-bit editor, max 16 KiB
F1 help; arrows navigate; Enter/Del/Backspace edit;
F3 or Ctrl-S saves; ESC / F10 exits.
B:EDIT B:HELLO.C      legacy line-oriented editor (unchanged)

B:                      switch to developer drive
BUILD HELLO             compile HELLO.C to HELLO.EXE
HELLO                   run the result; on XT or 286
DEBUG HELLO.EXE         DOS debugger

C toolchain: CC -> ASM -> YLINK with CLIB.LIB.
BUILD stops on errors; original B: never modified.
No NASM binaries or 386 instructions. Assembler ASM.EXE
is the Small-C assembler, not a NASM replacement.

F2 encyclopedia is planned for Phase 4O and NOT included.
