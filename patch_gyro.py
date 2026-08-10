import re

with open('public/controller.js', 'r') as f:
    content = f.read()

# Patch gyroBtn.addEventListener
old_listener = """            isGyroActive = true;
            gyroBtn.innerHTML = 'GYRO ON<span class="md-ripple"></span>';
            gyroBtn.classList.add('active');
            gyroCenter = null; // Calibrate on next frame
            window.addEventListener('deviceorientation', handleGyro);"""

new_listener = """            isGyroActive = true;
            gyroBtn.innerHTML = 'GYRO ON<span class="md-ripple"></span>';
            gyroBtn.classList.add('active');
            gyroCenter = null; // Calibrate on next frame
            
            setTimeout(() => {
                if (gyroCenter === null) {
                    alert("ERROR: No Gyroscope data received!\\n\\n1. Check if your phone has a gyro.\\n2. If using Chrome on Android, you may need to enable sensors in Site Settings.");
                }
            }, 2000);
            
            window.addEventListener('deviceorientation', handleGyro);"""

content = content.replace(old_listener, new_listener)

# Patch handleGyro
old_handle = """    let nx = Math.max(-1, Math.min(1, deltaBeta / maxTilt));
    let ny = Math.max(-1, Math.min(1, deltaGamma / maxTilt));

    if (ws && ws.readyState === WebSocket.OPEN) {"""

new_handle = """    let nx = Math.max(-1, Math.min(1, deltaBeta / maxTilt));
    let ny = Math.max(-1, Math.min(1, deltaGamma / maxTilt));
    
    // Debug output on button
    gyroBtn.innerHTML = `X:${Math.round(nx*100)} Y:${Math.round(ny*100)}<span class="md-ripple"></span>`;

    if (ws && ws.readyState === WebSocket.OPEN) {"""

content = content.replace(old_handle, new_handle)

with open('public/controller.js', 'w') as f:
    f.write(content)

