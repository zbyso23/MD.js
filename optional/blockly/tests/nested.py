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
counter = 0
def setup():
    global counter
    counter = 0
def loop():
    global counter
    for _block_i1 in range(3):
        counter += 1
        if counter > 1:
            print("x")
setup()
for cycle in range(3):
    loop()
