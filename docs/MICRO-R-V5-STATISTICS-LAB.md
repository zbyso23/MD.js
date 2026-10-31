# Micro R Statistics Lab 5.0

## Scope

An offline, build-free, browser-native **R-inspired numeric subset**. It is **not GNU R**, and it does not execute R packages, loops, user-defined functions, filesystem calls or system commands. Evaluating expressions is explicit via Run.

## Start

Open `optional/micror/index.html` directly in a browser or use the tile on the MD.js Ultra home page. Choose a preset or import data (CSV, TSV, JSON array of flat records), then execute commands with Ctrl+Enter. The imported frame is named `data`.

## Syntax and functions

`x <- c(1,2,3)`; `x <- 1:10`; basic numeric arithmetic; `data$column`; `mean`, `median`, `var`, `sd`, `summary`, `sum`, `min`, `max`, `quantile`, `seq`, `rep`, `length`, `round`, `sqrt`, `log`, `exp`, `abs`, `cov`, `cor`, `sort`, `unique`, `range`, `cumsum`, `diff`, `prod`, `lm(y,x)`, `head`, `tail`, `names`, `nrow`, `ncol`, `plot`, `hist`, `boxplot`, `barplot`.

Import: CSV with quoted fields and escaped double quotes, TSV, JSON array of objects. Maximum 3 MB, 20,000 rows, 100 columns. Columns must have unique identifiers; imported names are normalized. Missing values import as null, but numeric statistics currently reject columns containing missing values.

Charts are offline SVG renderings. Exports: dataset CSV / JSON, results JSON, latest chart SVG. Filenames include YYYYMMDDHHMMSS.

## Important limitations

R syntax is deliberately incomplete: `lm(y,x)` is the current R-like syntax, **not** canonical GNU R `lm(y ~ x, data=...)`; no data-frame filtering, grouping, joins, date-time parsing, advanced hypothesis tests or multiple regression. Descriptive outputs are educational, not a validated replacement for scientific R. Results should be cross-checked for consequential analyses.

## Security

No `eval`, dynamic imports, network requests, or arbitrary file access. Files are read only through user-selected File inputs or drag/drop. Source execution has an instruction count bound.
