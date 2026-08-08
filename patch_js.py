import re

with open('public/controller.js', 'r') as f:
    content = f.read()

# Replace the hidden keyboard logic
old_keyboard = """keyboardBtn.addEventListener('click', () => {
    hiddenInput.focus();
    hiddenInput.click();
});"""

new_keyboard = """const keyboardMode = document.getElementById('keyboard-mode');
const trackpadMode = document.getElementById('trackpad-mode');
const closeKeyboardBtn = document.getElementById('close-keyboard-btn');
const vkContainer = document.getElementById('vk-container');

keyboardBtn.addEventListener('click', () => {
    trackpadMode.classList.add('hidden');
    keyboardMode.classList.remove('hidden');
});

closeKeyboardBtn.addEventListener('click', () => {
    keyboardMode.classList.add('hidden');
    trackpadMode.classList.remove('hidden');
});

// Build Virtual Keyboard
const vkLayout = [
    [
        {label: 'Esc', code: 'KEY_ESC', cls: 'special'},
        {label: '1', code: 'KEY_1'}, {label: '2', code: 'KEY_2'}, {label: '3', code: 'KEY_3'}, {label: '4', code: 'KEY_4'},
        {label: '5', code: 'KEY_5'}, {label: '6', code: 'KEY_6'}, {label: '7', code: 'KEY_7'}, {label: '8', code: 'KEY_8'},
        {label: '9', code: 'KEY_9'}, {label: '0', code: 'KEY_0'}, {label: '-', code: 'KEY_MINUS'}, {label: '=', code: 'KEY_EQUAL'},
        {label: 'Backspace', code: 'KEY_BACKSPACE', cls: 'special wider'}
    ],
    [
        {label: 'Tab', code: 'KEY_TAB', cls: 'special wide'},
        {label: 'Q', code: 'KEY_Q'}, {label: 'W', code: 'KEY_W'}, {label: 'E', code: 'KEY_E'}, {label: 'R', code: 'KEY_R'},
        {label: 'T', code: 'KEY_T'}, {label: 'Y', code: 'KEY_Y'}, {label: 'U', code: 'KEY_U'}, {label: 'I', code: 'KEY_I'},
        {label: 'O', code: 'KEY_O'}, {label: 'P', code: 'KEY_P'}, {label: '[', code: 'KEY_LEFTBRACE'}, {label: ']', code: 'KEY_RIGHTBRACE'},
        {label: '\\\\', code: 'KEY_BACKSLASH', cls: 'special'}
    ],
    [
        {label: 'Caps', code: 'KEY_CAPSLOCK', cls: 'special wide'},
        {label: 'A', code: 'KEY_A'}, {label: 'S', code: 'KEY_S'}, {label: 'D', code: 'KEY_D'}, {label: 'F', code: 'KEY_F'},
        {label: 'G', code: 'KEY_G'}, {label: 'H', code: 'KEY_H'}, {label: 'J', code: 'KEY_J'}, {label: 'K', code: 'KEY_K'},
        {label: 'L', code: 'KEY_L'}, {label: ';', code: 'KEY_SEMICOLON'}, {label: '\\'', code: 'KEY_APOSTROPHE'},
        {label: 'Enter', code: 'KEY_ENTER', cls: 'special wider'}
    ],
    [
        {label: 'Shift', code: 'KEY_LEFTSHIFT', cls: 'special wider'},
        {label: 'Z', code: 'KEY_Z'}, {label: 'X', code: 'KEY_X'}, {label: 'C', code: 'KEY_C'}, {label: 'V', code: 'KEY_V'},
        {label: 'B', code: 'KEY_B'}, {label: 'N', code: 'KEY_N'}, {label: 'M', code: 'KEY_M'}, {label: ',', code: 'KEY_COMMA'},
        {label: '.', code: 'KEY_DOT'}, {label: '/', code: 'KEY_SLASH'}, {label: 'Up', code: 'KEY_UP', cls: 'special'},
        {label: 'Shift', code: 'KEY_RIGHTSHIFT', cls: 'special wide'}
    ],
    [
        {label: 'Ctrl', code: 'KEY_LEFTCTRL', cls: 'special wide'},
        {label: 'Win', code: 'KEY_LEFTMETA', cls: 'special'},
        {label: 'Alt', code: 'KEY_LEFTALT', cls: 'special wide'},
        {label: 'Space', code: 'KEY_SPACE', cls: 'spacebar'},
        {label: 'Alt', code: 'KEY_RIGHTALT', cls: 'special'},
        {label: 'Left', code: 'KEY_LEFT', cls: 'special'},
        {label: 'Down', code: 'KEY_DOWN', cls: 'special'},
        {label: 'Right', code: 'KEY_RIGHT', cls: 'special'}
    ]
];

vkLayout.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'vk-row';
    row.forEach(keyData => {
        const keyBtn = document.createElement('div');
        keyBtn.className = 'vk-key ' + (keyData.cls || '');
        keyBtn.textContent = keyData.label;
        
        const sendKey = (val) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'key', code: keyData.code, val: val }));
            }
        };

        keyBtn.addEventListener('touchstart', (e) => {
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
        
        rowDiv.appendChild(keyBtn);
    });
    vkContainer.appendChild(rowDiv);
});
"""

content = content.replace(old_keyboard, new_keyboard)

with open('public/controller.js', 'w') as f:
    f.write(content)

