// Arduino sketch — export only; compile with Arduino toolchain
#include <Servo.h>
Servo servoMotor;
long angle = 0;
long brightness = 0;
long button = 0;
long mic = 0;
long pot = 0;
long sw = 0;
// Four-wire unipolar motor via a proper driver (e.g. ULN2003), never direct from GPIO.
const int motorPins[4] = {4,5,6,7};
long motorPosition = 0;
void stepperMove(int steps) {
  const byte phase[4][4] = {{1,0,0,0},{0,1,0,0},{0,0,1,0},{0,0,0,1}};
  for (int s = 0; s < abs(steps); s++) {
    motorPosition += steps > 0 ? 1 : -1;
    int idx = ((motorPosition % 4) + 4) % 4;
    for (int c = 0; c < 4; c++) digitalWrite(motorPins[c], phase[idx][c] ? HIGH : LOW);
    delay(10);
  }
}
void setup() {
  Serial.begin(9600);
  servoMotor.attach(10);
  for (int p = 4; p <= 7; p++) pinMode(p, OUTPUT);
  pinMode(13, OUTPUT);
  pinMode(9, OUTPUT);
  Serial.println("Arduino Playground ready");
}

void loop() {
  button = digitalRead(2);
  digitalWrite(13, button ? HIGH : LOW);
  pot = analogRead(A0);
  brightness = map(pot, 0, 1023, 0, 255);
  analogWrite(9, brightness);
  mic = analogRead(A1);
  angle = map(mic, 0, 1023, 0, 180);
  servoMotor.write(angle);
  sw = digitalRead(3);
  if (sw == 1) {
    stepperMove(8);
  }
  delay(250);
}
