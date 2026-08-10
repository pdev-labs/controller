import re

with open('public/style.css', 'r') as f:
    content = f.read()

# Replace .vk-key and related with new styles
old_css = """
.vk-key {
    background: var(--md-surface-container-high);
    color: var(--md-on-surface);
    border: none;
    border-radius: 8px;
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
    min-height: 44px;
    box-shadow: var(--elevation-1);
    position: relative;
    overflow: hidden;
    user-select: none;
    cursor: pointer;
    text-transform: uppercase;
}
.vk-key:active, .vk-key.active {
    background: var(--md-primary-container);
    color: var(--md-on-primary-container);
}
.vk-key.wide {
    flex: 1.5;
}
.vk-key.wider {
    flex: 2;
}
.vk-key.spacebar {
    flex: 5;
}
.vk-key.special {
    font-size: 12px;
    background: var(--md-surface-container-highest);
}
"""

new_css = """
/* GMK Oblivion Styles */
#keyboard-mode {
    background: #1E1E1E;
}
.vk-row {
    margin-bottom: 6px;
    padding: 0 10px;
}
.vk-gap-small {
    width: 20px;
    flex-shrink: 0;
}
.vk-gap-empty {
    flex: 1;
    background: transparent;
    border: none;
    box-shadow: none;
}
.vk-key {
    background: #DCDCDC;
    color: #2B2B2B;
    border: none;
    border-radius: 6px;
    flex: 1;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    padding: 8px 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    min-height: 50px;
    box-shadow: inset 0 -4px 0 rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
    user-select: none;
    cursor: pointer;
    margin: 0 3px;
}
.vk-key:active, .vk-key.active {
    background: #C4C4C4;
    box-shadow: inset 0 0px 0 rgba(0,0,0,0.15), 0 0px 1px rgba(0,0,0,0.5);
    transform: translateY(2px);
}
.vk-key.wide {
    flex: 1.5;
}
.vk-key.wider {
    flex: 2.2;
}
.vk-key.spacebar {
    flex: 6;
}
.vk-key.special {
    background: #4B4B4B;
    color: #FFFFFF;
    justify-content: center;
    align-items: center;
    font-size: 12px;
}
.vk-key.special:active, .vk-key.special.active {
    background: #3A3A3A;
}
.vk-key.accent {
    background: #D05030;
    color: #FFFFFF;
    justify-content: center;
    align-items: center;
    font-size: 12px;
}
.vk-key.accent:active, .vk-key.accent.active {
    background: #B34327;
}
"""

if ".vk-key {" in content:
    content = content.replace(old_css.strip(), new_css.strip())
else:
    content += "\n" + new_css.strip()

with open('public/style.css', 'w') as f:
    f.write(content)
