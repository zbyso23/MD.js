# Supplied DOSBox-X reference sources

These 13 unmodified files were supplied by the user from DOSBox-X. Each retains the upstream copyright and **GPL-2.0-or-later** notice. They are **reference source snapshots, not linked into the running JS application**, and cannot be compiled alone: DOSBox-X has many other dependencies. The user later identified DOSBox-X revision `029bd65c5dcc7cdc7f2e14e35278620d9707d969` for the supplied materials. Upstream byte verification has not been performed. SHA-256 hashes are in `UPSTREAM-MANIFEST.json`.

Active, explicitly adapted ideas in `../../PC-BIOS.js`: the PC BIOS Data Area constants and boot-reported memory (`bios.h` / `bios.cpp`), callback-vector/IRET organization (`callback.cpp` / `callback.h`), and bounded BIOS keyboard ring buffer (`bios_keyboard.cpp`). See its file header. Our code is not a line-for-line translation of the full source.

`bios_disk.cpp`, `bios_int13.cpp`, `bios_memdisk.cpp`, and `bios_vhd.cpp` are **not enabled**: FDD boot is Phase 2 and IDE is Phase 4. No real DOSBox C++ BIOS handlers are currently compiled or executing.

For publication, carry the full GPL-3.0 license text for combined project, upstream licensing/provenance notices, and source as required. Verify the supplied DOSBox-X revision against the upstream Git tree, third-party obligations and original project licensing separately before public release.
