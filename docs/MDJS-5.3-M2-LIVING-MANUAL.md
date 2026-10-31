# MD.js Ultra 5.3 — Numerical M2 / Živá encyklopedie

Offline vanilla JS. Sections: Markdown, KaTeX, Micro R, Numerical M2, Assembler.

M2: fft, ifft, complex, convolve, Hann/Hamming, signal generators, derivative, Simpson/trapezoid, Euler/RK4.

Micro R subset: fft_mag, spectrum, sine, square, saw, hann, hamming, convolve, integrate_poly, derivative_poly, ode_decay. For user-defined functions/ODE systems use the JavaScript API, as Micro R does not implement arbitrary R functions.

Numerical boundaries: FFT 1..16384 power of two; windows 2..16384; signal frequency below Nyquist; bounded convolution; integration n<=100000; ODE <=10000 steps.

Examples are accessible in the Micro R preset selector. No claim of GNU R or NumPy API compatibility.
