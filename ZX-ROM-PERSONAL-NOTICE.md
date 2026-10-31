# User-supplied ZX Spectrum ROM — personal distribution only

- Supplied by user: `seBasic321.rom` (SE Basic 3.2.1, 16,384 bytes).
- SHA-256 `7038f98c22105a03d8416f213fab0b53a248405bbb7e351366f0a7158cae4815`.
- Installed as `zx/roms/zx48.rom` and, in this PERSONAL archive, Base64-embedded into `zx/ZX-ROM-embedded.js` for seamless use when local `fetch` is blocked (e.g. file://).
- Loading precedence: user-selected ROM override, normal fetch for local file, then embedded personal fallback.
- The ROM is not automatically GPL by being included here. The project makes **no claim that third-party ROM redistribution is authorized**. Do not publish the personal ZIP or ROM script publicly without verifying permission.
- The clean-source ZIP intentionally excludes both ROM files; the UI still accepts a user-selected ROM using File API/Base64.
- MD.js Ultra snapshot JSON never includes ROM bytes; it identifies required ROM on import.
