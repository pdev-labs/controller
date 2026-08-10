import re

with open('public/index.html', 'r') as f:
    content = f.read()

# Add the new theme option
old_theme = '<option value="xbox">Xbox</option>'
new_theme = '<option value="xbox">Xbox</option>\n                    <option value="xbox-premium">Xbox Series Dark</option>'
content = content.replace(old_theme, new_theme)

with open('public/index.html', 'w') as f:
    f.write(content)

with open('public/style.css', 'r') as f:
    css_content = f.read()

new_css = """
/* Theme: Xbox Series Dark (Premium) */
body.theme-xbox-premium {
    background-color: #1f2022;
}
body.theme-xbox-premium .controller-container {
    background-color: transparent;
}
/* Action Buttons */
body.theme-xbox-premium .action-btn {
    background: linear-gradient(145deg, #2a2a2a, #242424);
    box-shadow: 4px 4px 8px #151515, -4px -4px 8px #333333;
    border: none;
    font-weight: 700;
    font-size: 24px;
    color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
}
body.theme-xbox-premium .action-btn svg {
    display: none;
}
body.theme-xbox-premium [data-btn="btn-cross"]::after { content: "A"; color: #4CAF50; position: absolute; }
body.theme-xbox-premium [data-btn="btn-circle"]::after { content: "B"; color: #F44336; position: absolute; }
body.theme-xbox-premium [data-btn="btn-square"]::after { content: "X"; color: #2196F3; position: absolute; }
body.theme-xbox-premium [data-btn="btn-triangle"]::after { content: "Y"; color: #FFEB3B; position: absolute; }

/* Triggers */
body.theme-xbox-premium .trigger-btn {
    background: linear-gradient(145deg, #2a2a2a, #242424);
    box-shadow: 4px 4px 8px #151515, -4px -4px 8px #333333;
    border-radius: 8px;
    width: 100px;
    height: 40px;
    font-weight: 700;
    color: #e0e0e0;
    border: none;
    font-size: 14px;
}
body.theme-xbox-premium .l-btn { color: transparent; }
body.theme-xbox-premium .l-btn::after { content: "LT / LB"; color: #e0e0e0; position: absolute; }
body.theme-xbox-premium .r-btn { color: transparent; }
body.theme-xbox-premium .r-btn::after { content: "RT / RB"; color: #e0e0e0; position: absolute; }

/* D-Pad */
body.theme-xbox-premium .dpad-btn {
    background: #242424;
    border: none;
    box-shadow: inset 2px 2px 5px #1c1c1c, inset -2px -2px 5px #2c2c2c;
    color: #555;
}
body.theme-xbox-premium .dpad {
    background: #1e1e1e;
    border-radius: 12px;
    box-shadow: 4px 4px 8px #151515, -4px -4px 8px #333333;
    padding: 5px;
}

/* Joystick */
body.theme-xbox-premium .analog-stick-container {
    background: #222;
    box-shadow: inset 4px 4px 10px #111, inset -4px -4px 10px #333;
    border: none;
}
body.theme-xbox-premium .analog-stick {
    background: radial-gradient(circle, #2a2a2a 40%, #151515 100%);
    box-shadow: 2px 2px 8px #000;
    border: 1px solid #333;
}

/* Sys Buttons */
body.theme-xbox-premium .sys-btn {
    background: linear-gradient(145deg, #2a2a2a, #242424);
    box-shadow: 2px 2px 5px #151515, -2px -2px 5px #333333;
    border: none;
    color: #bbb;
    border-radius: 20px;
}
body.theme-xbox-premium .sys-btn[data-btn="btn-select"] { color: transparent; }
body.theme-xbox-premium .sys-btn[data-btn="btn-start"] { color: transparent; }
body.theme-xbox-premium .sys-btn[data-btn="btn-select"]::after { content: "VIEW"; color: #bbb; position: absolute; font-size:12px; }
body.theme-xbox-premium .sys-btn[data-btn="btn-start"]::after { content: "MENU"; color: #bbb; position: absolute; font-size:12px; }

"""
css_content += "\n" + new_css

with open('public/style.css', 'w') as f:
    f.write(css_content)

