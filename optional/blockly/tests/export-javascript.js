// JS simulation — this source is NOT executed by the Blocks Lite preview
const board = { pins: Object.create(null), timeMs: 0 };
const LED_BUILTIN = 13;
function pinMode(pin, mode) { if (!board.pins[pin]) board.pins[pin] = {mode: 'INPUT', state:'LOW'}; board.pins[pin].mode = mode; }
function digitalWrite(pin, state) { if (!board.pins[pin]) board.pins[pin] = {mode:'OUTPUT', state:'LOW'}; board.pins[pin].state = state; console.log('PIN', pin, state); }
function delay(ms) { board.timeMs += ms; }

function setup() {
  pinMode(LED_BUILTIN, "OUTPUT");
  console.log("MD.js Blocks Lite ready");
}
function loop() {
  digitalWrite(LED_BUILTIN, "HIGH");
  delay(1000);
  digitalWrite(LED_BUILTIN, "LOW");
  delay(1000);
}
setup();
for (let cycle = 0; cycle < 3; cycle++) loop();
