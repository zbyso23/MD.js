# Arduino Toy Lab — an optional view of Blocks Lite

This is **not** a second framework: Arduino and Blockly share the files under `../blockly/` and the same safe runtime. Launch Arduino using `../blockly/index.html?preset=playground`; launch introductory Blockly using `../blockly/index.html?preset=blink`.

The simulator has LED, button, switch, analog potentiometer, synthetic microphone, PWM, servo and stepper. It generates Arduino C++ but does not emulate an AVR chip or physical circuit.


## Graph / Blueprint visual programming (Phase 4R)

The same Arduino Playground also has a **Graph** tab. It draws and edits the
existing `setup`/`loop` JSON as wire-connected command nodes. Data pins use
validated Arduino variable names with fan-out; disconnected branches are saved
as inert `loose` chains. Click the two connector pins to link them.
Editing either Graph or Blocks updates the same simulator and C++/Python/JS
export. Running/stepping in Graph highlights the executing AST node. The
current implementation is a structured teaching graph, not a general UE5
Blueprint interpreter or an AVR simulator. All scripts work without a server.
