import re

with open('public/controller.js', 'r') as f:
    content = f.read()

old_logic = """    if (theme === 'xbox') {
        btnCross.childNodes[0].textContent = 'A';
        btnCircle.childNodes[0].textContent = 'B';
        btnSquare.childNodes[0].textContent = 'X';
        btnTriangle.childNodes[0].textContent = 'Y';
    } else if (theme === 'snes') {"""

new_logic = """    if (theme === 'xbox' || theme === 'xbox-premium') {
        btnCross.childNodes[0].textContent = 'A';
        btnCircle.childNodes[0].textContent = 'B';
        btnSquare.childNodes[0].textContent = 'X';
        btnTriangle.childNodes[0].textContent = 'Y';
    } else if (theme === 'snes') {"""

content = content.replace(old_logic, new_logic)

with open('public/controller.js', 'w') as f:
    f.write(content)

