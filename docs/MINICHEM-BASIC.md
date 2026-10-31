# MiniChem Basic v5.4.3

Offline JavaScript class (`optional/math/minichem.js`) loaded before math.js. Expands supported `\ce{...}` calls into KaTeX markup.

Supported: simple element symbols, numeric subscripts, parenthesized groups, charge syntax `^2-`, trailing `+` or `-`, reaction arrows `->`, `<-`, `<->`, `<=>`, stoichiometric coefficients.

Not supported: full mhchem, curly-braced groups within `\ce`, isotopes, nested custom commands, chemistry computations, reaction balancing, annotations. Basic tokenizer is deliberately constrained.

Use `node optional/math/minichem.test.cjs`. All math rendering remains local and no eval is used.
