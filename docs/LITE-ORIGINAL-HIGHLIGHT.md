# Lite syntax highlighting and encyclopaedia cleanup

Original MD.js reference CSS palettes are scoped to `.md-root pre.md-code` for JavaScript, Python, HTML, CSS, INI, PHP and Bash. The original source project used per-language backgrounds and labels. The Lite renderer now emits language labels and DocUX code-tabs use the same syntax tokenization as fenced code. Assembler section and 157 Assembler entries removed from the Lite encyclopaedia, not from Ultra.

Some original code highlighters were regex-based; Lite retains its modern safe tokenizer. Visual cross-browser contrast is not yet verified.
