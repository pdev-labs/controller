const overlay = document.getElementById('overlay');
const connectBtn = document.getElementById('connect-btn');
const statusDot = document.getElementById('connection-status');
let ws;

// Prevent default context menu and multi-touch zooming
document.addEventListener('contextmenu', event => event.preventDefault());

connectBtn.addEventListener('click', () => {
    // Request Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    }
    overlay.style.display = 'none';
    connectWebSocket();
});

function connectWebSocket() {
    const host = window.location.hostname;
    const port = window.location.port;
    ws = new WebSocket(`ws://${host}:${port}`);

    ws.onopen = () => {
        statusDot.classList.remove('disconnected');
        statusDot.classList.add('connected');
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
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'button',
            button: buttonId,
            status: status // 'pressed' or 'released'
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

analogContainer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isAnalogActive = true;
    const rect = analogContainer.getBoundingClientRect();
    analogCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
    moveStick(e.touches[0].clientX, e.touches[0].clientY);
});

analogContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isAnalogActive) {
        moveStick(e.touches[0].clientX, e.touches[0].clientY);
    }
});

function stopAnalog() {
    isAnalogActive = false;
    analogStick.style.transform = `translate(0px, 0px)`;
    // Optionally send center analog data to server here
}

analogContainer.addEventListener('touchend', stopAnalog);
analogContainer.addEventListener('touchcancel', stopAnalog);

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
