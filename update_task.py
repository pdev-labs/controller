with open('/home/pdev/.gemini/antigravity-ide/brain/343f1e8e-86e4-49a3-a66c-f10030a1a626/task.md', 'r') as f:
    content = f.read()

content = content.replace("- `[ ]` Update `vkLayout` in `controller.js` to include structural gaps.", "- `[x]` Update `vkLayout` in `controller.js` to include structural gaps.")
content = content.replace("- `[ ]` Update JS rendering logic to handle gap elements.", "- `[x]` Update JS rendering logic to handle gap elements.")
content = content.replace("- `[ ]` Rewrite CSS for `.vk-key` and `.vk-container` in `style.css` to match GMK Oblivion theme.", "- `[x]` Rewrite CSS for `.vk-key` and `.vk-container` in `style.css` to match GMK Oblivion theme.")
content = content.replace("- `[ ]` Test visual changes.", "- `[x]` Test visual changes.")

with open('/home/pdev/.gemini/antigravity-ide/brain/343f1e8e-86e4-49a3-a66c-f10030a1a626/task.md', 'w') as f:
    f.write(content)
