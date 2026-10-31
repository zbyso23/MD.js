# DOSBox-X sound, VGA and port hardware reference files (reference-only)

This directory contains **actual user-supplied C++ source files** for the MD.js Ultra research and native JavaScript adaptations, including PC Speaker, DSP/Sound Blaster 2.0, OPL2, DMA, parallel port and seven VGA source files. The C++ files are **not compiled or executed** in the browser. Check `UPSTREAM-MANIFEST.json` for SHA-256 and per-file copyright/license notes.

The user did not supply verifiable Git object/revision metadata; therefore **upstream commit identity is unverified**, even when a target commit appears in a planning document. Some original source files, particularly `8255.cpp`, lack conclusive individual license headers. Preserve this uncertainty for any eventual public redistribution. Full source redistribution requires an independent compatibility/provenance review.

**Phase 4A:** the VGA device is a bounded original editable JavaScript implementation (`optional/pc/PC-VGA.js`) designed with these references. It supports guest A000 VRAM, modes 12h/13h, selected VGA DAC/sequencer/graphics-controller registers and snapshots, not VGA cycle accuracy.

**Not present:** the ATA/IDE `ide.cpp` and matching integration sources; Phase 4B AT IDE is not implemented. The VGA source references do not imply an IDE implementation.
