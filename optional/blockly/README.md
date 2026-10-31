# MD.js Ultra — Blocks Lite v0.2 / Arduino Toy Lab

**An optional, self-contained HTML/ES6 programming playground, on `feature/blockly-lite`.**
No npm, imports, web services, hardware access or execution of arbitrary source code in the browser. This is a **toy I/O simulation**, not a CPU/AVR emulator, circuit simulator, electric safety verifier, or physical Arduino IDE.

Open `index.html` directly in a modern browser. Start with **🧪 Playground**, click **▶ Simulovat 3 cykly**, and adjust the virtual inputs. The controls affect the *interpreted allowlisted JSON block program*, not executable JS strings. A sensor change updates the simulated outputs while simulation is active.

## Virtual UNO lab

| Device | Virtual pin | Model |
| --- | --- | --- |
| Momentary button (click to hold/release) | D2 | digital 0 or 1 |
| Switch | D3 | digital 0 or 1 |
| Potentiometer | A0 | analog 0…1023 |
| Microphone | A1 | synthetic analog slider 0…1023; **no access to system microphone** |
| Built-in LED | D13 | digital on/off |
| PWM LED | D9 | 0…255 average brightness indication; does **not** model PWM waveform |
| Servo | D10 | absolute 0…180° visual indication, no dynamics/load |
| Stepper | D4–D7 | abstract signed step count / rotor; no coils/torque/acceleration simulation |

The **Playground preset** wires button → D13 LED, potentiometer → mapped D9 PWM (0…255), mic → mapped servo D10 (0…180°), switch → 8 motor steps per loop, with a 250 ms simulated delay. **Blink** is the v0.1 regression preset.

Users can add/move/edit/remove/nest blocks in `setup` and `loop`, choose JS, Python, or Arduino C++ generation, export/import JSON, and inspect step traces. The Arduino exporter targets a classic UNO-style pinout, but is **not** a verified firmware build. The generated sketch uses the usual `Servo.h` library (when needed) and emits a simple four-phase GPIO driver routine for the stepper. **Never connect a motor directly to microcontroller pins:** a suitable external driver (e.g. ULN2003 for a compatible unipolar stepper), suitable supply, and correct wiring are required. Physical button wiring needs defined pull states; analog microphone hardware requires an appropriate conditioned analog output. Nothing is wired to a real computer port.

## Technical scope

- **Sandbox:** fixed allowlisted block vocabulary + strict block validation + bounds on size, depth, execution steps, and virtual time. No `eval`, `Function`, user scripts, arbitrary HTML injection or runtime code imports.
- **Compatibility:** original v0.1 `version:1` block JSON remains supported; old 28 regression tests retained.
- **Export:** generated JS/Python are readable examples with a minimal simulated board API. They are **not** run by the playground. The C++ export may require Arduino toolchain and Servo library; UNO-style pins are not universal across boards.
- **Limitations:** no realistic analog noise/ADC accuracy, debounce, electrical currents, motors' physical behavior, PWM timer frequency, multitasking, real-time loop scheduling, hardware flashing, oscilloscope, or full Google Blockly drag connectors.
- **Boundary:** no ASM. This branch stays separate from ZX, retro machine backends and the separate Micro JS-Torch ENV. The MD.js core is untouched.

## Checks

```sh
node tests/test.mjs             # 49 unit/regression tests
python3 tests/browser.py       # Chromium E2E; requires Python Playwright + local Chromium
```

Optional syntax checks of generated source (development tools only):

```sh
node --check MD-Blocks.js
python3 -m py_compile tests/export-playground.py
# Uses stub Arduino APIs and Servo.h (syntax only, not an Arduino build)
g++ -std=c++11 -fsyntax-only -x c++ \
  -include tests/arduino-shim.h -I tests tests/export-playground.cpp
```

## Roadmap (deferred)

Optional drag-and-drop block connectors, richer editable branching, more electronic components, lessons and real toolchain/export tests. **Do not** turn this into a full Arduino electrical/AVR emulator or widen the MD.js runtime. Mini-3D, CAD, G-code and Micro JS-Torch live elsewhere or remain deferred.
