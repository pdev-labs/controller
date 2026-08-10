import re

with open('public/controller.js', 'r') as f:
    content = f.read()

# Extract everything before and after vkLayout
before_layout = content[:content.find("const vkLayout = [")]
after_layout = content[content.find("vkLayout.forEach(row => {"):]

new_layout = """const vkLayout = [
    // Row 1
    [
        {label: 'Esc', code: 'KEY_ESC', cls: 'accent'}, {cls: 'vk-gap'},
        {label: 'F1', code: 'KEY_F1'}, {label: 'F2', code: 'KEY_F2'}, {label: 'F3', code: 'KEY_F3'}, {label: 'F4', code: 'KEY_F4'}, {cls: 'vk-gap-small'},
        {label: 'F5', code: 'KEY_F5'}, {label: 'F6', code: 'KEY_F6'}, {label: 'F7', code: 'KEY_F7'}, {label: 'F8', code: 'KEY_F8'}, {cls: 'vk-gap-small'},
        {label: 'F9', code: 'KEY_F9'}, {label: 'F10', code: 'KEY_F10'}, {label: 'F11', code: 'KEY_F11'}, {label: 'F12', code: 'KEY_F12'}, {cls: 'vk-gap-small'},
        {label: 'PrtSc', code: 'KEY_SYSRQ', cls: 'special'}, {label: 'ScrLk', code: 'KEY_SCROLLLOCK', cls: 'special'}, {label: 'Pause', code: 'KEY_PAUSE', cls: 'special'}, {cls: 'vk-gap-small'},
        {cls: 'vk-gap-small'}
    ],
    // Row 2
    [
        {label: '~', code: 'KEY_GRAVE'}, {label: '1', code: 'KEY_1'}, {label: '2', code: 'KEY_2'}, {label: '3', code: 'KEY_3'},
        {label: '4', code: 'KEY_4'}, {label: '5', code: 'KEY_5'}, {label: '6', code: 'KEY_6'}, {label: '7', code: 'KEY_7'},
        {label: '8', code: 'KEY_8'}, {label: '9', code: 'KEY_9'}, {label: '0', code: 'KEY_0'}, {label: '-', code: 'KEY_MINUS'},
        {label: '=', code: 'KEY_EQUAL'}, {label: 'Backspace', code: 'KEY_BACKSPACE', cls: 'special wider'}, {cls: 'vk-gap-small'},
        {label: 'Ins', code: 'KEY_INSERT', cls: 'special'}, {label: 'Home', code: 'KEY_HOME', cls: 'special'}, {label: 'PgUp', code: 'KEY_PAGEUP', cls: 'special'}, {cls: 'vk-gap-small'},
        {label: 'Num', code: 'KEY_NUMLOCK', cls: 'special'}, {label: '/', code: 'KEY_KPSLASH', cls: 'special'}, {label: '*', code: 'KEY_KPASTERISK', cls: 'special'}, {label: '-', code: 'KEY_KPMINUS', cls: 'special'}
    ],
    // Row 3
    [
        {label: 'Tab', code: 'KEY_TAB', cls: 'special wide'},
        {label: 'Q', code: 'KEY_Q'}, {label: 'W', code: 'KEY_W'}, {label: 'E', code: 'KEY_E'}, {label: 'R', code: 'KEY_R'},
        {label: 'T', code: 'KEY_T'}, {label: 'Y', code: 'KEY_Y'}, {label: 'U', code: 'KEY_U'}, {label: 'I', code: 'KEY_I'},
        {label: 'O', code: 'KEY_O'}, {label: 'P', code: 'KEY_P'}, {label: '[', code: 'KEY_LEFTBRACE'}, {label: ']', code: 'KEY_RIGHTBRACE'},
        {label: '\\\\', code: 'KEY_BACKSLASH', cls: 'special wider'}, {cls: 'vk-gap-small'},
        {label: 'Del', code: 'KEY_DELETE', cls: 'special'}, {label: 'End', code: 'KEY_END', cls: 'special'}, {label: 'PgDn', code: 'KEY_PAGEDOWN', cls: 'special'}, {cls: 'vk-gap-small'},
        {label: '7', code: 'KEY_KP7'}, {label: '8', code: 'KEY_KP8'}, {label: '9', code: 'KEY_KP9'}, {label: '+', code: 'KEY_KPPLUS', cls: 'special'}
    ],
    // Row 4
    [
        {label: 'Caps', code: 'KEY_CAPSLOCK', cls: 'special wide'},
        {label: 'A', code: 'KEY_A'}, {label: 'S', code: 'KEY_S'}, {label: 'D', code: 'KEY_D'}, {label: 'F', code: 'KEY_F'},
        {label: 'G', code: 'KEY_G'}, {label: 'H', code: 'KEY_H'}, {label: 'J', code: 'KEY_J'}, {label: 'K', code: 'KEY_K'},
        {label: 'L', code: 'KEY_L'}, {label: ';', code: 'KEY_SEMICOLON'}, {label: '\\'', code: 'KEY_APOSTROPHE'},
        {label: 'Enter', code: 'KEY_ENTER', cls: 'accent wider'}, {cls: 'vk-gap-small'},
        {cls: 'vk-gap-empty'}, {cls: 'vk-gap-empty'}, {cls: 'vk-gap-empty'}, {cls: 'vk-gap-small'},
        {label: '4', code: 'KEY_KP4'}, {label: '5', code: 'KEY_KP5'}, {label: '6', code: 'KEY_KP6'}, {label: '', code: '', cls: 'vk-gap-empty'}
    ],
    // Row 5
    [
        {label: 'Shift', code: 'KEY_LEFTSHIFT', cls: 'special wider'},
        {label: 'Z', code: 'KEY_Z'}, {label: 'X', code: 'KEY_X'}, {label: 'C', code: 'KEY_C'}, {label: 'V', code: 'KEY_V'},
        {label: 'B', code: 'KEY_B'}, {label: 'N', code: 'KEY_N'}, {label: 'M', code: 'KEY_M'}, {label: ',', code: 'KEY_COMMA'},
        {label: '.', code: 'KEY_DOT'}, {label: '/', code: 'KEY_SLASH'}, {label: 'Shift', code: 'KEY_RIGHTSHIFT', cls: 'special wide'}, {cls: 'vk-gap-small'},
        {cls: 'vk-gap-empty'}, {label: 'Up', code: 'KEY_UP', cls: 'special'}, {cls: 'vk-gap-empty'}, {cls: 'vk-gap-small'},
        {label: '1', code: 'KEY_KP1'}, {label: '2', code: 'KEY_KP2'}, {label: '3', code: 'KEY_KP3'}, {label: 'Ent', code: 'KEY_KPENTER', cls: 'accent'}
    ],
    // Row 6
    [
        {label: 'Ctrl', code: 'KEY_LEFTCTRL', cls: 'special wide'},
        {label: 'Win', code: 'KEY_LEFTMETA', cls: 'special'},
        {label: 'Alt', code: 'KEY_LEFTALT', cls: 'special wide'},
        {label: 'Space', code: 'KEY_SPACE', cls: 'spacebar'},
        {label: 'Alt', code: 'KEY_RIGHTALT', cls: 'special'},
        {label: 'Win', code: 'KEY_RIGHTMETA', cls: 'special'},
        {label: 'Menu', code: 'KEY_COMPOSE', cls: 'special'},
        {label: 'Ctrl', code: 'KEY_RIGHTCTRL', cls: 'special wide'}, {cls: 'vk-gap-small'},
        {label: 'Left', code: 'KEY_LEFT', cls: 'special'},
        {label: 'Down', code: 'KEY_DOWN', cls: 'special'},
        {label: 'Right', code: 'KEY_RIGHT', cls: 'special'}, {cls: 'vk-gap-small'},
        {label: '0', code: 'KEY_KP0', cls: 'wide'}, {label: '.', code: 'KEY_KPDOT'}, {label: '', code: '', cls: 'vk-gap-empty'}
    ]
];

"""

# Patch renderer loop to handle gaps
old_loop = """    row.forEach(keyData => {
        const keyBtn = document.createElement('div');
        keyBtn.className = 'vk-key ' + (keyData.cls || '');
        keyBtn.textContent = keyData.label;
        
        keyBtn.dataset.code = keyData.code;
        rowDiv.appendChild(keyBtn);
    });"""

new_loop = """    row.forEach(keyData => {
        const keyBtn = document.createElement('div');
        if (keyData.code === 'gap' || (keyData.cls && keyData.cls.includes('vk-gap'))) {
            keyBtn.className = keyData.cls || 'vk-gap';
        } else {
            keyBtn.className = 'vk-key ' + (keyData.cls || '');
            keyBtn.textContent = keyData.label || '';
            keyBtn.dataset.code = keyData.code || '';
        }
        rowDiv.appendChild(keyBtn);
    });"""

after_layout = after_layout.replace(old_loop, new_loop)

with open('public/controller.js', 'w') as f:
    f.write(before_layout + new_layout + after_layout)

