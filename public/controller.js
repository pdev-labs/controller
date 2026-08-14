
// Custom Alert Implementation
function showCustomAlert(message) {
    const alertModal = document.getElementById('alert-modal');
    const alertMsg = document.getElementById('alert-message');
    const alertBtn = document.getElementById('alert-ok-btn');
    if (alertModal && alertMsg && alertBtn) {
        alertMsg.innerText = message;
        alertModal.classList.remove('hidden');
        alertBtn.onclick = () => alertModal.classList.add('hidden');
    } else {
        console.warn("Alert:", message);
    }
}

// --- HAPTICS & 2X BUTTON ---
let isVibrationEnabled = true;
const vibToggleBtn = document.getElementById('vibration-toggle-btn');
if (vibToggleBtn) {
    vibToggleBtn.addEventListener('click', (e) => {
        isVibrationEnabled = !isVibrationEnabled;
        if (isVibrationEnabled) {
            vibToggleBtn.style.opacity = '1';
            triggerVibration();
        } else {
            vibToggleBtn.style.opacity = '0.5';
        }
    });
}

function triggerVibration(duration = 40) {
    const isVibEnabled = (localStorage.getItem('vibrationEnabled') !== 'false');
    if (isVibEnabled && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

const btn2x = document.getElementById('btn-2x');
if (btn2x) {
    btn2x.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn2x.classList.add('active');
        triggerVibration();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'key', code: 'KEY_TAB', val: 1 }));
        }
    });
    
    btn2x.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn2x.classList.remove('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'key', code: 'KEY_TAB', val: 0 }));
        }
    });
    
    btn2x.addEventListener('touchcancel', (e) => {
        btn2x.classList.remove('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'key', code: 'KEY_TAB', val: 0 }));
        }
    });
}
// ----------------------------
const overlay = document.getElementById('overlay');
const connectBtn = document.getElementById('connect-btn');
const statusDot = document.getElementById('connection-status');

// Edit Mode Variables
let isEditMode = false;
const editLayoutBtn = document.getElementById('edit-layout-btn');
const editUi = document.getElementById('edit-ui');
const resetLayoutBtn = document.getElementById('reset-layout-btn');
const saveLayoutBtn = document.getElementById('save-layout-btn');
const exportLayoutBtn = document.getElementById('export-layout-btn');
const importLayoutBtn = document.getElementById('import-layout-btn');
const importInput = document.getElementById('import-input');
const scaleSlider = document.getElementById('scale-slider');
const draggableGroups = document.querySelectorAll('.draggable-group');

let selectedGroup = null;
let isDragging = false;
let dragStartX = 0; let dragStartY = 0;
let initialX = 0; let initialY = 0;

let ws;

// Prevent default context menu and multi-touch zooming
document.addEventListener('contextmenu', event => event.preventDefault());

// Capacitor APK Logic
let isCapacitor = false;
try {
    if (typeof window !== 'undefined' && window.Capacitor) {
        isCapacitor = true;
    }
} catch (e) {
    console.error(e);
}

async function setOrientation(type) {
    try {
        if (isCapacitor && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
            if (type === 'landscape') {
                await window.Capacitor.Plugins.StatusBar.hide();
            } else {
                await window.Capacitor.Plugins.StatusBar.show();
            }
        }
        
        if (typeof AndroidNative !== 'undefined') {
            if (type === 'landscape') AndroidNative.setLandscape();
            else AndroidNative.setPortrait();
            return;
        }
        
        if (isCapacitor && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenOrientation) {
            await window.Capacitor.Plugins.ScreenOrientation.lock({ type: type });
        } else if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock(type === 'landscape' ? 'landscape-primary' : 'portrait-primary');
        } else if (screen.lockOrientation) {
            screen.lockOrientation(type === 'landscape' ? 'landscape-primary' : 'portrait-primary');
        } else if (screen.mozLockOrientation) {
            screen.mozLockOrientation(type === 'landscape' ? 'landscape-primary' : 'portrait-primary');
        } else if (screen.msLockOrientation) {
            screen.msLockOrientation(type === 'landscape' ? 'landscape-primary' : 'portrait-primary');
        }
    } catch (e) {
        console.log("Orientation lock error:", e);
    }
}

// Default to portrait on Home Screen
setOrientation('portrait');

const apkIpContainer = document.getElementById('apk-ip-container');
const apkIpInput = document.getElementById('apk-ip-input');

if (isCapacitor && apkIpContainer && apkIpInput) {
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.style.display = 'none';
    apkIpContainer.style.display = 'flex';
    const savedIp = localStorage.getItem('pc-ip');
    if (savedIp) {
        apkIpInput.value = savedIp;
    }
}

connectBtn.addEventListener('click', () => {
    if (isCapacitor && apkIpInput) {
        const ip = apkIpInput.value.trim();
        if (!ip) {
            showCustomAlert('Please enter your PC IP address');
            return;
        }
        localStorage.setItem('pc-ip', ip);
    }
    connectWebSocket();
});

// QR Code Scanner Logic
const scanQrBtn = document.getElementById('scan-qr-btn');
const cancelQrBtn = document.getElementById('cancel-qr-btn');
const qrReaderContainer = document.getElementById('qr-reader-container');
let html5QrcodeScanner = null;

if (scanQrBtn) {
    scanQrBtn.addEventListener('click', () => {
        apkIpContainer.style.display = 'none';
        qrReaderContainer.style.display = 'flex';
        
        if (!html5QrcodeScanner) {
            html5QrcodeScanner = new Html5Qrcode("qr-reader");
        }
        
        html5QrcodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText, decodedResult) => {
                // QR code usually has format: https://192.168.1.5:3000
                html5QrcodeScanner.stop();
                qrReaderContainer.style.display = 'none';
                apkIpContainer.style.display = 'flex';
                
                try {
                    const url = new URL(decodedText);
                    apkIpInput.value = url.hostname;
                    connectBtn.click();
                } catch(e) {
                    apkIpInput.value = decodedText;
                }
            },
            (errorMessage) => {
                // parse error, ignore
            }
        ).catch((err) => {
            showCustomAlert("Camera error: " + err);
            qrReaderContainer.style.display = 'none';
            apkIpContainer.style.display = 'flex';
        });
    });
}

if (cancelQrBtn) {
    cancelQrBtn.addEventListener('click', () => {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().catch(e => console.log(e));
        }
        qrReaderContainer.style.display = 'none';
        apkIpContainer.style.display = 'flex';
    });
}

// Auto-Detect Logic
const autoDetectBtn = document.getElementById('auto-detect-btn');
if (autoDetectBtn) {
    autoDetectBtn.addEventListener('click', async () => {
        autoDetectBtn.innerText = 'Scanning...';
        autoDetectBtn.disabled = true;
        
        // Dynamically get the device's actual local subnet
        let subnets = ['10.224.15.', '192.168.1.', '192.168.0.', '192.168.29.', '10.0.0.', '172.16.0.', '172.20.10.'];
        if (window.networkinterface) {
            try {
                const ipInfo = await new Promise((resolve, reject) => {
                    networkinterface.getWiFiIPAddress(resolve, reject);
                });
                if (ipInfo && ipInfo.ip) {
                    const parts = ipInfo.ip.split('.');
                    if (parts.length === 4) {
                        const dynamicSubnet = `${parts[0]}.${parts[1]}.${parts[2]}.`;
                        subnets = [dynamicSubnet, ...subnets.filter(s => s !== dynamicSubnet)];
                    }
                }
            } catch (err) {
                console.log('IP extraction failed:', err);
            }
        }
        
        // Scan staggered to prevent overwhelming the browser's connection limit and ARP queue
        const scanSubnet = async (subnet) => {
            autoDetectBtn.innerText = `Scanning ${subnet}x...`;
            return new Promise((resolve) => {
                let pending = 254;
                let found = false;
                
                for (let i = 1; i < 255; i++) {
                    // Stagger each request by 15ms (takes ~3.8s to dispatch all 254)
                    setTimeout(() => {
                        if (found) return;
                        const ip = subnet + i;
                        fetch(`http://${ip}:3000/ping`, { signal: AbortSignal.timeout(3000) })
                        .then(r => r.text())
                        .then(t => {
                            if (t === 'psp-controller' && !found) {
                                found = true;
                                resolve(ip);
                            }
                        })
                        .catch(() => {})
                        .finally(() => {
                            pending--;
                            if (pending === 0 && !found) {
                                resolve(null);
                            }
                        });
                    }, i * 15);
                }
            });
        };

        let foundIp = null;
        for (const subnet of subnets) {
            foundIp = await scanSubnet(subnet);
            if (foundIp) break;
        }

        if (foundIp) {
            apkIpInput.value = foundIp;
            autoDetectBtn.innerText = 'Found PC!';
            setTimeout(() => { connectBtn.click(); }, 500);
        } else {
            autoDetectBtn.innerText = 'Not Found';
        }
        
        setTimeout(() => { 
            autoDetectBtn.innerText = 'Auto-Detect'; 
            autoDetectBtn.disabled = false; 
        }, 3000);
    });
}

const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => console.log(err));
            }
        }
    });
}

// PIN Auth UI Logic
const pinModal = document.getElementById('pin-modal');
const pinInput = document.getElementById('pin-input');
const pinSubmit = document.getElementById('pin-submit-btn');
const pinCancel = document.getElementById('pin-cancel-btn');

function showPinModal(hasError = false) {
    if (hasError) {
        pinInput.style.borderColor = '#f44336';
        pinInput.value = '';
        pinInput.placeholder = 'INVALID';
        setTimeout(() => {
            pinInput.style.borderColor = 'var(--md-primary)';
            pinInput.placeholder = '0000';
        }, 2000);
    }
    pinModal.classList.remove('hidden');
    pinInput.focus();
}

function hidePinModal() {
    pinModal.classList.add('hidden');
}

if (pinSubmit) {
    pinSubmit.addEventListener('click', () => {
        const pin = pinInput.value.trim();
        if (pin.length === 4) {
            localStorage.setItem('auth-pin', pin);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'auth', pin: pin }));
            }
        }
    });
}
if (pinCancel) {
    pinCancel.addEventListener('click', () => {
        hidePinModal();
        if (ws) ws.close(); // Cancel connection
    });
}

function connectWebSocket() {
    let host = window.location.hostname;
    let port = isCapacitor ? '3000' : (window.location.port || '3001');
    
    if (isCapacitor) {
        const savedIp = localStorage.getItem('pc-ip');
        if (savedIp) {
            try {
                const url = new URL(savedIp.includes('://') ? savedIp : 'http://' + savedIp);
                host = url.hostname;
            } catch(e) {
                host = savedIp;
            }
        }
    }
    
    // If it's a native app, we use ws://
    // If we're serving HTTPS locally on browser, we use wss
    const protocol = isCapacitor ? 'ws' : (window.location.protocol === 'https:' ? 'wss' : 'ws');
    ws = new WebSocket(`${protocol}://${host}:${port}`);

    ws.onopen = () => {
        // Authenticate immediately
        const savedPin = localStorage.getItem('auth-pin');
        if (savedPin) {
            ws.send(JSON.stringify({ type: 'auth', pin: savedPin }));
        } else {
            showPinModal();
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'auth_error') {
                localStorage.removeItem('auth-pin');
                showPinModal(true);
            } else if (data.type === 'auth_success') {
                hidePinModal();
                
                // Update UI state to connected
                document.querySelectorAll('.status-dot').forEach(el => {
                    el.classList.remove('disconnected');
                    el.classList.add('connected');
                });
                document.querySelectorAll('.tb-status span:first-of-type').forEach(el => {
                    el.textContent = host;
                });
                document.querySelectorAll('.tb-status span.status-offline').forEach(el => {
                    el.textContent = '[online]';
                    el.style.color = '#4CAF50';
                });
            }
        } catch(e) {}
    };

    ws.onclose = () => {
        document.querySelectorAll('.status-dot').forEach(el => {
            el.classList.remove('connected');
            el.classList.add('disconnected');
        });
        document.querySelectorAll('.tb-status span:first-of-type').forEach(el => {
            el.textContent = 'No Host';
        });
        document.querySelectorAll('.tb-status span.status-offline').forEach(el => {
            el.textContent = '[offline]';
            el.style.color = '#888';
        });
        setTimeout(connectWebSocket, 2000); // Reconnect
    };
    
    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        if (isCapacitor && !window.hasAlertedWsError) {
            window.hasAlertedWsError = true;
            showCustomAlert(`Connection failed to ${protocol}://${host}:${port}\nMake sure port ${port} is open on your PC firewall and you are on the same Wi-Fi.`);
            setTimeout(() => { window.hasAlertedWsError = false; }, 10000);
        }
    };
}

function sendInput(buttonId, status) {
    if (isEditMode) return; // Disable inputs while editing
    if (status === 'pressed') {
        triggerVibration();
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'button',
            button: buttonId,
            status: status
        }));
    }
}

// Button Mapping and Events
const buttons = document.querySelectorAll('[data-btn]');

function bindInputs(btn) {
    btn.addEventListener('mousedown', (e) => {
        btn.classList.add('active');
        sendInput(btn.dataset.btn, 'pressed');
    });
    btn.addEventListener('mouseup', (e) => {
        btn.classList.remove('active');
        sendInput(btn.dataset.btn, 'released');
    });
    btn.addEventListener('mouseleave', (e) => {
        if(btn.classList.contains('active')) {
            btn.classList.remove('active');
            sendInput(btn.dataset.btn, 'released');
        }
    });

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('active');
        sendInput(btn.dataset.btn, 'pressed');
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        sendInput(btn.dataset.btn, 'released');
    });
    btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        sendInput(btn.dataset.btn, 'released');
    });
}
buttons.forEach(bindInputs);

// Basic Analog Stick Visuals (Not sending precise analog data yet)
let isAnalogActive = false;
let analogCenter = { x: 0, y: 0 };
let stickMaxRadius = 25; // max movement from center
let analogTouchId = null;

function bindAnalogEvents(container) {
    const analogStick = container.querySelector('.analog-stick');
    if (!analogStick) return;

    container.addEventListener('touchstart', (e) => {
        if (isEditMode) return;
        e.preventDefault();
        if (isAnalogActive) return;

        const touch = e.changedTouches[0];
        analogTouchId = touch.identifier;
        isAnalogActive = true;
        
        const rect = container.getBoundingClientRect();
        analogCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        moveStick(touch.clientX, touch.clientY, analogStick);
    });

    container.addEventListener('touchmove', (e) => {
        if (!isAnalogActive) return;
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === analogTouchId) {
                moveStick(e.changedTouches[i].clientX, e.changedTouches[i].clientY, analogStick);
                break;
            }
        }
    });

    function stopAnalog(e) {
        if (!isAnalogActive) return;
        let isOurTouch = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === analogTouchId) {
                isOurTouch = true;
                break;
            }
        }
        if (!isOurTouch) return;

        isAnalogActive = false;
        analogTouchId = null;
        analogStick.style.transform = `translate(0px, 0px)`;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'analog',
                x: 0,
                y: 0
            }));
        }
    }

    container.addEventListener('touchend', stopAnalog);
    container.addEventListener('touchcancel', stopAnalog);
}

document.addEventListener('touchmove', (e) => {
    if (!isAnalogActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === analogTouchId) {
            e.preventDefault();
            break;
        }
    }
}, { passive: false });

const initialAnalogs = document.querySelectorAll('.analog-stick-container');
initialAnalogs.forEach(bindAnalogEvents);
function moveStick(clientX, clientY, stickElement) {
    let dx = clientX - analogCenter.x;
    let dy = clientY - analogCenter.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > stickMaxRadius) {
        let ratio = stickMaxRadius / distance;
        dx *= ratio;
        dy *= ratio;
    }
    
    // Normalize -1.0 to 1.0
    let nx = dx / stickMaxRadius;
    let ny = dy / stickMaxRadius;

    if (stickElement) stickElement.style.transform = `translate(${dx}px, ${dy}px)`;

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'analog',
            x: nx,
            y: ny
        }));
    }
}

// ================= GYRO LOGIC =================

const gyroBtn = document.getElementById('gyro-btn');
let isGyroActive = false;
let gyroCenter = null;
let maxTilt = 30; // 30 degrees tilt for max axis

if (gyroBtn) {
    gyroBtn.addEventListener('click', async () => {
        if (!isGyroActive) {
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission !== 'granted') {
                        showCustomAlert('Gyro permission denied!');
                        return;
                    }
                } catch (err) {
                    console.error('Error requesting device orientation permission:', err);
                }
            }
            
            isGyroActive = true;
            gyroBtn.innerHTML = 'GYRO ON<span class="md-ripple"></span>';
            gyroBtn.classList.add('active');
            gyroCenter = null; // Calibrate on next frame
            
            setTimeout(() => {
                if (gyroCenter === null) {
                    showCustomAlert("ERROR: No Gyroscope data received!\n\n1. Check if your phone has a gyro.\n2. If using Chrome on Android, you may need to enable sensors in Site Settings.");
                }
            }, 2000);
            
            window.addEventListener('deviceorientation', handleGyro);
        } else {
            isGyroActive = false;
            gyroBtn.innerHTML = 'GYRO OFF<span class="md-ripple"></span>';
            gyroBtn.classList.remove('active');
            window.removeEventListener('deviceorientation', handleGyro);
            
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'gyro', x: 0, y: 0 }));
            }
        }
    });
}

function handleGyro(event) {
    if (!isGyroActive || isEditMode) return;
    
    if (event.beta === null || event.gamma === null) return;
    
    if (gyroCenter === null) {
        gyroCenter = { beta: event.beta, gamma: event.gamma };
        return;
    }
    
    // In landscape orientation, tilt forward/backward is usually gamma, left/right is beta.
    // We'll normalize standard beta (X-axis tilt) and gamma (Y-axis tilt).
    // The exact mapping depends on device orientation (landscape-primary vs portrait).
    // Let's assume standard landscape holding.
    let deltaBeta = event.beta - gyroCenter.beta;
    let deltaGamma = event.gamma - gyroCenter.gamma;
    
    // Clamp to -1.0 to 1.0 range based on max tilt
    let nx = Math.max(-1, Math.min(1, deltaBeta / maxTilt));
    let ny = Math.max(-1, Math.min(1, deltaGamma / maxTilt));
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'gyro',
            x: nx,
            y: ny
        }));
    }
}

// ================= OLD LAYOUT EDITING LOGIC REMOVED =================

// ================= MODE SELECTION LOGIC =================
const cycleModeBtn = document.getElementById('cycle-mode-btn');
const launchModeBtn = document.getElementById('launch-mode-btn');
const launchModeText = document.getElementById('launch-mode-text');
const modeContainers = document.querySelectorAll('.mode-container');

const modes = ['gamepad-mode', 'trackpad-mode', 'keyboard-mode'];
const modeLabels = ['Launch Gamepad', 'Launch Touchpad', 'Launch Keyboard'];
let currentModeIndex = 0;
let activeMode = 'gamepad-mode';

if (cycleModeBtn && launchModeBtn) {
    cycleModeBtn.addEventListener('click', () => {
        currentModeIndex = (currentModeIndex + 1) % modes.length;
        activeMode = modes[currentModeIndex];
        launchModeText.innerText = modeLabels[currentModeIndex];
    });

    launchModeBtn.addEventListener('click', () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        }
        
        setOrientation('landscape');
        
        overlay.style.display = 'none';
        
        modeContainers.forEach(c => {
            if(c.id === activeMode) c.classList.remove('hidden');
            else c.classList.add('hidden');
        });
    });
}

// Top Bar Close Buttons
const closeGamepadBtn = document.getElementById('close-gamepad-btn');
const closeTrackpadBtn = document.getElementById('close-trackpad-btn');
const closeKeyboardBtn = document.getElementById('close-keyboard-btn');

function switchMode(newMode) {
    modeContainers.forEach(c => {
        if(c.id === newMode) {
            c.classList.remove('hidden');
            c.classList.add('active');
            activeMode = newMode;
        } else {
            c.classList.add('hidden');
            c.classList.remove('active');
        }
    });
}

function cycleMode(currentMode) {
    if (currentMode === 'mouse') switchMode('gamepad-mode');
    else if (currentMode === 'gamepad') switchMode('keyboard-mode');
    else if (currentMode === 'keyboard') switchMode('trackpad-mode');
}

document.getElementById('cycle-mode-trackpad')?.addEventListener('click', () => cycleMode('mouse'));
document.getElementById('cycle-mode-gamepad')?.addEventListener('click', () => cycleMode('gamepad'));
document.getElementById('cycle-mode-keyboard')?.addEventListener('click', () => cycleMode('keyboard'));

function closeToHome() {
    overlay.style.display = 'flex';
    setOrientation('portrait');
}
if (closeGamepadBtn) closeGamepadBtn.addEventListener('click', closeToHome);
if (closeTrackpadBtn) closeTrackpadBtn.addEventListener('click', closeToHome);
if (closeKeyboardBtn) closeKeyboardBtn.addEventListener('click', closeToHome);

// ================= TRACKPAD LOGIC =================
const trackpadSurface = document.getElementById('trackpad-surface');
let trackpadActiveTouches = 0;
let lastTouchX = 0, lastTouchY = 0;
let trackpadTouchStart = 0;
let isScrolling = false;
let hasMoved = false;
let scrollAccumulator = 0;

trackpadSurface.addEventListener('touchstart', (e) => {
    e.preventDefault();
    trackpadActiveTouches = e.touches.length;
    trackpadTouchStart = Date.now();
    hasMoved = false;
    isScrolling = trackpadActiveTouches === 2;
    
    // Average position of all touches
    let avgX = 0, avgY = 0;
    for(let i=0; i<e.touches.length; i++) {
        avgX += e.touches[i].clientX;
        avgY += e.touches[i].clientY;
    }
    lastTouchX = avgX / e.touches.length;
    lastTouchY = avgY / e.touches.length;
});

trackpadSurface.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (trackpadActiveTouches === 0) return;
    hasMoved = true;
    
    let avgX = 0, avgY = 0;
    for(let i=0; i<e.touches.length; i++) {
        avgX += e.touches[i].clientX;
        avgY += e.touches[i].clientY;
    }
    avgX /= e.touches.length;
    avgY /= e.touches.length;
    
    let dx = avgX - lastTouchX;
    let dy = avgY - lastTouchY;
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        if (trackpadActiveTouches === 1) {
            // Mouse Move
            ws.send(JSON.stringify({ type: 'mouse_move', dx: dx * 1.5, dy: dy * 1.5 }));
        } else if (trackpadActiveTouches === 2) {
            // Mouse Scroll
            scrollAccumulator -= dy;
            if (Math.abs(scrollAccumulator) > 15) {
                let scrollVal = scrollAccumulator > 0 ? 1 : -1;
                ws.send(JSON.stringify({ type: 'mouse_scroll', dy: scrollVal }));
                scrollAccumulator = 0;
            }
        }
    }
    
    lastTouchX = avgX;
    lastTouchY = avgY;
});

trackpadSurface.addEventListener('touchend', (e) => {
    e.preventDefault();
    const duration = Date.now() - trackpadTouchStart;
    
    if (!hasMoved && duration < 300) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            if (trackpadActiveTouches === 1) {
                // Left Click
                ws.send(JSON.stringify({ type: 'mouse_click', btn: 'left', val: 1 }));
                setTimeout(() => ws.send(JSON.stringify({ type: 'mouse_click', btn: 'left', val: 0 })), 50);
            } else if (trackpadActiveTouches === 2) {
                // Right Click
                ws.send(JSON.stringify({ type: 'mouse_click', btn: 'right', val: 1 }));
                setTimeout(() => ws.send(JSON.stringify({ type: 'mouse_click', btn: 'right', val: 0 })), 50);
            }
        }
    }
    
    trackpadActiveTouches = e.touches.length;
});

// ================= KEYBOARD LOGIC =================
// Old keyboard toggle buttons removed

const hiddenInput = document.getElementById('hidden-keyboard-input');
const keyboardMode = document.getElementById('keyboard-mode');
const trackpadMode = document.getElementById('trackpad-mode');
const vkContainer = document.getElementById('vk-container');

// Build Virtual Keyboard
const vkLayout = [
    // Row 1
    [
        {label: 'Esc', code: 'KEY_ESC', cls: 'accent'}, {cls: 'vk-gap'},
        {label: 'F1', code: 'KEY_F1'}, {label: 'F2', code: 'KEY_F2'}, {label: 'F3', code: 'KEY_F3'}, {label: 'F4', code: 'KEY_F4'}, {cls: 'vk-gap-small'},
        {label: 'F5', code: 'KEY_F5'}, {label: 'F6', code: 'KEY_F6'}, {label: 'F7', code: 'KEY_F7'}, {label: 'F8', code: 'KEY_F8'}, {cls: 'vk-gap-small'},
        {label: 'F9', code: 'KEY_F9'}, {label: 'F10', code: 'KEY_F10'}, {label: 'F11', code: 'KEY_F11'}, {label: 'F12', code: 'KEY_F12'}, {cls: 'vk-gap-small'},
        {label: 'PrtSc', code: 'KEY_SYSRQ', cls: 'special'}, {label: 'ScrLk', code: 'KEY_SCROLLLOCK', cls: 'special'}, {label: 'Pause', code: 'KEY_PAUSE', cls: 'special'}, {cls: 'vk-gap-small'},
        {cls: 'vk-gap-small'}
    ],
    // Row 2
    [
        {label: '~', code: 'KEY_GRAVE'}, {label: '1', code: 'KEY_1'}, {label: '2', code: 'KEY_2'}, {label: '3', code: 'KEY_3'},
        {label: '4', code: 'KEY_4'}, {label: '5', code: 'KEY_5'}, {label: '6', code: 'KEY_6'}, {label: '7', code: 'KEY_7'},
        {label: '8', code: 'KEY_8'}, {label: '9', code: 'KEY_9'}, {label: '0', code: 'KEY_0'}, {label: '-', code: 'KEY_MINUS'},
        {label: '=', code: 'KEY_EQUAL'}, {label: 'Backspace', code: 'KEY_BACKSPACE', cls: 'special wider'}, {cls: 'vk-gap-small'},
        {label: 'Ins', code: 'KEY_INSERT', cls: 'special'}, {label: 'Home', code: 'KEY_HOME', cls: 'special'}, {label: 'PgUp', code: 'KEY_PAGEUP', cls: 'special'}, {cls: 'vk-gap-small'},
        {label: 'Num', code: 'KEY_NUMLOCK', cls: 'special'}, {label: '/', code: 'KEY_KPSLASH', cls: 'special'}, {label: '*', code: 'KEY_KPASTERISK', cls: 'special'}, {label: '-', code: 'KEY_KPMINUS', cls: 'special'}
    ],
    // Row 3
    [
        {label: 'Tab', code: 'KEY_TAB', cls: 'special wide'},
        {label: 'Q', code: 'KEY_Q'}, {label: 'W', code: 'KEY_W'}, {label: 'E', code: 'KEY_E'}, {label: 'R', code: 'KEY_R'},
        {label: 'T', code: 'KEY_T'}, {label: 'Y', code: 'KEY_Y'}, {label: 'U', code: 'KEY_U'}, {label: 'I', code: 'KEY_I'},
        {label: 'O', code: 'KEY_O'}, {label: 'P', code: 'KEY_P'}, {label: '[', code: 'KEY_LEFTBRACE'}, {label: ']', code: 'KEY_RIGHTBRACE'},
        {label: '\\', code: 'KEY_BACKSLASH', cls: 'special wider'}, {cls: 'vk-gap-small'},
        {label: 'Del', code: 'KEY_DELETE', cls: 'special'}, {label: 'End', code: 'KEY_END', cls: 'special'}, {label: 'PgDn', code: 'KEY_PAGEDOWN', cls: 'special'}, {cls: 'vk-gap-small'},
        {label: '7', code: 'KEY_KP7'}, {label: '8', code: 'KEY_KP8'}, {label: '9', code: 'KEY_KP9'}, {label: '+', code: 'KEY_KPPLUS', cls: 'special'}
    ],
    // Row 4
    [
        {label: 'Caps', code: 'KEY_CAPSLOCK', cls: 'special wide'},
        {label: 'A', code: 'KEY_A'}, {label: 'S', code: 'KEY_S'}, {label: 'D', code: 'KEY_D'}, {label: 'F', code: 'KEY_F'},
        {label: 'G', code: 'KEY_G'}, {label: 'H', code: 'KEY_H'}, {label: 'J', code: 'KEY_J'}, {label: 'K', code: 'KEY_K'},
        {label: 'L', code: 'KEY_L'}, {label: ';', code: 'KEY_SEMICOLON'}, {label: '\'', code: 'KEY_APOSTROPHE'},
        {label: 'Enter', code: 'KEY_ENTER', cls: 'accent wider'}, {cls: 'vk-gap-small'},
        {cls: 'vk-gap-empty'}, {cls: 'vk-gap-empty'}, {cls: 'vk-gap-empty'}, {cls: 'vk-gap-small'},
        {label: '4', code: 'KEY_KP4'}, {label: '5', code: 'KEY_KP5'}, {label: '6', code: 'KEY_KP6'}, {label: '', code: '', cls: 'vk-gap-empty'}
    ],
    // Row 5
    [
        {label: 'Shift', code: 'KEY_LEFTSHIFT', cls: 'special wider'},
        {label: 'Z', code: 'KEY_Z'}, {label: 'X', code: 'KEY_X'}, {label: 'C', code: 'KEY_C'}, {label: 'V', code: 'KEY_V'},
        {label: 'B', code: 'KEY_B'}, {label: 'N', code: 'KEY_N'}, {label: 'M', code: 'KEY_M'}, {label: ',', code: 'KEY_COMMA'},
        {label: '.', code: 'KEY_DOT'}, {label: '/', code: 'KEY_SLASH'}, {label: 'Shift', code: 'KEY_RIGHTSHIFT', cls: 'special wide'}, {cls: 'vk-gap-small'},
        {cls: 'vk-gap-empty'}, {label: 'Up', code: 'KEY_UP', cls: 'special'}, {cls: 'vk-gap-empty'}, {cls: 'vk-gap-small'},
        {label: '1', code: 'KEY_KP1'}, {label: '2', code: 'KEY_KP2'}, {label: '3', code: 'KEY_KP3'}, {label: 'Ent', code: 'KEY_KPENTER', cls: 'accent'}
    ],
    // Row 6
    [
        {label: 'Ctrl', code: 'KEY_LEFTCTRL', cls: 'special wide'},
        {label: 'Win', code: 'KEY_LEFTMETA', cls: 'special'},
        {label: 'Alt', code: 'KEY_LEFTALT', cls: 'special wide'},
        {label: 'Space', code: 'KEY_SPACE', cls: 'spacebar'},
        {label: 'Alt', code: 'KEY_RIGHTALT', cls: 'special'},
        {label: 'Win', code: 'KEY_RIGHTMETA', cls: 'special'},
        {label: 'Menu', code: 'KEY_COMPOSE', cls: 'special'},
        {label: 'Ctrl', code: 'KEY_RIGHTCTRL', cls: 'special wide'}, {cls: 'vk-gap-small'},
        {label: 'Left', code: 'KEY_LEFT', cls: 'special'},
        {label: 'Down', code: 'KEY_DOWN', cls: 'special'},
        {label: 'Right', code: 'KEY_RIGHT', cls: 'special'}, {cls: 'vk-gap-small'},
        {label: '0', code: 'KEY_KP0', cls: 'wide'}, {label: '.', code: 'KEY_KPDOT'}, {label: '', code: '', cls: 'vk-gap-empty'}
    ]
];

vkLayout.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'vk-row';
    row.forEach(keyData => {
        const keyBtn = document.createElement('div');
        if (keyData.code === 'gap' || (keyData.cls && keyData.cls.includes('vk-gap'))) {
            keyBtn.className = keyData.cls || 'vk-gap';
        } else {
            keyBtn.className = 'vk-key ' + (keyData.cls || '');
            keyBtn.textContent = keyData.label || '';
            keyBtn.dataset.code = keyData.code || '';
        }
        rowDiv.appendChild(keyBtn);
    });
    vkContainer.appendChild(rowDiv);
});



// Global multi-touch handler for Virtual Keyboard
const vkActiveKeys = new Map();

function sendKeyGlobal(code, val) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'key', code: code, val: val }));
    }
}

function handleVkTouches(e) {
    e.preventDefault();
    const currentTouches = e.touches;
    const currentlyPressed = new Set();
    
    for (let i = 0; i < currentTouches.length; i++) {
        const touch = currentTouches[i];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && el.classList.contains('vk-key')) {
            currentlyPressed.add(el);
        }
    }
    
    // newly pressed
    currentlyPressed.forEach(el => {
        if (!vkActiveKeys.has(el)) {
            vkActiveKeys.set(el, true);
            el.classList.add('active');
            if (kbVibEnabled) triggerVibration();
            playKeySound();
            sendKeyGlobal(el.dataset.code, 1);
        }
    });
    
    // newly released
    vkActiveKeys.forEach((_, el) => {
        if (!currentlyPressed.has(el)) {
            vkActiveKeys.delete(el);
            el.classList.remove('active');
            
            // Toggle indicators on key up (release)
            const code = el.dataset.code;
            if (code === 'KEY_CAPSLOCK') {
                document.getElementById('ind-caps')?.classList.toggle('active');
            } else if (code === 'KEY_NUMLOCK') {
                document.getElementById('ind-num')?.classList.toggle('active');
            } else if (code === 'KEY_SCROLLLOCK') {
                document.getElementById('ind-scr')?.classList.toggle('active');
            }
            
            sendKeyGlobal(code, 0);
        }
    });
}

vkContainer.addEventListener('touchstart', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchmove', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchend', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchcancel', handleVkTouches, {passive: false});

// Make top bar indicators clickable manually
['ind-caps', 'ind-num', 'ind-scr'].forEach(id => {
    const indEl = document.getElementById(id);
    if (indEl) {
        indEl.addEventListener('click', () => {
            indEl.classList.toggle('active');
            if (kbVibEnabled) triggerVibration();
            // Send the virtual key press to sync with the host
            let code = '';
            if (id === 'ind-caps') code = 'KEY_CAPSLOCK';
            if (id === 'ind-num') code = 'KEY_NUMLOCK';
            if (id === 'ind-scr') code = 'KEY_SCROLLLOCK';
            if (code) {
                sendKeyGlobal(code, 1);
                setTimeout(() => sendKeyGlobal(code, 0), 50);
            }
        });
    }
});

// --- Keyboard Sound & Theme Logic ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let keySoundEnabled = true;

function playKeySound() {
    if (!keySoundEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // MX Brown profile
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.03); 
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    
    const bufferSize = audioCtx.sampleRate * 0.05; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 5000;
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    osc.start();
    noise.start();
    
    osc.stop(audioCtx.currentTime + 0.05);
}

const kbSoundToggle = document.getElementById('kb-sound-toggle');
if (kbSoundToggle) {
    kbSoundToggle.addEventListener('click', () => {
        keySoundEnabled = !keySoundEnabled;
        const span = kbSoundToggle.querySelector('span');
        if (keySoundEnabled) {
            span.textContent = "Cherry MX Browns";
            kbSoundToggle.style.opacity = "1";
        } else {
            span.textContent = "Sound Off";
            kbSoundToggle.style.opacity = "0.5";
        }
    });
}

// Keyboard Indicator Toggles
const indicators = document.querySelectorAll('.tb-indicators .ind');
indicators.forEach(ind => {
    ind.addEventListener('click', () => {
        ind.classList.toggle('active');
    });
});

const kbThemeToggle = document.getElementById('kb-theme-toggle');
if (kbThemeToggle) {
    let isLight = false;
    kbThemeToggle.addEventListener('click', () => {
        isLight = !isLight;
        const span = kbThemeToggle.querySelectorAll('span')[1];
        if (isLight) {
            vkContainer.classList.add('vk-light');
            span.textContent = "White";
        } else {
            vkContainer.classList.remove('vk-light');
            span.textContent = "Black";
        }
    });
}

let kbVibEnabled = true;
const kbVibToggle = document.getElementById('kb-vib-toggle');
if (kbVibToggle) {
    kbVibToggle.addEventListener('click', () => {
        kbVibEnabled = !kbVibEnabled;
        const span = kbVibToggle.querySelector('span');
        if (kbVibEnabled) {
            span.textContent = "Vibration On";
            kbVibToggle.style.opacity = "1";
        } else {
            span.textContent = "Vibration Off";
            kbVibToggle.style.opacity = "0.5";
        }
    });
}

// Indicator Toggles
document.querySelectorAll('.tb-indicators .ind').forEach(ind => {
    ind.addEventListener('click', () => {
        ind.classList.toggle('active');
    });
});




// Gamepad Theme Cycling
const btnGamepadTheme = document.getElementById('cycle-gamepad-theme');
if (btnGamepadTheme) {
    let gpThemes = ['xbox', 'playstation', 'snes', 'psp'];
    let gpThemeIdx = 0;
    
    btnGamepadTheme.addEventListener('click', () => {
        gpThemeIdx = (gpThemeIdx + 1) % gpThemes.length;
        const theme = gpThemes[gpThemeIdx];
        const label = btnGamepadTheme.querySelector('span');
        
        if (theme === 'xbox') label.textContent = "Xbox Series";
        else if (theme === 'playstation') label.textContent = "PlayStation";
        else if (theme === 'snes') label.textContent = "SNES";
        else if (theme === 'psp') label.textContent = "PSP";
        
        // Keep settings dropdown in sync if it exists
        if (typeof themeSelector !== 'undefined' && themeSelector) {
            themeSelector.value = theme;
        }
        
        // Use the centralized theme function to update all CSS and layouts
        if (typeof applyTheme === 'function') {
            applyTheme(theme);
        }
    });
}

// Edit Layout Mode
let draggedElement = null;
let dragOffsetX = 0, dragOffsetY = 0;
const tbEditLayoutBtn = document.getElementById('edit-layout-btn-tb');
const gamepadArea = document.querySelector('.gamepad-area');
let selectedElement = null;

if (tbEditLayoutBtn && gamepadArea) {
    tbEditLayoutBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        if (isEditMode) {
            tbEditLayoutBtn.style.color = '#ff9800';
            gamepadArea.classList.add('edit-active');
            editUi?.classList.remove('hidden');
        } else {
            tbEditLayoutBtn.style.color = '';
            gamepadArea.classList.remove('edit-active');
            editUi?.classList.add('hidden');
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement = null;
            }
            saveLayout();
        }
    });
}

function bindDragEvents(el) {
    el.addEventListener('touchstart', e => {
        if (!isEditMode) return;
        draggedElement = el;
        
        // Select logic
        if (selectedElement) selectedElement.classList.remove('selected');
        selectedElement = el;
        selectedElement.classList.add('selected');
        
        // Update slider to current scale
        const currentScale = parseFloat(el.dataset.scale || 1);
        if (scaleSlider) scaleSlider.value = currentScale;

        const touch = e.touches[0];
        const rect = el.getBoundingClientRect();
        
        // Compensate for scale in drag offset
        const scale = parseFloat(el.dataset.scale || 1);
        dragOffsetX = (touch.clientX - rect.left) / scale;
        dragOffsetY = (touch.clientY - rect.top) / scale;
    });
}
const draggables = document.querySelectorAll('.draggable-group');
draggables.forEach(bindDragEvents);

if (gamepadArea) {
    gamepadArea.addEventListener('touchmove', e => {
        if (!isEditMode || !draggedElement) return;
        const touch = e.touches[0];
        const rect = gamepadArea.getBoundingClientRect();
        const scale = parseFloat(draggedElement.dataset.scale || 1);
        
        let x = touch.clientX - rect.left - (dragOffsetX * scale);
        let y = touch.clientY - rect.top - (dragOffsetY * scale);
        
        draggedElement.style.left = x + 'px';
        draggedElement.style.top = y + 'px';
        draggedElement.style.right = 'auto';
        draggedElement.style.bottom = 'auto';
    });

    gamepadArea.addEventListener('touchend', () => {
        draggedElement = null;
    });
}

// Scale Slider logic
if (scaleSlider) {
    scaleSlider.addEventListener('input', (e) => {
        if (selectedElement) {
            const scale = e.target.value;
            selectedElement.dataset.scale = scale;
            selectedElement.style.transform = `scale(${scale})`;
        }
    });
}

// Save/Reset UI logic
document.getElementById('save-layout-btn')?.addEventListener('click', () => {
    if (selectedElement) {
        selectedElement.classList.remove('selected');
        selectedElement = null;
    }
    saveLayout();
    tbEditLayoutBtn?.click(); // toggle edit mode off
});

document.getElementById('reset-layout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('gamepadLayout_v2');
    location.reload(); // Reload window to restore default CSS coordinates
});

function saveLayout() {
    const layout = {};
    draggables.forEach(el => {
        layout[el.id] = { 
            left: el.style.left, 
            top: el.style.top, 
            right: el.style.right, 
            bottom: el.style.bottom,
            scale: el.dataset.scale || 1
        };
    });
    localStorage.setItem('gamepadLayout_v2', JSON.stringify(layout));
}

function loadLayout() {
    const saved = localStorage.getItem('gamepadLayout_v2');
    if (saved) {
        const layout = JSON.parse(saved);
        draggables.forEach(el => {
            if (layout[el.id]) {
                el.style.left = layout[el.id].left;
                el.style.top = layout[el.id].top;
                el.style.right = layout[el.id].right;
                el.style.bottom = layout[el.id].bottom;
                const scale = layout[el.id].scale || 1;
                el.dataset.scale = scale;
                el.style.transform = `scale(${scale})`;
            }
        });
    }
}
loadLayout();

// Settings Modal Logic
const settingsModal = document.getElementById('settings-modal');
const settingIp = document.getElementById('setting-ip');
const settingVib = document.getElementById('setting-vib');

function openSettings() {
    if (settingsModal) {
        settingsModal.classList.remove('hidden');
        settingIp.value = localStorage.getItem('serverIp') || '';
        settingVib.checked = (localStorage.getItem('vibrationEnabled') !== 'false');
    }
}

document.getElementById('gamepad-settings-btn')?.addEventListener('click', openSettings);
document.getElementById('tp-settings-btn')?.addEventListener('click', openSettings);

document.getElementById('close-settings-btn')?.addEventListener('click', () => {
    settingsModal?.classList.add('hidden');
});

document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    const newIp = settingIp.value.trim();
    if (newIp) {
        localStorage.setItem('serverIp', newIp);
    }
    localStorage.setItem('vibrationEnabled', settingVib.checked ? 'true' : 'false');
    // Reload the page to reconnect and apply haptics state globally
    location.reload();
});

// Touchpad Enhancements
document.getElementById('tp-numpad-btn')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.classList.toggle('active');
    btn.style.opacity = btn.classList.contains('active') ? '1' : '0.5';
});

document.getElementById('tp-clickpad-btn')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.classList.toggle('active');
    btn.style.opacity = btn.classList.contains('active') ? '1' : '0.5';
});

const tpSensBtn = document.getElementById('tp-sens-btn');
if (tpSensBtn) {
    let sensValues = ['1.0x', '1.5x', '2.0x', '2.5x'];
    let sensIdx = 2; // default 2.0x
    tpSensBtn.addEventListener('click', () => {
        sensIdx = (sensIdx + 1) % sensValues.length;
        tpSensBtn.querySelector('span').textContent = sensValues[sensIdx];
        // Here we could actually update a sensitivity multiplier variable for the trackpad logic if it existed
    });
}

const tpThemeBtn = document.getElementById('tp-theme-btn');
if (tpThemeBtn) {
    let isTpLight = false;
    tpThemeBtn.addEventListener('click', () => {
        isTpLight = !isTpLight;
        const tpSurface = document.getElementById('trackpad-surface');
        if (isTpLight) {
            tpSurface.classList.add('tp-light');
            tpThemeBtn.querySelector('span').textContent = "White";
        } else {
            tpSurface.classList.remove('tp-light');
            tpThemeBtn.querySelector('span').textContent = "Black";
        }
    });
}

document.getElementById('tp-settings-btn')?.addEventListener('click', () => {
    alert("Touchpad Settings opened.");
});

// Map standard chars to EV_KEY constants
const keyMap = {
    'Backspace': 'KEY_BACKSPACE', 'Enter': 'KEY_ENTER', ' ': 'KEY_SPACE',
    'Tab': 'KEY_TAB', 'Escape': 'KEY_ESC'
};

hiddenInput.addEventListener('keydown', (e) => {
    let keyName = e.key;
    let code = null;
    
    if (keyMap[keyName]) {
        code = keyMap[keyName];
    } else if (keyName.length === 1) {
        code = 'KEY_' + keyName.toUpperCase();
    }
    
    if (code && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'key', code: code, val: 1 }));
        setTimeout(() => ws.send(JSON.stringify({ type: 'key', code: code, val: 0 })), 50);
    }
    
    // Clear input so it doesn't build up a huge string
    setTimeout(() => { hiddenInput.value = ''; }, 10);
});



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
    if (btnL && btnL.childNodes[0]) btnL.childNodes[0].textContent = '';
    if (btnR && btnR.childNodes[0]) btnR.childNodes[0].textContent = '';
    const selectLabel = sysSelect ? sysSelect.querySelector('.sys-label') : null;
    const startLabel = sysStart ? sysStart.querySelector('.sys-label') : null;
    if (selectLabel) selectLabel.textContent = '';
    if (startLabel) startLabel.textContent = '';
    
    if (theme === 'psp') {
        btnCross.innerHTML = '<span style="font-weight: bold; font-size: 20px;">✖</span><span class="md-ripple"></span>';
        btnCircle.innerHTML = '<span style="font-weight: bold; font-size: 24px;">⭘</span><span class="md-ripple"></span>';
        btnSquare.innerHTML = '<span style="font-weight: bold; font-size: 20px;">◼</span><span class="md-ripple"></span>';
        btnTriangle.innerHTML = '<span style="font-weight: bold; font-size: 20px;">▲</span><span class="md-ripple"></span>';
        
        if (btnL && btnL.childNodes[0]) btnL.childNodes[0].textContent = 'L';
        if (btnR && btnR.childNodes[0]) btnR.childNodes[0].textContent = 'R';
        if (selectLabel) selectLabel.textContent = 'SELECT';
        if (startLabel) startLabel.textContent = 'START';
    } else if (theme === 'xbox' || theme === 'xbox-premium') {
        btnCross.innerHTML = '<span style="color:#4CAF50; font-weight: bold; font-size: 20px;">A</span><span class="md-ripple"></span>';
        btnCircle.innerHTML = '<span style="color:#F44336; font-weight: bold; font-size: 20px;">B</span><span class="md-ripple"></span>';
        btnSquare.innerHTML = '<span style="color:#2196F3; font-weight: bold; font-size: 20px;">X</span><span class="md-ripple"></span>';
        btnTriangle.innerHTML = '<span style="color:#FBC02D; font-weight: bold; font-size: 20px;">Y</span><span class="md-ripple"></span>';
    } else if (theme === 'snes') {
        btnCross.innerHTML = '<span style="color:#FFEB3B; font-weight: bold; font-size: 20px;">B</span><span class="md-ripple"></span>';
        btnCircle.innerHTML = '<span style="color:#F44336; font-weight: bold; font-size: 20px;">A</span><span class="md-ripple"></span>';
        btnSquare.innerHTML = '<span style="color:#9E9E9E; font-weight: bold; font-size: 20px;">Y</span><span class="md-ripple"></span>';
        btnTriangle.innerHTML = '<span style="color:#9C27B0; font-weight: bold; font-size: 20px;">X</span><span class="md-ripple"></span>';
        if (selectLabel) selectLabel.textContent = 'SELECT';
        if (startLabel) startLabel.textContent = 'START';
    } else {
        // PS default
        btnCross.innerHTML = '<span style="color:#4CAF50; font-weight: bold; font-size: 20px;">✖</span><span class="md-ripple"></span>';
        btnCircle.innerHTML = '<span style="color:#F44336; font-weight: bold; font-size: 24px;">⭘</span><span class="md-ripple"></span>';
        btnSquare.innerHTML = '<span style="color:#2196F3; font-weight: bold; font-size: 20px;">◼</span><span class="md-ripple"></span>';
        btnTriangle.innerHTML = '<span style="color:#FBC02D; font-weight: bold; font-size: 20px;">▲</span><span class="md-ripple"></span>';
        if (btnL && btnL.childNodes[0]) btnL.childNodes[0].textContent = 'L';
        if (btnR && btnR.childNodes[0]) btnR.childNodes[0].textContent = 'R';
        if (selectLabel) selectLabel.textContent = 'SELECT';
        if (startLabel) startLabel.textContent = 'START';
    }
}

if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });
    // Init default
    applyTheme(themeSelector.value);
}


// Sensitivity logic
const sensSelector = document.getElementById('gyro-sensitivity');
const sensValDisplay = document.getElementById('gyro-sens-val');
if (sensSelector) {
    sensSelector.addEventListener('input', (e) => {
        maxTilt = parseInt(e.target.value, 10);
        if (sensValDisplay) sensValDisplay.textContent = maxTilt;
    });
}

// ================= TRACKPAD LOGIC =================
const trackpadSurface = document.getElementById('trackpad-surface');
let tpActive = false;
let tpTouches = 0;
let tpLastX = 0, tpLastY = 0;
let tpStartTime = 0;
let tpStartX = 0, tpStartY = 0;

if (trackpadSurface) {
    trackpadSurface.addEventListener('touchstart', (e) => {
        tpActive = true;
        tpTouches = e.touches.length;
        tpLastX = e.touches[0].clientX;
        tpLastY = e.touches[0].clientY;
        
        if (tpTouches === 1) {
            tpStartX = tpLastX;
            tpStartY = tpLastY;
            tpStartTime = Date.now();
        }
        e.preventDefault();
    }, {passive: false});

    trackpadSurface.addEventListener('touchmove', (e) => {
        if (!tpActive) return;
        e.preventDefault();
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        
        const dx = currentX - tpLastX;
        const dy = currentY - tpLastY;
        
        tpLastX = currentX;
        tpLastY = currentY;

        if (tpTouches === 1) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                // scale speed by 1.5 for better feel
                ws.send(JSON.stringify({ type: 'mouse_move', dx: dx * 1.5, dy: dy * 1.5 }));
            }
        } else if (tpTouches === 2) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'mouse_scroll', dx: -dx * 0.5, dy: dy * 0.5 }));
            }
        }
    }, {passive: false});

    trackpadSurface.addEventListener('touchend', (e) => {
        if (tpTouches === 1 && Date.now() - tpStartTime < 200) {
            // Tap detected (duration < 200ms, and minimal movement)
            if (Math.abs(tpLastX - tpStartX) < 10 && Math.abs(tpLastY - tpStartY) < 10) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'mouse_click', button: 'left' }));
                    triggerVibration();
                }
            }
        }
        tpActive = false;
        tpTouches = 0;
    });
}
