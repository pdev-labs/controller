import sys

with open('virtual_joystick.py', 'r') as f:
    lines = f.readlines()

with open('virtual_joystick.py', 'w') as f:
    skip = False
    for line in lines:
        if "if btn_name == 'BTN_TL':" in line:
            skip = True
        elif skip and "ui_gamepad.syn()" in line:
            skip = False
            f.write(line)
        elif not skip:
            f.write(line)
