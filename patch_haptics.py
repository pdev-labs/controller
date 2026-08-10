import re

with open('public/controller.js', 'r') as f:
    content = f.read()

vibe_logic = """
// --- HAPTICS & 2X BUTTON ---
let isVibrationEnabled = true;
const vibToggle = document.getElementById('vibration-toggle');
if (vibToggle) {
    vibToggle.addEventListener('change', (e) => {
        isVibrationEnabled = (e.target.value === 'on');
    });
}

function triggerVibration() {
    if (isVibrationEnabled && navigator.vibrate) {
        navigator.vibrate(20); // 20ms buzz
    }
}

const btn2x = document.getElementById('btn-2x');
if (btn2x) {
    btn2x.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn2x.classList.add('active');
        triggerVibration();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'button', btn: 'BTN_THUMBR', val: 1 }));
        }
    });
    btn2x.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn2x.classList.remove('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'button', btn: 'BTN_THUMBR', val: 0 }));
        }
    });
    btn2x.addEventListener('touchcancel', (e) => {
        btn2x.classList.remove('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'button', btn: 'BTN_THUMBR', val: 0 }));
        }
    });
}
// ----------------------------
"""
content = vibe_logic + content

content = content.replace("sendButton(btnName, 1);", "triggerVibration();\n            sendButton(btnName, 1);")
content = content.replace("sendDpad(0, -1);", "triggerVibration();\n            sendDpad(0, -1);")
content = content.replace("sendDpad(0, 1);", "triggerVibration();\n            sendDpad(0, 1);")
content = content.replace("sendDpad(-1, 0);", "triggerVibration();\n            sendDpad(-1, 0);")
content = content.replace("sendDpad(1, 0);", "triggerVibration();\n            sendDpad(1, 0);")
content = content.replace("sendKeyGlobal(el.dataset.code, 1);", "triggerVibration();\n            sendKeyGlobal(el.dataset.code, 1);")

with open('public/controller.js', 'w') as f:
    f.write(content)
