import sys
import json
import time
import platform
import os

OS_TYPE = platform.system().lower()

class VirtualDevice:
    def process_command(self, data):
        pass
    def close(self):
        pass

class LinuxDevice(VirtualDevice):
    def __init__(self):
        try:
            from evdev import UInput, ecodes as e, AbsInfo
            self.e = e
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
                e.EV_REL: [e.REL_X, e.REL_Y, e.REL_WHEEL]
            }
            self.ui_gamepad = UInput(capabilities, name="Microsoft X-Box 360 pad", vendor=0x045e, product=0x028e, version=0x0114)
            self.ui_mk = UInput(mk_capabilities, name="Universal Virtual MK", vendor=0x1234, product=0x5678, version=0x0111)
            
            self.ui_gamepad.write(e.EV_ABS, e.ABS_X, 0)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_Y, 0)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_RX, 0)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_RY, 0)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_Z, 0)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_RZ, 0)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_HAT0X, 0)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_HAT0Y, 0)
            self.ui_gamepad.syn()
            self.is_ready = True
        except ImportError:
            self.is_ready = False
            print("Warning: evdev not available.", file=sys.stderr)

    def process_command(self, data):
        if not self.is_ready: return
        t = data.get('type')
        e = self.e
        
        if t == 'analog':
            x = max(-32768, min(32767, int(data.get('x', 0) * 32767)))
            y = max(-32768, min(32767, int(data.get('y', 0) * 32767)))
            self.ui_gamepad.write(e.EV_ABS, e.ABS_X, x)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_Y, y)
            self.ui_gamepad.syn()
        elif t == 'gyro':
            x = max(-32768, min(32767, int(data.get('x', 0) * 32767)))
            y = max(-32768, min(32767, int(data.get('y', 0) * 32767)))
            self.ui_gamepad.write(e.EV_ABS, e.ABS_RX, x)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_RY, y)
            self.ui_gamepad.syn()
        elif t == 'button':
            btn_name = data.get('btn')
            val = data.get('val')
            if hasattr(e, btn_name):
                self.ui_gamepad.write(e.EV_KEY, getattr(e, btn_name), val)
            if btn_name == 'BTN_TL':
                self.ui_gamepad.write(e.EV_ABS, e.ABS_Z, 255 if val else 0)
            elif btn_name == 'BTN_TR':
                self.ui_gamepad.write(e.EV_ABS, e.ABS_RZ, 255 if val else 0)
            self.ui_gamepad.syn()
        elif t == 'dpad':
            x = data.get('x', 0)
            y = data.get('y', 0)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_HAT0X, x)
            self.ui_gamepad.write(e.EV_ABS, e.ABS_HAT0Y, y)
            self.ui_gamepad.syn()
        elif t == 'mouse_move':
            dx = int(data.get('dx', 0))
            dy = int(data.get('dy', 0))
            self.ui_mk.write(e.EV_REL, e.REL_X, dx)
            self.ui_mk.write(e.EV_REL, e.REL_Y, dy)
            self.ui_mk.syn()
        elif t == 'mouse_scroll':
            dy = int(data.get('dy', 0))
            self.ui_mk.write(e.EV_REL, e.REL_WHEEL, dy)
            self.ui_mk.syn()
        elif t == 'mouse_click':
            btn = data.get('btn')
            val = data.get('val')
            if btn == 'left':
                self.ui_mk.write(e.EV_KEY, e.BTN_LEFT, val)
            elif btn == 'right':
                self.ui_mk.write(e.EV_KEY, e.BTN_RIGHT, val)
            self.ui_mk.syn()
        elif t == 'key':
            key_code = data.get('code')
            val = data.get('val')
            if hasattr(e, key_code):
                self.ui_mk.write(e.EV_KEY, getattr(e, key_code), val)
                self.ui_mk.syn()

    def close(self):
        if self.is_ready:
            self.ui_gamepad.close()
            self.ui_mk.close()

class WindowsDevice(VirtualDevice):
    def __init__(self):
        try:
            import vgamepad as vg
            from pynput.keyboard import Controller as KeyboardController, Key, KeyCode
            from pynput.mouse import Controller as MouseController, Button

            self.gamepad = vg.VX360Gamepad()
            self.vg = vg
            self.keyboard = KeyboardController()
            self.mouse = MouseController()
            self.Button = Button
            self.Key = Key
            
            # Map evdev button names to vgamepad buttons
            self.btn_map = {
                'BTN_A': vg.XUSB_BUTTON.XUSB_GAMEPAD_A,
                'BTN_B': vg.XUSB_BUTTON.XUSB_GAMEPAD_B,
                'BTN_X': vg.XUSB_BUTTON.XUSB_GAMEPAD_X,
                'BTN_Y': vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,
                'BTN_TL': vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER,
                'BTN_TR': vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER,
                'BTN_SELECT': vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK,
                'BTN_START': vg.XUSB_BUTTON.XUSB_GAMEPAD_START,
                'BTN_THUMBL': vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_THUMB,
                'BTN_THUMBR': vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_THUMB,
                'BTN_MODE': vg.XUSB_BUTTON.XUSB_GAMEPAD_GUIDE
            }
            
            # Very basic key mapping for pynput (from evdev key names)
            self.key_map = {
                'KEY_TAB': Key.tab, 'KEY_ESC': Key.esc, 'KEY_ENTER': Key.enter,
                'KEY_LEFTCTRL': Key.ctrl_l, 'KEY_LEFTSHIFT': Key.shift_l, 'KEY_LEFTALT': Key.alt_l,
                'KEY_RIGHTCTRL': Key.ctrl_r, 'KEY_RIGHTSHIFT': Key.shift_r, 'KEY_RIGHTALT': Key.alt_r,
                'KEY_SPACE': Key.space, 'KEY_BACKSPACE': Key.backspace,
                'KEY_UP': Key.up, 'KEY_DOWN': Key.down, 'KEY_LEFT': Key.left, 'KEY_RIGHT': Key.right,
            }
            self.is_ready = True
        except ImportError:
            self.is_ready = False
            print("Warning: vgamepad or pynput not available.", file=sys.stderr)

    def process_command(self, data):
        if not self.is_ready: return
        t = data.get('type')
        
        if t == 'analog':
            # Map [-1.0, 1.0] from frontend (already scaled to 32767 in node? No, server.js sends raw?)
            # Wait, server.js sends data.x, data.y directly! Which is [-1, 1] usually, but wait, evdev scaled it locally.
            x = data.get('x', 0)
            y = data.get('y', 0)
            # Y is inverted in some APIs. We'll pass it directly to vgamepad.
            self.gamepad.left_joystick_float(x_value_float=x, y_value_float=-y)
            self.gamepad.update()
            
        elif t == 'gyro':
            x = data.get('x', 0)
            y = data.get('y', 0)
            self.gamepad.right_joystick_float(x_value_float=x, y_value_float=-y)
            self.gamepad.update()
            
        elif t == 'button':
            btn_name = data.get('btn')
            val = data.get('val')
            
            if btn_name in self.btn_map:
                if val:
                    self.gamepad.press_button(button=self.btn_map[btn_name])
                else:
                    self.gamepad.release_button(button=self.btn_map[btn_name])
            
            if btn_name == 'BTN_TL':
                self.gamepad.left_trigger_float(value_float=1.0 if val else 0.0)
            elif btn_name == 'BTN_TR':
                self.gamepad.right_trigger_float(value_float=1.0 if val else 0.0)
                
            self.gamepad.update()
            
        elif t == 'dpad':
            x = data.get('x', 0)
            y = data.get('y', 0)
            if val := x == -1: self.gamepad.press_button(self.vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT)
            else: self.gamepad.release_button(self.vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT)
            if val := x == 1: self.gamepad.press_button(self.vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT)
            else: self.gamepad.release_button(self.vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT)
            if val := y == -1: self.gamepad.press_button(self.vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP)
            else: self.gamepad.release_button(self.vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP)
            if val := y == 1: self.gamepad.press_button(self.vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN)
            else: self.gamepad.release_button(self.vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN)
            self.gamepad.update()
            
        elif t == 'mouse_move':
            dx = int(data.get('dx', 0))
            dy = int(data.get('dy', 0))
            self.mouse.move(dx, dy)
            
        elif t == 'mouse_scroll':
            dy = int(data.get('dy', 0))
            self.mouse.scroll(0, dy)
            
        elif t == 'mouse_click':
            btn = data.get('btn')
            val = data.get('val')
            b = self.Button.left if btn == 'left' else self.Button.right
            if val: self.mouse.press(b)
            else: self.mouse.release(b)
            
        elif t == 'key':
            key_code = data.get('code')
            val = data.get('val')
            k = self.key_map.get(key_code)
            if not k and key_code.startswith('KEY_'):
                # Try character parsing
                char = key_code[4:].lower()
                if len(char) == 1:
                    k = char
            if k:
                if val: self.keyboard.press(k)
                else: self.keyboard.release(k)

class MacDevice(VirtualDevice):
    def __init__(self):
        try:
            from pynput.keyboard import Controller as KeyboardController, Key, KeyCode
            from pynput.mouse import Controller as MouseController, Button
            self.keyboard = KeyboardController()
            self.mouse = MouseController()
            self.Button = Button
            self.Key = Key
            
            # Map gamepad buttons to keyboard equivalents for macOS fallback
            self.btn_map = {
                'BTN_A': 'k', 'BTN_B': 'l', 'BTN_X': 'j', 'BTN_Y': 'i',
                'BTN_TL': 'u', 'BTN_TR': 'o', 'BTN_SELECT': Key.space, 'BTN_START': Key.enter,
            }
            self.key_map = {
                'KEY_TAB': Key.tab, 'KEY_ESC': Key.esc, 'KEY_ENTER': Key.enter,
                'KEY_LEFTCTRL': Key.ctrl_l, 'KEY_LEFTSHIFT': Key.shift_l, 'KEY_LEFTALT': Key.alt_l,
                'KEY_SPACE': Key.space, 'KEY_BACKSPACE': Key.backspace,
                'KEY_UP': Key.up, 'KEY_DOWN': Key.down, 'KEY_LEFT': Key.left, 'KEY_RIGHT': Key.right,
            }
            self.is_ready = True
            print("Note: macOS Gamepad emulation falls back to keyboard/mouse.", file=sys.stderr)
        except ImportError:
            self.is_ready = False
            print("Warning: pynput not available on macOS.", file=sys.stderr)

    def process_command(self, data):
        if not self.is_ready: return
        t = data.get('type')
        
        if t == 'button':
            btn_name = data.get('btn')
            val = data.get('val')
            if btn_name in self.btn_map:
                k = self.btn_map[btn_name]
                if val: self.keyboard.press(k)
                else: self.keyboard.release(k)
                
        elif t == 'dpad':
            x = data.get('x', 0)
            y = data.get('y', 0)
            if val := x == -1: self.keyboard.press(self.Key.left)
            else: self.keyboard.release(self.Key.left)
            if val := x == 1: self.keyboard.press(self.Key.right)
            else: self.keyboard.release(self.Key.right)
            if val := y == -1: self.keyboard.press(self.Key.up)
            else: self.keyboard.release(self.Key.up)
            if val := y == 1: self.keyboard.press(self.Key.down)
            else: self.keyboard.release(self.Key.down)
            
        elif t == 'mouse_move':
            self.mouse.move(int(data.get('dx', 0)), int(data.get('dy', 0)))
        elif t == 'mouse_scroll':
            self.mouse.scroll(0, int(data.get('dy', 0)))
        elif t == 'mouse_click':
            btn = data.get('btn')
            val = data.get('val')
            b = self.Button.left if btn == 'left' else self.Button.right
            if val: self.mouse.press(b)
            else: self.mouse.release(b)
        elif t == 'key':
            key_code = data.get('code')
            val = data.get('val')
            k = self.key_map.get(key_code)
            if not k and key_code.startswith('KEY_'):
                char = key_code[4:].lower()
                if len(char) == 1: k = char
            if k:
                if val: self.keyboard.press(k)
                else: self.keyboard.release(k)

def run():
    print(f"Detected OS: {OS_TYPE}", file=sys.stderr)
    if OS_TYPE == 'windows':
        device = WindowsDevice()
    elif OS_TYPE == 'darwin':
        device = MacDevice()
    else:
        device = LinuxDevice()
        
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            data = json.loads(line.strip())
            device.process_command(data)
        except Exception as ex:
            print(f"Error: {ex}", file=sys.stderr)
            
    device.close()

if __name__ == "__main__":
    run()
