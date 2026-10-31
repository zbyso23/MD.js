**UPDATE v0.5.4:** The six real MinZX vendor sources ARE NOW BUNDLED (MIT) and the user-provided ROM passed strict real Chromium CPU/BASIC/TAP/SNA E2E. See `../ZX-MILESTONE-v0.5.4.md` for verified results and limitations. Legacy remarks below describe earlier milestones.

**v0.5.3:** The supplied ROM is installed locally and its SHA-256 is verified. See [`ZX-ROM-v0.5.3.md`](../ZX-ROM-v0.5.3.md). The personal test bundle includes the uploaded ROM; a clean source release must not contain it until distribution rights for that exact image are confirmed. Real MinZX boot is still blocked by missing vendor JS files.

# ZX Ultra (optional, `feature/zx-ultra`)

**Vanilla ES6 / no runtime imports / no npm dependencies.** The core and a 16KiB ZX ROM are prepared locally; MinZX files are downloaded once by the Python bootstrap, then served offline. Only the ZX adapter loads in ZX pages. No changes to MD.js core are needed.

```bash
python3 zx/fetch-assets.py       # requires Internet once; Debian OpenSE ROM + MIT MinZX
npm run test:all                # Node + Chromium fake-CPU E2E, test-only Playwright
npm run test:zx:real            # hard fail unless real CPU and ROM boot pass
./zx/run-local.sh               # http://localhost:8000/zx-ultra.html
```

- `zx-ultra.html`: ZX screen embedded, fullscreen Workbench with ASM Lite editor, registers, memory, TAP/SNA/ROM/SCR loading.
- `zx-screen-demo.html`: **ROM-independent real `.SCR` renderer demo**.
- `zx-in-markdown.html`: ZX widget inside actual MD.js document. No autostart.
- `zx/ZX-ASM.js`: two-pass tiny teaching assembler. Supports `ORG`, `DB`, `DW`, labels, `NOP`, `HALT`, `RET`, `DI`, `EI`, `SCF`, `XOR A`, `INC A`, `DEC A`, `LD rr,nn`, `LD r,n`, `LD (nn),A`, `LD A,(nn)`, `LD (HL),n`, `LD (HL),A`, `LD A,(HL)`, `JR` (also NZ/Z/NC/C), `JP`, `CALL`, immediate `ADD A,n`, `SUB n`, `CP n`, `OUT (n),A`, `IN A,(n)`. Not compatible with all Z80 ASM syntax.
- `zx/ZX-Screen.js`: 6912B `.SCR` 256×192 pixel decoder and preview, BRIGHT/FLASH, 2×/4×/Fit, export SCR/PNG; standalone use:

```html
<script src="zx/ZX-Screen.js"></script>
<script>
  ZXScreenPreview.mount(document.getElementById('preview'), scrBytes, {name:'SCREEN.SCR'});
</script>
```

- `zx/vendor_patch.py` leaves original upstream files unchanged and generates `MinZX-mdzx.js` for lifecycle, readiness and per-machine ROM.
- ROM load timeout/404 now reports ERROR instead of hanging. The UI can retry after failures; a 15-second watchdog stops stalled boots.
- The ROM is a Debian packaged OpenSE BASIC release under a free software license (see `zx/LICENSES.md`). User-loaded TAP/SNA/ROMs are not subjected to copyright policing, only format/length checks.

See [`ZX-MILESTONE-v0.5.2.md`](../ZX-MILESTONE-v0.5.2.md) for test truth and limitations. No claimed CPU boot success without `npm run test:zx:real` passing on an online system.
