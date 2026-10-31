// JS simulation — this source is NOT executed by the Blocks Lite preview
const board = { pins: Object.create(null), timeMs: 0 };
const LED_BUILTIN = 13;
const A0 = 'A0', A1 = 'A1';
function pinMode(pin, mode) { if (!board.pins[pin]) board.pins[pin] = {mode: 'INPUT', state:'LOW'}; board.pins[pin].mode = mode; }
function digitalWrite(pin, state) { if (!board.pins[pin]) board.pins[pin] = {mode:'OUTPUT', state:'LOW'}; board.pins[pin].state = state; console.log('PIN', pin, state); }
function delay(ms) { board.timeMs += ms; }
function digitalRead(pin) { return Number((board.pins[pin] || {}).input || 0); }
function analogRead(pin) { return Number((board.pins[pin] || {}).analog || 0); }
function mapValue(x,a,b,c,d) { return Math.trunc((x-a)*(d-c)/(b-a)+c); }
function analogWrite(pin, value) { board.pins[pin] = {pwm:value}; }
function servoWrite(pin, angle) { board.pins[pin] = {servo:angle}; }
function stepperMove(steps) { board.stepperPosition = (board.stepperPosition || 0) + steps; }
let angle = 0;
let brightness = 0;
let button = 0;
let mic = 0;
let pot = 0;
let sw = 0;
function setup() {
  pinMode(13, "OUTPUT");
  pinMode(9, "OUTPUT");
  console.log("Arduino Playground ready");
}
function loop() {
  button = digitalRead(2);
  digitalWrite(13, button ? "HIGH" : "LOW");
  pot = analogRead(A0);
  brightness = mapValue(pot, 0, 1023, 0, 255);
  analogWrite(9, brightness);
  mic = analogRead(A1);
  angle = mapValue(mic, 0, 1023, 0, 180);
  servoWrite(10, angle);
  sw = digitalRead(3);
  if (sw == 1) {
    stepperMove(8);
  }
  delay(250);
}
setup();
for (let cycle = 0; cycle < 3; cycle++) loop();
