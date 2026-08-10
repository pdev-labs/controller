import re

with open('public/controller.js', 'r') as f:
    content = f.read()

# Change const maxTilt to let maxTilt
content = content.replace("const maxTilt = 30;", "let maxTilt = 30;")

# Add sensitivity logic at the end
sens_logic = """
// Sensitivity logic
const sensSelector = document.getElementById('gyro-sensitivity');
if (sensSelector) {
    sensSelector.addEventListener('change', (e) => {
        maxTilt = parseInt(e.target.value, 10);
    });
}
"""
content += "\n" + sens_logic

with open('public/controller.js', 'w') as f:
    f.write(content)
