const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const QRCode = require('qrcode');

let serverProcess = null;

function getLocalIp() {
    let localIp = '127.0.0.1';
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIp = iface.address;
            }
        }
    }
    return localIp;
}

function checkPermissionsAndStart(win) {
    const uinputPath = '/dev/uinput';
    const fs = require('fs');
    try {
        fs.accessSync(uinputPath, fs.constants.W_OK);
        startServer(win);
    } catch (err) {
        // We don't have write access, try pkexec automatically
        win.webContents.on('did-finish-load', () => {
            win.webContents.executeJavaScript(`
                document.getElementById('status').innerText = 'Status: Installing Permissions...';
                document.getElementById('status').style.color = '#ff9800';
                document.getElementById('url').innerText = 'Requesting Permission...';
                document.querySelector('.instructions').innerHTML = \`
                    <b style="color: #ff9800;">One-Time Setup Required:</b><br><br>
                    Please enter your password in the popup to permanently authorize the virtual Xbox controller driver.
                \`;
            `);

            const { exec } = require('child_process');
            const setupCommand = `pkexec bash -c "echo 'KERNEL==\\"uinput\\", MODE=\\"0666\\"' > /etc/udev/rules.d/99-psp-uinput.rules && udevadm control --reload-rules && udevadm trigger && chmod 666 /dev/uinput"`;
            
            exec(setupCommand, (error) => {
                if (error) {
                    win.webContents.executeJavaScript(`
                        document.getElementById('status').innerText = 'Status: Error (Permissions)';
                        document.getElementById('status').style.color = '#f44336';
                        document.getElementById('url').innerText = 'Missing Controller Permissions!';
                        document.querySelector('.instructions').innerHTML = \`
                            <b style="color: #ff9800;">Setup Failed:</b><br><br>
                            Could not acquire permissions automatically.<br>
                            Please run this command in your terminal manually:<br>
                            <code style="background: #333; padding: 4px; border-radius: 4px; display: inline-block; margin-top: 10px;">sudo bash -c "echo 'KERNEL==\\\\\\"uinput\\\\\\", MODE=\\\\\\"0666\\\\\\"' > /etc/udev/rules.d/99-psp-uinput.rules && udevadm control --reload-rules && udevadm trigger && chmod 666 /dev/uinput"</code><br><br>
                            Then restart the app.
                        \`;
                    `).catch(err => console.error("Renderer execute error:", err));
                } else {
                    win.webContents.executeJavaScript(`
                        document.querySelector('.instructions').innerHTML = 'Permissions granted successfully! Starting server...';
                    `).catch(err => console.error("Renderer execute error:", err));
                    setTimeout(() => startServer(win), 1500);
                }
            });
        });
    }
}

function startServer(win) {
    serverProcess = spawn('node', [path.join(__dirname, 'server.js')], { stdio: ['inherit', 'pipe', 'pipe'] });
    
    serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(text); // still output to terminal
        
        const pinMatch = text.match(/\[AUTH\] SERVER_PIN:(\d+)/);
        if (pinMatch && pinMatch[1]) {
            win.webContents.send('server-pin', pinMatch[1]);
        }
    });
    
    serverProcess.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
    });

    win.webContents.on('did-finish-load', async () => {
        const ip = getLocalIp();
        const url = `https://${ip}:3001`;
        try {
            const qrDataUrl = await QRCode.toDataURL(url, { 
                width: 250,
                margin: 2,
                color: { dark: '#000000ff', light: '#ffffffff' } 
            });
            win.webContents.send('server-info', { url, qrDataUrl, status: 'Running' });
        } catch (e) {
            console.error('QR Gen error:', e);
        }
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 600,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: "PSP Controller Server",
        backgroundColor: "#1a1a1a"
    });

    win.loadFile('gui.html');
    checkPermissionsAndStart(win);
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
