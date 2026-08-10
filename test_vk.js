const fs = require('fs');
const content = fs.readFileSync('public/controller.js', 'utf8');

// extract vkLayout
const match = content.match(/const vkLayout = \[.*?\];/s);
eval(match[0]); // loads vkLayout array into scope

let output = [];
vkLayout[0].forEach(keyData => {
    let className = '';
    if (keyData.code === 'gap' || (keyData.cls && keyData.cls.includes('vk-gap'))) {
        className = keyData.cls || 'vk-gap';
    } else {
        className = 'vk-key ' + (keyData.cls || '');
    }
    output.push(className);
});
console.log(output.join('\n'));
