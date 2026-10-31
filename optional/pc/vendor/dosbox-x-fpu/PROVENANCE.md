# DOSBox-X FPU references (study only)

Supplied by project owner on 2026-10-24. Upstream commit not independently established.
These C++ references are **not compiled or executed** by the project. They describe FPU architecture, exception semantics and 80-bit formats. The new `PC-FPU287.js` is a self-contained restricted JS binary64 educational preview, **not** a source-equivalent DB x87 port. Preserve upstream headers; check licensing/provenance before public redistribution.

## SHA-256

```
b90606cc2ec09bae7616767b9c78fb844741151efe6e34e894f9c527923b018c  fpu.h (5941 B)
fdce13dee9434c302d9bdaab6afe786877e6cfa05dee67845ee44af46921b11c  fpu_state.h (5595 B)
af70b52da14271ad87a63a3404532a9ac589a71a9f953db61c7a724dca6d9818  fpu_types.h (11547 B)
60fd19fdcd6f388ce2a020ae60df8f8ffeb8a433b22117c09a44eaf247413574  fpu.cpp (69428 B)
d52a5a4fbbb75980b736986944b75db263bbe3b07628f55794b3b423c18f44c6  fpu_float80.cpp (14825 B)
7a8b1212c9520308478bef5ce0e619717f61472ed7d31643858bf4deadf6b442  fpu_float80.h (1691 B)
7a71c9621357e2f548396c22eae5f6d266e38bb4d7c2f724f4f33a51081ab9e4  fpu_helpers.cpp (10503 B)
7511c82a8668e0b4803bae800f356f89d6ae7be0000c719ee303e9addaed5eab  fpu_helpers.h (1162 B)
70ab544e5c4b563a4c20c86b1369fa380aae208d1015f4428c611bc183f12637  fpu_x86_assembly.h (25744 B)
```
