# MD.js Ultra PC Phase 1 — Native JavaScript CPU exceptions (v0.7.4 Alpha)

**Status:** Phase 1 in progress; Gate 1 **NOT CLOSED**. **Uncompiled runtime:** direct HTML/CSS/JavaScript. No WebAssembly, transpilation, build process, native binaries, or 386 CPU instructions. Maximum installed system RAM remains **1 MiB**.

## What really changed

- `F6/F7 DIV/IDIV` divisor=0 and quotient overflow can now dispatch x86 guest exception vector **0** (`#DE`) through the real-mode **IVT** and 286 protected-mode **IDT**. The original host `CPUFault` fallback remains when a real-mode guest did not install vector 0; an unhandled exception is never reported as a successful instruction.
- The 8086-style divide-error frame saves the instruction-end return IP; the 286-style frame saves the **instruction-start** IP, including prefixes. This matches the difference documented in the shipped DOSBox-X 8086/286 CPU reference cores, but it is not an exhaustive hardware compatibility claim.
- Guest `IRET` is genuinely executed and restores saved flags, CS and IP. Fault entry clears TF and IF for interrupt gates; the protected IDT uses 8-byte 286 gates and the existing checked 286 code descriptor path.
- Added 80186/286 `BOUND r16,m16&16`: signed inclusive lower/upper checks, and guest `#BR` **vector 5** for out-of-range values in real and supported protected-mode cases. The XT 8086 subset intentionally rejects this opcode rather than guessing; DOSBox-X's special 8086 opcode alias remains unimplemented.
- PC Workbench exposes **#DE · dělení nulou** (both machines) and **286 #BR · BOUND** sample guest handlers; self-diagnostics now include these execution paths.
- `PC16CPU.snapshot()` exposes `lastFault` metadata for inspection, not an indication that all fault states are supported.

## Tests performed

`npm run test:pc:phase1` tests the real pure-JS CPU, chipset and BIOS code. `npm run test:pc:browser` tests it in actual Chromium, including the two new buttons. `npm run test:release` validates the rest of MD.js Ultra.

New direct exception tests cover: real-mode IVT on XT and AT, no-handler fail-closed behavior, zero divisor, overflow without register modifications, 8086 vs 286 pushed return IP, prefix restart IP, 286 protected IDT, invalid gate, 286 `BOUND` signed limits and guest IRET retry.

## Known open CPU issues (do not claim Gate 1 passed)

- Partial instruction decoder: not a complete 8086 or 286 emulator. Several legacy instructions and exact cycle timings are not implemented.
- 286 Protected Mode remains incomplete: TSS ring transitions, descriptor privilege checks, LDT support, complete `#GP/#SS/#NP` exception handling and task switches are not done. Fault delivery is tested for the two specific exception vectors; other faults may still throw `CPUFault`.
- 8086 undocumented opcode behaviors (including 0x62 alias) are not implemented.
- Exact behavior in double faults/triple faults, repeat faults, nested conditions and incomplete interrupt states needs further work. BIOS layer is a subset and disk/video/DOS boot are deliberately out of scope until later phases.
- Reference files from [DOSBox-X](https://github.com/joncampbell123/dosbox-x) at commit `029bd65c5dcc7cdc7f2e14e35278620d9707d969` remain uncompiled, GPL-covered inputs under `optional/pc/vendor/`. Executing files are original GPLv3 JavaScript adaptations; no proprietary ROMs were added.

## Run (no building)

Open `optional/pc/index.html` directly. `npm` exists only to execute optional **tests**. Never required to use the lab.

