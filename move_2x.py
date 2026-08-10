with open('public/index.html', 'r') as f:
    content = f.read()

btn_html = '                <button id="btn-2x" class="sys-btn md-btn" style="margin-left: 5px; padding: 4px 10px; font-size: 10px; font-weight: bold; background: #FF9800; color: #000;">2X SPEED<span class="md-ripple"></span></button>\n'

# Remove from status indicator
content = content.replace(btn_html, '')

# Add beside START
sys_btns_old = """                    <button class="sys-btn md-btn" data-btn="btn-select">SELECT<span class="md-ripple"></span></button>
                    <button class="sys-btn md-btn" data-btn="btn-start">START<span class="md-ripple"></span></button>"""

sys_btns_new = """                    <button class="sys-btn md-btn" data-btn="btn-select">SELECT<span class="md-ripple"></span></button>
                    <button class="sys-btn md-btn" data-btn="btn-start">START<span class="md-ripple"></span></button>
                    <button id="btn-2x" class="sys-btn md-btn" style="margin-left: 10px; font-weight: bold; background: #FF9800; color: #000;">2X<span class="md-ripple"></span></button>"""

content = content.replace(sys_btns_old, sys_btns_new)

with open('public/index.html', 'w') as f:
    f.write(content)
