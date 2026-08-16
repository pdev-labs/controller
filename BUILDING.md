# 🛠 Building from Source

This guide covers everything you need to know to compile and package the PSP Controller application from source on any operating system, targeting any architecture.

The project consists of three main build artifacts:
1. The **Python Joystick Engine** (`virtual_joystick.py`) which interfaces with OS-level drivers.
2. The **Desktop Host App** (Electron) which serves the web UI and WebSocket server.
3. The **Mobile App** (Android APK) built using Capacitor.

---

## 📋 General Prerequisites

Regardless of your platform, you must install the following:
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Python](https://www.python.org/) (v3.10 or newer)
- `git`

Clone the repository and install NPM dependencies:
```bash
git clone https://github.com/pdev-labs/controller.git
cd controller
npm install
```

---

## 🐧 Building on Linux

### 1. Install Linux-specific dependencies
Linux requires the `evdev` Python package to inject controller inputs via the `uinput` kernel module.

```bash
python3 -m pip install --upgrade pip
pip install pyinstaller pynput evdev
```

### 2. Build the Python Engine
You must build the Python script into a standalone executable.
```bash
pyinstaller --onefile virtual_joystick.py
```
This generates a `dist/virtual_joystick` binary.

### 3. Build the Electron App
You can target `x64` (Intel/AMD) or `arm64` (Raspberry Pi, ARM laptops).

**For x64:**
```bash
npx electron-builder --linux AppImage deb --x64
```

**For arm64:**
```bash
npx electron-builder --linux AppImage deb --arm64
```
Your compiled `.AppImage` and `.deb` files will be available in the `dist/` directory.

---

## 🪟 Building on Windows

### 1. Install Windows-specific dependencies
Windows uses `vgamepad` which acts as a wrapper around the ViGEmBus driver to emulate Xbox 360 controllers.

Open PowerShell or Command Prompt as Administrator:
```cmd
python -m pip install --upgrade pip setuptools wheel
pip install pyinstaller pynput
set VGAMEPAD_SKIP_VIGEMBUS_INSTALL=true
pip install git+https://github.com/yannbouteiller/vgamepad.git
```

### 2. Build the Python Engine
```cmd
pyinstaller --onefile virtual_joystick.py
```
This generates a `dist/virtual_joystick.exe` binary.

### 3. Build the Electron App
**For x64:**
```cmd
npx electron-builder --win nsis --x64
```

**For arm64 (Windows on ARM):**
```cmd
npx electron-builder --win nsis --arm64
```
Your compiled setup `.exe` installer will be available in the `dist/` directory.

---

## 🍏 Building on macOS

### 1. Install macOS dependencies
macOS uses standard keyboard emulation via `pynput` as Apple restricts generic gamepad creation.

```bash
python3 -m pip install --upgrade pip
pip install pyinstaller pynput
```

### 2. Build the Python Engine
```bash
pyinstaller --onefile virtual_joystick.py
```
> **Note on Architecture:** PyInstaller will compile for the architecture of the Python interpreter you are running. If you are on an Intel Mac, it will build `x64`. If you are on an M-series Mac, it will build `arm64`.

### 3. Build the Electron App
**For M-Series Apple Silicon (arm64):**
```bash
npx electron-builder --mac dmg --arm64
```

**For Intel Macs (x64):**
```bash
npx electron-builder --mac dmg --x64
```

Your compiled `.dmg` will be available in the `dist/` directory.

---

## 📱 Building the Android APK

The mobile application is essentially the Web UI wrapped natively using Ionic Capacitor. This hides the browser UI and locks the screen orientation.

### Prerequisites
- [Android Studio](https://developer.android.com/studio) installed.
- Java JDK 21 installed.

### Steps
1. Sync the web assets to the Android project folder:
   ```bash
   npx cap sync android
   ```
2. Build the APK using Gradle:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
3. The resulting APK will be located at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

*Note: For a signed release build, use `./gradlew assembleRelease` instead, but you must configure your own signing keystore in Android Studio.*
