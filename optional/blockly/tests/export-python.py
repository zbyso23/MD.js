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

def setup():
    pinMode(LED_BUILTIN, "OUTPUT")
    print("MD.js Blocks Lite ready")
def loop():
    digitalWrite(LED_BUILTIN, "HIGH")
    delay(1000)
    digitalWrite(LED_BUILTIN, "LOW")
    delay(1000)
setup()
for cycle in range(3):
    loop()
