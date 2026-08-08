import subprocess
import time
import json

proc = subprocess.Popen(["python3", "virtual_joystick.py"], stdin=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(1)

# Send L button press
msg = json.dumps({"type": "button", "btn": "BTN_TL", "val": 1}) + "\n"
proc.stdin.write(msg.encode('utf-8'))
proc.stdin.flush()

time.sleep(0.5)

# Send L button release
msg = json.dumps({"type": "button", "btn": "BTN_TL", "val": 0}) + "\n"
proc.stdin.write(msg.encode('utf-8'))
proc.stdin.flush()

time.sleep(0.5)
proc.terminate()
out, err = proc.communicate()
print("ERRORS:", err.decode('utf-8'))
