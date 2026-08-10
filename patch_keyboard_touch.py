import re

with open('public/controller.js', 'r') as f:
    content = f.read()

old_loop = """        keyBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keyBtn.classList.add('active');
            sendKey(1);
        });
        keyBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keyBtn.classList.remove('active');
            sendKey(0);
        });
        keyBtn.addEventListener('touchcancel', (e) => {
            keyBtn.classList.remove('active');
            sendKey(0);
        });

        rowDiv.appendChild(keyBtn);"""

new_loop = """        keyBtn.dataset.code = keyData.code;
        rowDiv.appendChild(keyBtn);"""

content = content.replace(old_loop, new_loop)

# Add the new global touch handler for the keyboard
new_handler = """
// Global multi-touch handler for Virtual Keyboard
const vkActiveKeys = new Map();

function sendKeyGlobal(code, val) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'key', code: code, val: val }));
    }
}

function handleVkTouches(e) {
    e.preventDefault();
    const currentTouches = e.touches;
    const currentlyPressed = new Set();
    
    for (let i = 0; i < currentTouches.length; i++) {
        const touch = currentTouches[i];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && el.classList.contains('vk-key')) {
            currentlyPressed.add(el);
        }
    }
    
    // newly pressed
    currentlyPressed.forEach(el => {
        if (!vkActiveKeys.has(el)) {
            vkActiveKeys.set(el, true);
            el.classList.add('active');
            sendKeyGlobal(el.dataset.code, 1);
        }
    });
    
    // newly released
    vkActiveKeys.forEach((_, el) => {
        if (!currentlyPressed.has(el)) {
            vkActiveKeys.delete(el);
            el.classList.remove('active');
            sendKeyGlobal(el.dataset.code, 0);
        }
    });
}

vkContainer.addEventListener('touchstart', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchmove', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchend', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchcancel', handleVkTouches, {passive: false});
"""

# Insert the new handler right before keyMap
content = content.replace("// Map standard chars to EV_KEY constants", new_handler + "\n\n// Map standard chars to EV_KEY constants")

with open('public/controller.js', 'w') as f:
    f.write(content)
