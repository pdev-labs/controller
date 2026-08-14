# 🎮 Virtual PSP Controller

Turn your smartphone into a fully customizable, low-latency virtual gamepad, keyboard, and mouse for your PC! 

Originally designed to replicate the classic **PlayStation Portable (PSP)** layout, this project has evolved into a robust Universal Gamepad solution. It supports **virtual Xbox 360 controller emulation** on Linux, high-quality **haptic feedback**, **gyroscope aiming**, and fully drag-and-drop **customizable layouts**.

---

## ✨ Key Features

- **Native Gamepad Emulation (Linux & Windows)**: Emulates a true Xbox 360 controller natively via the Linux `uinput` kernel module or the Windows `ViGEmBus` driver. Your games will recognize your phone exactly as if it were a physical Xbox controller!
- **Keyboard & Mouse Mode**: Seamlessly switch modes to use your phone's touchscreen as a laptop trackpad and keyboard to control your desktop.
- **Gyroscope Support**: Use your phone's built-in tilt sensors for precise aiming or steering. Includes a real-time sensitivity slider.
- **Drag-and-Drop Layout Editor**: Don't like where a button is? Move it! Resize, reposition, and save your ideal controller layout directly from your phone's browser.
- **Gorgeous Themes**: Switch on-the-fly between beautifully crafted controller themes:
  - **PSP (Optimized)**
  - **PlayStation Classic & PS5 Premium**
  - **Xbox & Xbox Premium**
  - **SNES Retro**
- **Haptic Feedback**: Get satisfying vibration responses when pressing buttons on your touchscreen.
- **Fast-Forward Support**: Includes a dedicated `>>` button mapped to `TAB` (perfect for fast-forwarding emulators like PPSSPP).

---

## 🏗 How It Works

The project is split into a **Desktop Host App** and a **Mobile Client**:

1. **Desktop App (Electron + Node.js + Python)**: Runs quietly on your PC, launching a local web server (on port `8080`) and a WebSocket server (on port `8081`). On Linux, it uses a Python script (`evdev`/`uinput`) to register a virtual hardware joystick.
2. **Mobile Client (Capacitor / Web)**: You connect to the Desktop App via your phone's web browser or the provided Android APK. The mobile client sends touch and gyro events over the WebSocket connection with ultra-low latency.

---

## 🚀 Installation & Downloads

Head over to the [Releases Page](https://github.com/pdev-labs/controller/releases) to download the latest version for your platform.

### 🐧 Linux (Recommended)
This app is most powerful on Linux, where full Xbox Gamepad emulation is supported.
1. Download the `.AppImage` or `.deb` file.
2. **AppImage**: Make it executable (`chmod +x psp-controller-*.AppImage`) and run it.
3. **Debian/Ubuntu**: Install via `sudo apt install ./psp-controller_*.deb`.
> **Note:** On the first launch, the app will request your root password. This is completely normal and required to configure the `uinput` drivers so Linux can create the virtual Xbox controller.

### 🪟 Windows
Download the `.exe` from the Releases page. 
Windows now features **full, native Xbox 360 controller emulation** powered by `vgamepad` out of the box!

### 🍏 macOS
Download the `.dmg` from the Releases page.
> **Warning:** Due to strict OS driver limitations, Xbox hardware emulation is currently not supported on macOS. Only the **Keyboard/Mouse** functionality will work out-of-the-box on this platform.

### 📱 Android (Optional, but Awesome!)
While you can just use your phone's web browser, we also provide a native Android app!
1. Download the `psp-controller-android.apk` from the Releases page.
2. Install it on your Android device. 
3. The native app locks your screen orientation and hides the browser address bar for a much better full-screen gaming experience!

---

## 📖 Usage Guide

1. **Start the Host**: Open the PSP Controller app on your PC. It will display an IP address (e.g., `http://192.168.1.5:8080`).
2. **Connect your Phone**: Make sure your phone and PC are on the same Wi-Fi network. Open that IP address in your phone's browser, OR open the installed Android APK and type the IP address into the settings.
3. **Play**: Your phone is now a controller!

### ⚙️ Settings & Customization
Tap the **Settings (Gear Icon)** in the top right corner of the mobile interface to:
- Enter your PC's IP Address (if using the APK).
- Change the gamepad visual theme.
- Toggle Haptic Feedback on/off.
- Adjust the Gyroscope Sensitivity slider.

Tap the **Edit Layout** button in the top bar to enter edit mode. You can drag buttons around and use two fingers to pinch and scale them. Tap "Save Layout" when you're done!

---

## 🛠 Compiling from Source

Want to build it yourself? 

**Prerequisites:**
- Node.js (v18+)
- Python 3.10+
- `pip install evdev` (Linux), `vgamepad` (Windows), `pynput` (All OS)

**Steps:**
```bash
# Clone the repo
git clone https://github.com/pdev-labs/controller.git
cd controller

# Install NPM dependencies
npm install

# Build the Python Joystick Engine
pyinstaller --onefile virtual_joystick.py

# Run in development mode
npm start

# Build production binaries (AppImage, deb, exe, dmg)
npx electron-builder --linux AppImage deb --x64
```

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. 
See the [LICENSE](LICENSE) file for more details. Enjoy hacking and modifying it!
