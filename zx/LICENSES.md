# Third-party components and rights

**MinZX** by David Crespo Tascón — MIT. **Z80 interpreter** by Molly Howell — MIT. The original uploaded upstream JS files are in `zx/vendor/`, with copyright notices preserved; `zx/vendor/LICENSE` contains the MIT permission text. `MinZX-mdzx.js` is a derived copy created by our deterministic integration patch and carries original upstream notices.

**SE BASIC 3.2.1 ROM** (`seBasic321.rom`) is user supplied. Its exact sha256 is `7038f98c22105a03d8416f213fab0b53a248405bbb7e351366f0a7158cae4815`. **Distribution rights for this exact binary have not been established**. The personal-use package contains it at `zx/roms/zx48.rom`, but the clean-source Git release must exclude it, including from Git history.

This ROM must **not** be assumed to be identical to Debian OpenSE BASIC merely because of similar names. For other ROMs, user supplies their own 16KiB image. No copyright checks are performed on user-selected media; technical validation only.
