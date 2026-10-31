# Arduino Toy Lab v0.2 — verification

- **Node unit/regression:** 49 PASS / 0 FAIL (28 existing + 21 new).
- **Generated JS:** parses and runs using Node.js v22 VM with no third-party runtime.
- **Generated Python:** `py_compile` PASS.
- **Generated Arduino C++:** `g++ -std=c++11 -fsyntax-only` PASS against a deliberately limited API and Servo stub. **Not a real AVR toolchain compilation or upload.**
- **Chromium E2E:** PASS via Python Playwright loading the HTML, CSS and scripts locally; verified block editing, JS/Python/Arduino tabs, pot→PWM, microphone→servo, switch→stepper, button→LED, old Blink, theme, and no JS exceptions.
- **Not tested:** physical boards, actual servo/stepper electronics, ADC noise/debounce, waveform timing, cross-browser E2E, full Google Blockly compatibility.
