
// --- HAPTICS & 2X BUTTON ---
let isVibrationEnabled = true;
const vibToggle = document.getElementById('vibration-toggle');
if (vibToggle) {
    vibToggle.addEventListener('change', (e) => {
        isVibrationEnabled = (e.target.value === 'on');
    });
}

function triggerVibration() {
    if (isVibrationEnabled && navigator.vibrate) {
        navigator.vibrate(40); // 40ms buzz
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
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        isCapacitor = true;
    }
} catch (e) {}

const apkIpContainer = document.getElementById('apk-ip-container');
const apkIpInput = document.getElementById('apk-ip-input');

if (isCapacitor && apkIpContainer && apkIpInput) {
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
            alert('Please enter your PC IP address');
            return;
        }
        localStorage.setItem('pc-ip', ip);
    }
    
    // Request Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    }
    overlay.style.display = 'none';
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
            alert("Camera error: " + err);
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
        autoDetectBtn.innerText = '🔍 Scanning...';
        autoDetectBtn.disabled = true;
        
        // Scan common local subnets concurrently
        const subnets = ['192.168.1.', '192.168.0.', '192.168.29.', '10.0.0.'];
        const promises = [];
        
        for (const subnet of subnets) {
            for (let i = 1; i < 255; i++) {
                const ip = subnet + i;
                promises.push(
                    fetch(`http://${ip}:3000/ping`, { signal: AbortSignal.timeout(3000) })
                    .then(r => r.text())
                    .then(t => {
                        if (t === 'psp-controller') return ip;
                        throw new Error('Not PC');
                    })
                );
            }
        }
        
        try {
            const result = await Promise.any(promises);
            apkIpInput.value = result;
            autoDetectBtn.innerText = '✅ Found PC!';
            setTimeout(() => { connectBtn.click(); }, 500);
        } catch(e) {
            autoDetectBtn.innerText = '❌ Not Found';
        }
        
        setTimeout(() => { 
            autoDetectBtn.innerText = '🔍 Auto-Detect'; 
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

function connectWebSocket() {
    let host = window.location.hostname;
    let port = isCapacitor ? '3000' : (window.location.port || '3001');
    
    if (isCapacitor) {
        const savedIp = localStorage.getItem('pc-ip');
        if (savedIp) {
            host = savedIp;
        }
    }
    
    // If it's a native app, we use ws://
    // If we're serving HTTPS locally on browser, we use wss
    const protocol = isCapacitor ? 'ws' : (window.location.protocol === 'https:' ? 'wss' : 'ws');
    ws = new WebSocket(`${protocol}://${host}:${port}`);

    ws.onopen = () => {
        statusDot.classList.remove('disconnected');
        statusDot.classList.add('connected');
    };

    ws.onmessage = (event) => {
        // Obsolete auto-map handler removed
    };

    ws.onclose = () => {
        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');
        setTimeout(connectWebSocket, 2000); // Reconnect
    };
    
    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
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

buttons.forEach(btn => {
    // Mouse events for testing on PC
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

    // Touch events for Mobile
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // prevent mouse emulation
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
});

// Basic Analog Stick Visuals (Not sending precise analog data yet)
const analogContainer = document.getElementById('analog-container');
const analogStick = document.getElementById('analog-stick');

let isAnalogActive = false;
let analogCenter = { x: 0, y: 0 };
let stickMaxRadius = 25; // max movement from center
let analogTouchId = null;

analogContainer.addEventListener('touchstart', (e) => {
    if (isEditMode) return;
    e.preventDefault();
    if (isAnalogActive) return; // Already active

    // Get the new touch that triggered this event
    const touch = e.changedTouches[0];
    analogTouchId = touch.identifier;
    isAnalogActive = true;
    
    const rect = analogContainer.getBoundingClientRect();
    analogCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
    moveStick(touch.clientX, touch.clientY);
});

analogContainer.addEventListener('touchmove', (e) => {
    if (!isAnalogActive) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === analogTouchId) {
            moveStick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            break;
        }
    }
});

document.addEventListener('touchmove', (e) => {
    if (!isAnalogActive) return;
    // Don't prevent default on the whole document blindly, but we can if we want to stop scrolling
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === analogTouchId) {
            e.preventDefault();
            moveStick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            break;
        }
    }
}, { passive: false });

function stopAnalog(e) {
    if (!isAnalogActive) return;
    // Check if the touch that ended is our analog touch
    let isOurTouch = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === analogTouchId) {
            isOurTouch = true;
            break;
        }
    }
    if (!isOurTouch) return; // Ignore if it's another finger

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

analogContainer.addEventListener('touchend', stopAnalog);
analogContainer.addEventListener('touchcancel', stopAnalog);
document.addEventListener('touchend', stopAnalog);
document.addEventListener('touchcancel', stopAnalog);

function moveStick(clientX, clientY) {
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

    analogStick.style.transform = `translate(${dx}px, ${dy}px)`;

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
                        alert('Gyro permission denied!');
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
                    alert("ERROR: No Gyroscope data received!\n\n1. Check if your phone has a gyro.\n2. If using Chrome on Android, you may need to enable sensors in Site Settings.");
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

// ================= LAYOUT EDITING LOGIC =================

// Load layout from localStorage on boot
function loadLayout() {
    draggableGroups.forEach(group => {
        const saved = localStorage.getItem('layout_' + group.id);
        if (saved) {
            const data = JSON.parse(saved);
            group.dataset.x = data.x;
            group.dataset.y = data.y;
            group.dataset.scale = data.scale;
            group.style.transform = `translate(${data.x}px, ${data.y}px) scale(${data.scale})`;
        } else {
            group.dataset.x = 0;
            group.dataset.y = 0;
            group.dataset.scale = 1;
        }
    });
}
loadLayout();

editLayoutBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    isEditMode = true;
    document.body.classList.add('edit-mode');
    editUi.classList.remove('hidden');
});

resetLayoutBtn.addEventListener('click', () => {
    draggableGroups.forEach(group => {
        localStorage.removeItem('layout_' + group.id);
        group.dataset.x = 0;
        group.dataset.y = 0;
        group.dataset.scale = 1;
        group.style.transform = `translate(0px, 0px) scale(1)`;
    });
    scaleSlider.value = 1;
});

saveLayoutBtn.addEventListener('click', () => {
    draggableGroups.forEach(group => {
        localStorage.setItem('layout_' + group.id, JSON.stringify({
            x: parseFloat(group.dataset.x) || 0,
            y: parseFloat(group.dataset.y) || 0,
            scale: parseFloat(group.dataset.scale) || 1
        }));
        group.classList.remove('selected');
    });
    isEditMode = false;
    document.body.classList.remove('edit-mode');
    editUi.classList.add('hidden');
});

// Export Layout
exportLayoutBtn.addEventListener('click', () => {
    const layoutConfig = {};
    draggableGroups.forEach(group => {
        layoutConfig[group.id] = {
            x: parseFloat(group.dataset.x) || 0,
            y: parseFloat(group.dataset.y) || 0,
            scale: parseFloat(group.dataset.scale) || 1
        };
    });
    const blob = new Blob([JSON.stringify(layoutConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'psp-layout.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Import Layout
importLayoutBtn.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const config = JSON.parse(event.target.result);
            draggableGroups.forEach(group => {
                const data = config[group.id];
                if (data) {
                    group.dataset.x = data.x;
                    group.dataset.y = data.y;
                    group.dataset.scale = data.scale;
                    group.style.transform = `translate(${data.x}px, ${data.y}px) scale(${data.scale})`;
                }
            });
            alert('Layout imported successfully! Click Save Layout to apply it permanently.');
        } catch (error) {
            alert('Invalid layout file.');
        }
    };
    reader.readAsText(file);
    importInput.value = ''; // Reset input
});

scaleSlider.addEventListener('input', (e) => {
    if (selectedGroup) {
        selectedGroup.dataset.scale = e.target.value;
        const x = selectedGroup.dataset.x || 0;
        const y = selectedGroup.dataset.y || 0;
        selectedGroup.style.transform = `translate(${x}px, ${y}px) scale(${e.target.value})`;
    }
});

function dragStart(e) {
    if (!isEditMode) return;
    
    // Determine if touch or mouse
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    if (e.target.closest('.draggable-group')) {
        selectedGroup = e.target.closest('.draggable-group');
        
        draggableGroups.forEach(g => g.classList.remove('selected'));
        selectedGroup.classList.add('selected');
        
        scaleSlider.value = selectedGroup.dataset.scale || 1;
        
        initialX = parseFloat(selectedGroup.dataset.x) || 0;
        initialY = parseFloat(selectedGroup.dataset.y) || 0;
        
        dragStartX = clientX - initialX;
        dragStartY = clientY - initialY;
        isDragging = true;
    }
}

function drag(e) {
    if (!isEditMode || !selectedGroup || !isDragging) return;
    e.preventDefault();
    
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    const currentX = clientX - dragStartX;
    const currentY = clientY - dragStartY;
    
    selectedGroup.dataset.x = currentX;
    selectedGroup.dataset.y = currentY;
    const scale = selectedGroup.dataset.scale || 1;
    
    selectedGroup.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
}

function dragEnd(e) {
    isDragging = false;
}

document.addEventListener('touchstart', dragStart, { passive: false });
document.addEventListener('touchmove', drag, { passive: false });
document.addEventListener('touchend', dragEnd);

document.addEventListener('mousedown', dragStart);
document.addEventListener('mouseup', dragEnd);

// ================= MODE SELECTION LOGIC =================
const selGamepadBtn = document.getElementById('sel-gamepad');
const selTrackpadBtn = document.getElementById('sel-trackpad');
const modeContainers = document.querySelectorAll('.mode-container');

let activeMode = 'gamepad-mode';

selGamepadBtn.addEventListener('click', () => {
    selGamepadBtn.classList.add('active');
    selTrackpadBtn.classList.remove('active');
    activeMode = 'gamepad-mode';
    modeContainers.forEach(c => {
        if(c.id === 'gamepad-mode') c.classList.remove('hidden');
        else c.classList.add('hidden');
    });
});

selTrackpadBtn.addEventListener('click', () => {
    selTrackpadBtn.classList.add('active');
    selGamepadBtn.classList.remove('active');
    activeMode = 'trackpad-mode';
    modeContainers.forEach(c => {
        if(c.id === 'trackpad-mode') c.classList.remove('hidden');
        else c.classList.add('hidden');
    });
});

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
const keyboardBtn = document.getElementById('keyboard-btn');
const hiddenInput = document.getElementById('hidden-keyboard-input');

const keyboardMode = document.getElementById('keyboard-mode');
const trackpadMode = document.getElementById('trackpad-mode');
const closeKeyboardBtn = document.getElementById('close-keyboard-btn');
const vkContainer = document.getElementById('vk-container');

keyboardBtn.addEventListener('click', () => {
    trackpadMode.classList.add('hidden');
    keyboardMode.classList.remove('hidden');
});

closeKeyboardBtn.addEventListener('click', () => {
    keyboardMode.classList.add('hidden');
    trackpadMode.classList.remove('hidden');
});

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
            triggerVibration();
            sendKeyGlobal(el.dataset.code, 1);
        }
    });
    
    // newly released
    vkActiveKeys.forEach((_, el) => {
        if (!currentlyPressed.has(el)) {
            vkActiveKeys.delete(el);
            el.classList.remove('active');
            sendKeyGlobal(el.dataset.code, 0);
        }
    });
}

vkContainer.addEventListener('touchstart', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchmove', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchend', handleVkTouches, {passive: false});
vkContainer.addEventListener('touchcancel', handleVkTouches, {passive: false});


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
    btnL.childNodes[0].textContent = '';
    btnR.childNodes[0].textContent = '';
    sysSelect.childNodes[0].textContent = '';
    sysStart.childNodes[0].textContent = '';
    
    if (theme === 'xbox' || theme === 'xbox-premium') {
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


// Sensitivity logic
const sensSelector = document.getElementById('gyro-sensitivity');
if (sensSelector) {
    sensSelector.addEventListener('change', (e) => {
        maxTilt = parseInt(e.target.value, 10);
    });
}
