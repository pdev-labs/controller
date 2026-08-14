const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const qrcode = require('qrcode-terminal');

const app = express();

app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

const httpServer = http.createServer(app);

const httpsServer = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
}, app);

app.get('/ping', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send('psp-controller');
});

const wssHttp = new WebSocket.Server({ server: httpServer });
const wssHttps = new WebSocket.Server({ server: httpsServer });

// Spawn the Python virtual joystick script
let joystickProc = null;
try {
    const baseDir = __dirname.replace('app.asar', 'app.asar.unpacked');
    let binaryName = 'virtual_joystick';
    if (os.platform() === 'win32') {
        binaryName += '.exe';
    }
    const binaryPath = path.join(baseDir, 'dist', binaryName);
    joystickProc = spawn(binaryPath, []);
    
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
    'btn-thumbr': 'BTN_THUMBR',
    'btn-ff': 'BTN_TR2',
    // We map DPAD to DPAD events, but if they are sent as buttons:
    // actually, in controller.js DPAD buttons use these names, so we'll handle them specially.
};

const handleWsConnection = (ws) => {
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

                // Fast forward mapped to TAB key
                if (data.button === 'btn-ff') {
                    joystickProc.stdin.write(JSON.stringify({
                        type: 'key',
                        code: 'KEY_TAB',
                        val: data.status === 'pressed' ? 1 : 0
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
};

wssHttp.on('connection', handleWsConnection);
wssHttps.on('connection', handleWsConnection);

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = PORT + 1;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Server running on port ${PORT}`);
});

httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    let localIp = '127.0.0.1';
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIp = iface.address;
            }
        }
    }
    const url = `https://${localIp}:${HTTPS_PORT}`;
    const highlight = "\x1b[36m\x1b[1m";
    const reset = "\x1b[0m";
    
    console.log(`PSP Controller HTTPS Server running at ${highlight}${url}${reset}`);
    console.log(`Scan the QR code below to connect from your phone browser:\n`);
    qrcode.generate(url, {small: true});
    console.log(`\nNote: Accept the "Your connection is not private" warning since we use a self-signed certificate for Gyro support.`);
    console.log(`Virtual Xbox 360 Controller is ACTIVE!`);
});
