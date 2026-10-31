# MiniChem Plus III — acceptance and educational boundaries

A dependency-free, intentionally small formatter for a subset of `\ce{...}`. Syntax: common molecules, charge, isotopes, hydrates, physical states, nested bracket/parenthesis groups, reaction arrows including up to two safe labels. Mixed Math+Chem runs through the `MiniChem.expand()` hook before bundled KaTeX.

Example: `$$\Delta H=H_{\ce{H2O(l)}}-H_{\ce{H2O(g)}}$$`.

New `MiniChem.diagnose(input)` returns `{ok,tex?,index,message,hint}`. The positional index is precise for selected structural errors and approximate for other unsupported syntax; it is **not** a complete parser source-map. No chemistry verification or balancing. Input maximum 2048 characters, group depth maximum 32, arrow labels maximum 48 characters.

EDU workflow: open Markdown Examples → KaTeX Showcase; edit, review in Reader, open Projector for lessons, use Print preview before printing. Check visual appearance in the target browser; automated API tests do not certify end-to-end printing.
