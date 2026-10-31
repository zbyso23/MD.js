# Source reference manifest — Phase 4B/4C

User-supplied C++ reference files, **never compiled into runtime**. Source archive exact Git commit is **unverified**. Individual headers show GPL-2.0-or-later; the IDE header has no explicit license header, so provenance is inherited only tentatively until upstream verified. Original names retained (including `ide(1).h`).

| File | SHA-256 |
|---|---|
| `fpu.h` | `b90606cc2ec09bae7616767b9c78fb844741151efe6e34e894f9c527923b018c` |
| `fpu_state.h` | `fdce13dee9434c302d9bdaab6afe786877e6cfa05dee67845ee44af46921b11c` |
| `fpu_types.h` | `af70b52da14271ad87a63a3404532a9ac589a71a9f953db61c7a724dca6d9818` |
| `ide(1).h` | `27c38b793c714553c872e3542b88fa255ee1b296b35e63142a31d27ff44b81d2` |
| `ide.cpp` | `e4aa5d08e8b68a1100185e63a0f61edcb662bb1971063b3192342b71234e2187` |

Required to close source gate: exact repository URL/commit, `src/fpu/fpu.cpp` or corresponding source implementation, 286 ESC opcode/x87 interface references, x87 instruction and exception handling, 80287XL technical reference. Do not import later 386/486/Pentium-only opcodes merely because upstream has them.
