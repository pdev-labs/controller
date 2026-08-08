const express = require('express');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const server = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
}, app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

// Spawn the Python virtual joystick script
let joystickProc = null;
try {
    const scriptPath = path.join(__dirname, 'virtual_joystick.py');
    // Using the python virtual environment where evdev is installed
    joystickProc = spawn(path.join(__dirname, 'venv', 'bin', 'python'), [scriptPath]);
    
    joystickProc.stderr.on('data', (data) => {
        console.error(`Joystick Error: ${data}`);
    });
    
    joystickProc.on('close', (code) => {
        console.log(`Joystick process exited with code ${code}`);
    });
} catch (e) {
    console.error("Failed to start virtual joystick process", e);
}

// Map frontend buttons to evdev BTN codes
const buttonMap = {
    'btn-cross': 'BTN_A',
    'btn-circle': 'BTN_B',
    'btn-square': 'BTN_X',
    'btn-triangle': 'BTN_Y',
    'btn-l': 'BTN_TL',
    'btn-r': 'BTN_TR',
    'btn-start': 'BTN_START',
    'btn-select': 'BTN_SELECT',
    // We map DPAD to DPAD events, but if they are sent as buttons:
    // actually, in controller.js DPAD buttons use these names, so we'll handle them specially.
};

wss.on('connection', (ws) => {
    console.log('Controller connected!');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!joystickProc) return;
            
            if (data.type === 'button') {
                // Check if it's a dpad button
                if (data.button.startsWith('dpad-')) {
                    const isPressed = data.status === 'pressed';
                    let x = 0; let y = 0;
                    if (data.button === 'dpad-up') y = isPressed ? -1 : 0;
                    if (data.button === 'dpad-down') y = isPressed ? 1 : 0;
                    if (data.button === 'dpad-left') x = isPressed ? -1 : 0;
                    if (data.button === 'dpad-right') x = isPressed ? 1 : 0;
                    
                    joystickProc.stdin.write(JSON.stringify({
                        type: 'dpad',
                        x: x,
                        y: y
                    }) + '\n');
                    return;
                }

                // Normal buttons
                const btnCode = buttonMap[data.button];
                if (btnCode) {
                    joystickProc.stdin.write(JSON.stringify({
                        type: 'button',
                        btn: btnCode,
                        val: data.status === 'pressed' ? 1 : 0
                    }) + '\n');
                }
            } else if (data.type === 'automap') {
                // Automap is no longer needed because it's a real Xbox 360 controller now!
                // PPSSPP automatically maps Xbox 360 controllers out of the box.
                ws.send(JSON.stringify({ type: 'automap_success' }));
            } else if (data.type === 'analog') {
                joystickProc.stdin.write(JSON.stringify({
                    type: 'analog',
                    x: data.x,
                    y: data.y
                }) + '\n');
            } else if (data.type === 'gyro') {
                joystickProc.stdin.write(JSON.stringify({
                    type: 'gyro',
                    x: data.x,
                    y: data.y
                }) + '\n');
            } else if (data.type === 'mouse_move') {
                joystickProc.stdin.write(JSON.stringify({
                    type: 'mouse_move',
                    dx: data.dx,
                    dy: data.dy
                }) + '\n');
            } else if (data.type === 'mouse_scroll') {
                joystickProc.stdin.write(JSON.stringify({
                    type: 'mouse_scroll',
                    dy: data.dy
                }) + '\n');
            } else if (data.type === 'mouse_click') {
                joystickProc.stdin.write(JSON.stringify({
                    type: 'mouse_click',
                    btn: data.btn,
                    val: data.val
                }) + '\n');
            } else if (data.type === 'key') {
                joystickProc.stdin.write(JSON.stringify({
                    type: 'key',
                    code: data.code,
                    val: data.val
                }) + '\n');
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Controller disconnected.');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`PSP Controller Server running at https://0.0.0.0:${PORT}`);
    console.log(`Open https://<YOUR-LOCAL-IP>:${PORT} on your mobile browser.`);
    console.log(`Note: Accept the "Your connection is not private" warning since we use a self-signed certificate for Gyro support.`);
    console.log(`Virtual Xbox 360 Controller is ACTIVE!`);
});
