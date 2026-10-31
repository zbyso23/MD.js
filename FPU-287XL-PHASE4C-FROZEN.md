# MD.js Ultra — Phase 4C: Intel 80287XL Educational Lab (FROZEN design target)

**Status:** agreed target, NOT implemented or passed. Follows 4B AT IDE and VGA 4A. No source-code emulation claimed.

## Hardware profile
- **Only AT/80286**, CPU instruction set stays 286, no 386, MMX, SSE, 486+, OPL3, expanded system RAM or compiled/WASM code.
- FPU **Intel 80287XL** (internally 387-derived, but 287/286 interface), with a **common selectable emulated CPU/FPU clock (12 or 16 MHz)**: `fpuHz === cpuHz`. This describes our configured clock, not cycle-accurate historical motherboard timing.
- Remains optional. No-FPU behavior must continue to preserve all previous DOS/DEBUG compatibility. XT must not silently gain FPU.
- Represent **ST(0)..ST(7)** as a ring stack; TOP, tags, status/condition flags, control masks, rounding, reset; documented WAIT/FWAIT and ESC `D8h..DFh` decoding.
- FPU is an independent co-processor state machine sharing guest machine progression, with explicit instruction costs / busy behavior. The clock is not host wall time or a magic CPU speedup multiplier. Blocking/wait behavior must be tested.

## Carefully bounded implementation order
1. **Reference/provenance gate:** provided `fpu.h`, `fpu_state.h`, `fpu_types.h` contain interfaces and type definitions, **not** arithmetic or decoder implementation. Obtain compatible `fpu.cpp` (and instruction/ESC dispatch sources) with upstream commit/licenses. A large fraction of the generic DOSBox-X headers covers newer CPU extensions. Use only behavior valid for 80287XL.
2. **Instruction gate A:** FNINIT, FLD/FST/FSTP (integer/float operands), FLD1/FLDZ, FXCH, FADD/P, FSUB/P, FMUL/P, FDIV/P, FCOM/FSTSW/FNSTSW, FWAIT; valid/empty/overflow tags; memory forms, stack conditions and exceptions.
3. **Precision gate:** 80287XL x87 extended 80-bit representation: sign, 15-bit exponent and explicit 64-bit significand. **JavaScript `Number` is binary64, not a drop-in substitute for x87 80-bit.** Decide/verify a pure-JS BigInt-backed or equivalent extended arithmetic path with reproducible rounding and tests before claiming 80-bit compatibility. If a temporary binary64 teaching subset is used, mark it a preview visibly.
4. **Special functions/advanced gate:** round modes, FSQRT, transcendental only where evidenced valid for 287XL; error flags, status word, FPU present/absent detection and guarded real-mode memory transfers.
5. **Educational UI:** optional FPU panel, ST stack + TOP, control/status/tag word decoding, pause, single-step, guided examples (addition, rounding, divide by zero, Newton iteration), CPU vs FPU step counters and cycles.
6. **Real 16-bit DOS program:** `FRACTAL.COM` or `MANDEL.COM` runs in guest, executes actual x87 ESC opcodes over a Mandelbrot grid, writes indexed pixels to VGA 13h directly, yields/can be stopped, and restores DOS text mode. Suggested first preview: 160×100 samples mapped 2× to 320×200; **no host-side JS fractal rendering disguised as guest x87**.

## Minimum acceptance tests
- CPU AT with FPU absent/present and unchanged CPU semantics; XT unchanged.
- Stack top wrap, overflow/underflow, tags, FLD/FSTP, 80-bit load/store, binary32/64 conversions and rounding modes with golden vectors.
- Status/control exception masks, fault behavior consistent with 286+287 interface; WAIT and busy synchronization.
- Snapshot export/import of all FPU state, deterministic re-execution and malformed-state rejection.
- CPU/FPU shared 12/16 MHz virtual clock; instruction-time and wall-time clearly distinguished.
- Pixel output of real guest DOS fractal changes with arithmetic, repeated runs reproduce same VRAM hash; after ESC abort CPU/VRAM/FDD/IDE preserved where expected.
- FreeDOS A:, VGA12/VGA13, TUNE AdLib, XT DEBUG and prior software test gates unchanged.

## Hard limits
No build/transpilation; natively editable ES6; no 386 emulation, runtime npm, WASM or C++. The FPU registers are a peripheral's internal state, **not extra installed RAM**. An educational Mandelbrot renderer should display progress rather than freeze the browser. A fully faithful 80-bit FPU must not be declared DONE on the basis of JavaScript floating-point approximations alone.
