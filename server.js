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

// Generate random PIN for this session
const SERVER_PIN = Math.floor(1000 + Math.random() * 9000).toString();
console.log(`[AUTH] SERVER_PIN:${SERVER_PIN}`); // Used by main.js to parse the PIN

// Map frontend buttons to evdev/vgamepad BTN codes
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
    'btn-ff': 'BTN_TR2'
};

const handleWsConnection = (ws) => {
    console.log('Client connected! Waiting for authentication...');
    let isAuthenticated = false;
    let joystickProc = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Authentication layer
            if (!isAuthenticated) {
                if (data.type === 'auth') {
                    if (data.pin === SERVER_PIN) {
                        isAuthenticated = true;
                        console.log('Client authenticated successfully! Spawning virtual joystick for this client...');
                        ws.send(JSON.stringify({ type: 'auth_success' }));
                        
                        // Spawn joystick process specifically for this connection
                        const baseDir = __dirname.replace('app.asar', 'app.asar.unpacked');
                        let binaryName = 'virtual_joystick';
                        if (os.platform() === 'win32') binaryName += '.exe';
                        const binaryPath = path.join(baseDir, 'dist', binaryName);
                        
                        joystickProc = spawn(binaryPath, []);
                        joystickProc.on('error', (err) => console.error(`Joystick spawn error:`, err));
                        joystickProc.stderr.on('data', (d) => console.error(`Joystick [PID ${joystickProc.pid}] Error: ${d}`));
                        joystickProc.on('close', (c) => console.log(`Joystick [PID ${joystickProc.pid}] exited with code ${c}`));
                        
                    } else {
                        console.log(`Client failed authentication (Provided: ${data.pin}, Expected: ${SERVER_PIN})`);
                        ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid PIN' }));
                    }
                }
                return; // Drop all other messages if not authenticated
            }

            if (!joystickProc) return;
            
            if (data.type === 'button') {
                if (data.button.startsWith('dpad-')) {
                    const isPressed = data.status === 'pressed';
                    let x = 0; let y = 0;
                    if (data.button === 'dpad-up') y = isPressed ? -1 : 0;
                    if (data.button === 'dpad-down') y = isPressed ? 1 : 0;
                    if (data.button === 'dpad-left') x = isPressed ? -1 : 0;
                    if (data.button === 'dpad-right') x = isPressed ? 1 : 0;
                    
                    joystickProc.stdin.write(JSON.stringify({ type: 'dpad', x: x, y: y }) + '\n');
                    return;
                }

                if (data.button === 'btn-ff') {
                    joystickProc.stdin.write(JSON.stringify({ type: 'key', code: 'KEY_TAB', val: data.status === 'pressed' ? 1 : 0 }) + '\n');
                    return;
                }

                const btnCode = buttonMap[data.button];
                if (btnCode) {
                    joystickProc.stdin.write(JSON.stringify({ type: 'button', btn: btnCode, val: data.status === 'pressed' ? 1 : 0 }) + '\n');
                }
            } else if (['analog', 'gyro', 'mouse_move', 'mouse_scroll', 'mouse_click', 'key'].includes(data.type)) {
                joystickProc.stdin.write(JSON.stringify(data) + '\n');
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected.');
        if (joystickProc) {
            joystickProc.kill();
            console.log(`Killed virtual joystick [PID ${joystickProc.pid}] for disconnected client.`);
        }
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
    let localIp = null;
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        if (name.includes('docker') || name.includes('veth') || name.includes('virbr') || name.includes('tailscale') || name.includes('tun') || name.includes('tap') || name.includes('vmware') || name.includes('vboxnet')) {
            continue;
        }
        
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                if (name.startsWith('wlan') || name.startsWith('wlp') || name.startsWith('eth') || name.startsWith('en')) {
                    localIp = iface.address;
                    break;
                }
                if (!localIp) localIp = iface.address;
            }
        }
        if (localIp && (name.startsWith('wlan') || name.startsWith('wlp') || name.startsWith('eth') || name.startsWith('en'))) break;
    }
    
    localIp = localIp || '127.0.0.1';
    const url = `https://${localIp}:${HTTPS_PORT}`;
    const highlight = "\x1b[36m\x1b[1m";
    const reset = "\x1b[0m";
    
    console.log(`PSP Controller HTTPS Server running at ${highlight}${url}${reset}`);
    qrcode.generate(url, {small: true});
    console.log(`PIN Code for connection: ${highlight}${SERVER_PIN}${reset}`);
});
