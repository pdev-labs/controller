import struct
import sys

def run():
    print("========================================")
    print("🎮 GYRO SENSOR TESTER")
    print("========================================")
    try:
        f = open('/dev/input/js0', 'rb')
    except Exception as e:
        print("Error: Could not open the virtual controller.")
        print("Make sure the server is running and permissions are set!")
        return

    print("✅ Virtual controller detected.")
    print("⏳ Waiting for Gyro input... (Tilt your phone!)")
    print("Press Ctrl+C to stop testing.\n")
    
    last_x, last_y = 0, 0
    try:
        while True:
            evbuf = f.read(8)
            if evbuf:
                time, value, type, number = struct.unpack('IhBB', evbuf)
                if type & 0x02:  # EV_ABS
                    if number == 3: # ABS_RX
                        last_x = value
                        print(f"\rGyro X: {last_x:6d} | Gyro Y: {last_y:6d}", end="")
                    elif number == 4: # ABS_RY
                        last_y = value
                        print(f"\rGyro X: {last_x:6d} | Gyro Y: {last_y:6d}", end="")
    except KeyboardInterrupt:
        print("\nTest stopped.")

if __name__ == "__main__":
    run()
