# MD.js Ultra 5.2 — Numerical Core and Micro R Formula Lab

M0: typed numeric tensors (vectors and 2D matrices), element-wise broadcasting with explicit dimensions, matrix multiplication, transpose and dot product.

M1: linear solve with partial pivoting, determinant, Euclidean norm, least-squares regression using modified Gram-Schmidt QR with column pivoting and reorthogonalization. Rank-deficient designs are rejected. This is an educational small-matrix library, **not** a full replacement for industrial LAPACK.

R support: named `data.frame`, `lm(y ~ x1 + x2, data=data)` and `lm(y ~ x1 * x2, data=data)`, `coef`, `summary`, `residuals`, `fitted`, `predict(model)` (in-sample only). Missing observations are omitted in formula regression; not complete R `na.action`. Numeric columns only. No categorical factors, standard errors, t-tests, p-values, arbitrary functions or general formula language.

Micro R loads the numerical core locally from `optional/micror/numerical-core.js`. No runtime libraries, `eval` or server required.

Try: `optional/micror/index.html` and the two new bilingual encyclopedia entries.
