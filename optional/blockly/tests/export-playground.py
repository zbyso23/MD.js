# Python 3 simulation — export only, not run inside the browser
LED_BUILTIN = 13
pins = {}
virtual_time_ms = 0
def pinMode(pin, mode):
    pins.setdefault(pin, {})['mode'] = mode
def digitalWrite(pin, state):
    pins.setdefault(pin, {})['state'] = state
    print('PIN', pin, state)
def delay(ms):
    global virtual_time_ms
    virtual_time_ms += ms
def digitalRead(pin):
    return int(pins.get(pin, {}).get('input', 0))
def analogRead(pin):
    return int(pins.get(pin, {}).get('analog', 0))
def mapValue(x,a,b,c,d):
    return int((x-a)*(d-c)/(b-a)+c)
def analogWrite(pin,value):
    pins.setdefault(pin,{})['pwm'] = value
def servoWrite(pin,angle):
    pins.setdefault(pin,{})['servo'] = angle
def stepperMove(steps):
    global stepper_position
    stepper_position += steps
stepper_position = 0
A0 = 'A0'
A1 = 'A1'
angle = 0
brightness = 0
button = 0
mic = 0
pot = 0
sw = 0
def setup():
    global angle, brightness, button, mic, pot, sw
    pinMode(13, "OUTPUT")
    pinMode(9, "OUTPUT")
    print("Arduino Playground ready")
def loop():
    global angle, brightness, button, mic, pot, sw
    button = digitalRead(2)
    digitalWrite(13, 'HIGH' if button else 'LOW')
    pot = analogRead(A0)
    brightness = mapValue(pot, 0, 1023, 0, 255)
    analogWrite(9, brightness)
    mic = analogRead(A1)
    angle = mapValue(mic, 0, 1023, 0, 180)
    servoWrite(10, angle)
    sw = digitalRead(3)
    if sw == 1:
        stepperMove(8)
    delay(250)
setup()
for cycle in range(3):
    loop()
