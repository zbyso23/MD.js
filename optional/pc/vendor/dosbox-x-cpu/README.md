# DOSBox-X CPU reference — exact origin

Upstream: https://github.com/joncampbell123/dosbox-x  
Revision supplied by user: `029bd65c5dcc7cdc7f2e14e35278620d9707d969`  
License: GPL-2.0-or-later (read upstream headers and COPYING.GPL-2.0).

Only the 8086/286 normal/prefetch cores and shared CPU references needed for analysis were copied from the user-uploaded archive; the 386/full/dynamic cores were **not** imported into this package. The code is preserved verbatim and SHA-256 checksummed. No original C++ CPU code is compiled or linked into the active browser runtime.

The *active* CPU implementation is the GPLv3 JavaScript `../../PC-Core.js`, now adapted with 16-bit ModR/M addressing, memory-operand ops, REP string execution, and more 286 0F01 operations using DOSBox-X's 8086/286 behavior as reference. This is **not** equivalent to a full 8086 or 286 DOSBox-X port; numerous opcodes, privilege rules, physical chipset details and accurate cycles remain pending. Do not claim the original cores are running.

The SHA-256 source manifest records the user-provided Git commit as the intended upstream revision, but matching each file against the remote Git tree is not independently proven yet. Further adaptation must preserve per-file copyrights and notices; the project's GPLv3 license does not erase upstream GPL-2.0-or-later notices.

**Runtime rule:** source-only, browser-native JavaScript forever; no conversion of this C++ to WebAssembly or compiled binaries is planned or permitted.
