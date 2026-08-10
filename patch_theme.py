import re

with open('public/controller.js', 'r') as f:
    content = f.read()

theme_logic = """
// Theme Switcher Logic
const themeSelector = document.getElementById('theme-selector');
const btnCross = document.querySelector('[data-btn="btn-cross"]');
const btnCircle = document.querySelector('[data-btn="btn-circle"]');
const btnSquare = document.querySelector('[data-btn="btn-square"]');
const btnTriangle = document.querySelector('[data-btn="btn-triangle"]');
const sysSelect = document.querySelector('.sys-btn[data-btn="btn-select"]');
const sysStart = document.querySelector('.sys-btn[data-btn="btn-start"]');
const btnL = document.getElementById('btn-l');
const btnR = document.getElementById('btn-r');

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    
    // Clear custom text for L, R, Select, Start
    btnL.childNodes[0].textContent = '';
    btnR.childNodes[0].textContent = '';
    sysSelect.childNodes[0].textContent = '';
    sysStart.childNodes[0].textContent = '';
    
    if (theme === 'xbox') {
        btnCross.childNodes[0].textContent = 'A';
        btnCircle.childNodes[0].textContent = 'B';
        btnSquare.childNodes[0].textContent = 'X';
        btnTriangle.childNodes[0].textContent = 'Y';
    } else if (theme === 'snes') {
        btnCross.childNodes[0].textContent = 'B';
        btnCircle.childNodes[0].textContent = 'A';
        btnSquare.childNodes[0].textContent = 'Y';
        btnTriangle.childNodes[0].textContent = 'X';
        sysSelect.childNodes[0].textContent = 'SELECT';
        sysStart.childNodes[0].textContent = 'START';
    } else {
        // PS default
        btnCross.childNodes[0].textContent = '✖';
        btnCircle.childNodes[0].textContent = '⭘';
        btnSquare.childNodes[0].textContent = '◼';
        btnTriangle.childNodes[0].textContent = '▲';
        btnL.childNodes[0].textContent = 'L';
        btnR.childNodes[0].textContent = 'R';
        sysSelect.childNodes[0].textContent = 'SELECT';
        sysStart.childNodes[0].textContent = 'START';
    }
}

if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });
    // Init default
    applyTheme(themeSelector.value);
}
"""

content += "\n" + theme_logic

with open('public/controller.js', 'w') as f:
    f.write(content)

