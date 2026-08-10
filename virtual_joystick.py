import sys
import json
import time

try:
    from evdev import UInput, ecodes as e, AbsInfo
    HAS_EVDEV = True
except ImportError:
    HAS_EVDEV = False
    print("Warning: evdev not available (probably not Linux). Controller emulation disabled.", file=sys.stderr)
    class Dummy:
        def __getattr__(self, name): return 0
        def write(self, *args): pass
        def syn(self, *args): pass
        def close(self): pass
    e = Dummy()
    UInput = lambda *args, **kwargs: Dummy()
    AbsInfo = lambda *args, **kwargs: None

capabilities = {
    e.EV_KEY: [
        e.BTN_A, e.BTN_B, e.BTN_X, e.BTN_Y,
        e.BTN_TL, e.BTN_TR, e.BTN_SELECT, e.BTN_START,
        e.BTN_MODE, e.BTN_THUMBL, e.BTN_THUMBR
    ],
    e.EV_ABS: [
        (e.ABS_X, AbsInfo(value=0, min=-32768, max=32767, fuzz=16, flat=128, resolution=0)),
        (e.ABS_Y, AbsInfo(value=0, min=-32768, max=32767, fuzz=16, flat=128, resolution=0)),
        (e.ABS_RX, AbsInfo(value=0, min=-32768, max=32767, fuzz=16, flat=128, resolution=0)),
        (e.ABS_RY, AbsInfo(value=0, min=-32768, max=32767, fuzz=16, flat=128, resolution=0)),
        (e.ABS_Z, AbsInfo(value=0, min=0, max=255, fuzz=0, flat=0, resolution=0)),
        (e.ABS_RZ, AbsInfo(value=0, min=0, max=255, fuzz=0, flat=0, resolution=0)),
        (e.ABS_HAT0X, AbsInfo(value=0, min=-1, max=1, fuzz=0, flat=0, resolution=0)),
        (e.ABS_HAT0Y, AbsInfo(value=0, min=-1, max=1, fuzz=0, flat=0, resolution=0))
    ]
}

mk_capabilities = {
    e.EV_KEY: [
        e.BTN_LEFT, e.BTN_RIGHT, e.BTN_MIDDLE,
        e.KEY_ESC, e.KEY_1, e.KEY_2, e.KEY_3, e.KEY_4, e.KEY_5, e.KEY_6, e.KEY_7, e.KEY_8, e.KEY_9, e.KEY_0, e.KEY_MINUS, e.KEY_EQUAL, e.KEY_BACKSPACE,
        e.KEY_TAB, e.KEY_Q, e.KEY_W, e.KEY_E, e.KEY_R, e.KEY_T, e.KEY_Y, e.KEY_U, e.KEY_I, e.KEY_O, e.KEY_P, e.KEY_LEFTBRACE, e.KEY_RIGHTBRACE, e.KEY_ENTER,
        e.KEY_LEFTCTRL, e.KEY_A, e.KEY_S, e.KEY_D, e.KEY_F, e.KEY_G, e.KEY_H, e.KEY_J, e.KEY_K, e.KEY_L, e.KEY_SEMICOLON, e.KEY_APOSTROPHE, e.KEY_GRAVE, e.KEY_LEFTSHIFT, e.KEY_BACKSLASH,
        e.KEY_Z, e.KEY_X, e.KEY_C, e.KEY_V, e.KEY_B, e.KEY_N, e.KEY_M, e.KEY_COMMA, e.KEY_DOT, e.KEY_SLASH, e.KEY_RIGHTSHIFT, e.KEY_KPASTERISK,
        e.KEY_LEFTALT, e.KEY_SPACE, e.KEY_CAPSLOCK, e.KEY_F1, e.KEY_F2, e.KEY_F3, e.KEY_F4, e.KEY_F5, e.KEY_F6, e.KEY_F7, e.KEY_F8, e.KEY_F9, e.KEY_F10, e.KEY_F11, e.KEY_F12,
        e.KEY_NUMLOCK, e.KEY_SCROLLLOCK, e.KEY_HOME, e.KEY_UP, e.KEY_PAGEUP, e.KEY_LEFT, e.KEY_RIGHT, e.KEY_END, e.KEY_DOWN, e.KEY_PAGEDOWN, e.KEY_INSERT, e.KEY_DELETE,
        e.KEY_KP0, e.KEY_KP1, e.KEY_KP2, e.KEY_KP3, e.KEY_KP4, e.KEY_KP5, e.KEY_KP6, e.KEY_KP7, e.KEY_KP8, e.KEY_KP9,
        e.KEY_KPMINUS, e.KEY_KPPLUS, e.KEY_KPENTER, e.KEY_KPDOT, e.KEY_KPSLASH, e.KEY_SYSRQ, e.KEY_PAUSE, e.KEY_RIGHTCTRL, e.KEY_RIGHTALT, e.KEY_RIGHTMETA, e.KEY_COMPOSE
    ],
    e.EV_REL: [
        e.REL_X, e.REL_Y, e.REL_WHEEL
    ]
}

# Emulate as a Microsoft X-Box 360 pad
ui_gamepad = UInput(capabilities, name="Microsoft X-Box 360 pad", vendor=0x045e, product=0x028e, version=0x0114)
ui_mk = UInput(mk_capabilities, name="Universal Virtual MK", vendor=0x1234, product=0x5678, version=0x0111)

def run():
    ui_gamepad.write(e.EV_ABS, e.ABS_X, 0)
    ui_gamepad.write(e.EV_ABS, e.ABS_Y, 0)
    ui_gamepad.write(e.EV_ABS, e.ABS_RX, 0)
    ui_gamepad.write(e.EV_ABS, e.ABS_RY, 0)
    ui_gamepad.write(e.EV_ABS, e.ABS_Z, 0)
    ui_gamepad.write(e.EV_ABS, e.ABS_RZ, 0)
    ui_gamepad.write(e.EV_ABS, e.ABS_HAT0X, 0)
    ui_gamepad.write(e.EV_ABS, e.ABS_HAT0Y, 0)
    ui_gamepad.syn()

    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            data = json.loads(line.strip())
            t = data.get('type')

            if t == 'analog':
                x = max(-32768, min(32767, int(data.get('x', 0) * 32767)))
                y = max(-32768, min(32767, int(data.get('y', 0) * 32767)))
                ui_gamepad.write(e.EV_ABS, e.ABS_X, x)
                ui_gamepad.write(e.EV_ABS, e.ABS_Y, y)
                ui_gamepad.syn()

            elif t == 'gyro':
                x = max(-32768, min(32767, int(data.get('x', 0) * 32767)))
                y = max(-32768, min(32767, int(data.get('y', 0) * 32767)))
                ui_gamepad.write(e.EV_ABS, e.ABS_RX, x)
                ui_gamepad.write(e.EV_ABS, e.ABS_RY, y)
                ui_gamepad.syn()

            elif t == 'button':
                btn_name = data.get('btn')
                val = data.get('val')
                if hasattr(e, btn_name):
                    ui_gamepad.write(e.EV_KEY, getattr(e, btn_name), val)
                
                # Send Xbox Trigger events for L and R
                if btn_name == 'BTN_TL':
                    ui_gamepad.write(e.EV_ABS, e.ABS_Z, 255 if val else 0)
                elif btn_name == 'BTN_TR':
                    ui_gamepad.write(e.EV_ABS, e.ABS_RZ, 255 if val else 0)
                
                ui_gamepad.syn()

            elif t == 'dpad':
                x = data.get('x', 0)
                y = data.get('y', 0)
                ui_gamepad.write(e.EV_ABS, e.ABS_HAT0X, x)
                ui_gamepad.write(e.EV_ABS, e.ABS_HAT0Y, y)
                ui_gamepad.syn()

            elif t == 'mouse_move':
                dx = int(data.get('dx', 0))
                dy = int(data.get('dy', 0))
                ui_mk.write(e.EV_REL, e.REL_X, dx)
                ui_mk.write(e.EV_REL, e.REL_Y, dy)
                ui_mk.syn()

            elif t == 'mouse_scroll':
                dy = int(data.get('dy', 0))
                ui_mk.write(e.EV_REL, e.REL_WHEEL, dy)
                ui_mk.syn()

            elif t == 'mouse_click':
                btn = data.get('btn')
                val = data.get('val')
                if btn == 'left':
                    ui_mk.write(e.EV_KEY, e.BTN_LEFT, val)
                elif btn == 'right':
                    ui_mk.write(e.EV_KEY, e.BTN_RIGHT, val)
                ui_mk.syn()

            elif t == 'key':
                key_code = data.get('code')
                val = data.get('val')
                if hasattr(e, key_code):
                    ui_mk.write(e.EV_KEY, getattr(e, key_code), val)
                    ui_mk.syn()

        except Exception as ex:
            print(f"Error: {ex}", file=sys.stderr)

if __name__ == "__main__":
    run()
    ui_gamepad.close()
    ui_mk.close()
