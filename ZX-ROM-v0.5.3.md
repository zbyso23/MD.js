# MD.js ZX Ultra v0.5.3 — locally installed user ROM

## Ground truth

- Provided image: `seBasic321.rom`, 16,384 bytes; SHA-256 `7038f98c22105a03d8416f213fab0b53a248405bbb7e351366f0a7158cae4815`.
- Reset entry bytes `F3 AF C3 A7 03`; reset jumps to `$03A7` (a plausible executable ROM). This does **not** prove emulator compatibility or BASIC readiness.
- Installed unchanged into `zx/roms/zx48.rom` for local use only and recorded SHA-256 in `zx/roms/local-rom.json`.
- The exact user-supplied ROM is not silently replaced with Debian OpenSE ROM. Names SE BASIC and OpenSE BASIC must not be treated as equivalent binary images without comparison.
- The MinZX core's JS files were **not** available in this sandbox due to network/DNS restrictions, so the actual Z80 boot, the keyboard, ROM loading routines and TAP loading on this ROM are **UNVERIFIED**.
- MinZX source remains separately required by `zx/fetch-assets.py` (MIT core). No emulator vendor files are fabricated or replaced with a fake CPU.

## Run locally

```bash
# A 16KiB ROM is already installed in the PERSONAL bundle.
python3 zx/rom_tools.py --check
# Or install a different user ROM safely:
python3 zx/rom_tools.py --install /path/to/your.rom

# After obtaining the upstream MinZX JS files once:
python3 zx/fetch-assets.py   # fetch MinZX only if local ROM exists
npm run test:zx:real         # hard FAIL if real core absent or boot/bus checks fail
./zx/run-local.sh
```

`npm run test:zx:real` now compares the full 16KiB ROM in emulated memory with the local ROM and requires real CPU, a non-flat display, and a successful assembled RAM write. It does **not** yet prove that entering a BASIC command or TAP loading works. These are separately pending acceptance criteria.

## Distribution

The personal testing bundle contains the **same binary that the user supplied**; it is for that user's own testing. Git ignores `zx/roms/*.rom` and the local manifest. The clean source bundle intentionally omits ROM binaries. Before any public ROM redistribution the actual license and provenance of that exact image must be confirmed independently.
