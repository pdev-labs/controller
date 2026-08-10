import struct
import sys

def read_joystick():
    try:
        f = open('/dev/input/js0', 'rb')
    except Exception as e:
        print("Failed to open joystick:", e)
        return

    print("Listening to /dev/input/js0...")
    count = 0
    while count < 20:
        evbuf = f.read(8)
        if evbuf:
            time, value, type, number = struct.unpack('IhBB', evbuf)
            # type 2 is EV_ABS
            if type & 0x02:
                print(f"Axis {number} moved to {value}")
                count += 1

read_joystick()
