import re

with open('public/controller.js', 'r') as f:
    content = f.read()

# Replace the entire vkLayout.forEach block
match = re.search(r'vkLayout\.forEach\(.*?\}\);\s*\}\);\s*vkContainer\.appendChild\(rowDiv\);\s*\}\);', content, re.DOTALL)
if match:
    old_block = match.group(0)
    new_block = """vkLayout.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'vk-row';
    row.forEach(keyData => {
        const keyBtn = document.createElement('div');
        if (keyData.code === 'gap' || (keyData.cls && keyData.cls.includes('vk-gap'))) {
            keyBtn.className = keyData.cls || 'vk-gap';
        } else {
            keyBtn.className = 'vk-key ' + (keyData.cls || '');
            keyBtn.textContent = keyData.label || '';
            keyBtn.dataset.code = keyData.code || '';
        }
        rowDiv.appendChild(keyBtn);
    });
    vkContainer.appendChild(rowDiv);
});"""
    content = content.replace(old_block, new_block)
    with open('public/controller.js', 'w') as f:
        f.write(content)
        print("Patched vkLayout loop")
else:
    print("Could not find vkLayout loop")
