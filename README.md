# 🎮 Virtual PSP Controller

Turn your smartphone into a fully customizable, low-latency virtual gamepad, keyboard, and mouse for your PC! 

Originally designed to replicate the classic **PlayStation Portable (PSP)** layout, this project has evolved into a robust Universal Gamepad solution. It supports cross-platform game control natively on **Linux, Windows, and macOS**.

---

## ✨ Key Features

- **Native Xbox 360 Emulation (Linux & Windows)**: Emulates a true Xbox 360 controller natively via the Linux `uinput` kernel module or the Windows `ViGEmBus` driver. Your PC games will recognize your phone exactly as if it were a physical Xbox controller plugged in!
- **Keyboard & Mouse Fallback (macOS)**: Play games on your Mac using your phone! Controller inputs are instantly mapped to physical keyboard keys.
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

## 🏗 How It Works (Cross-Platform Architecture)

The project is split into a **Desktop Host App** and a **Mobile Client**:

1. **Desktop Host (Your PC / Mac)**: Runs quietly on your computer, launching a local web server (on port `8080`) and a WebSocket server (on port `8081`). It uses Python to securely inject hardware events into your operating system.
2. **Mobile Client (Your Phone)**: You connect to the Desktop Host via your phone's Wi-Fi. It sends touch and gyro events over the WebSocket connection with ultra-low latency.

### ❓ Clarifying OS Differences (Gamepad vs Keyboard Mode)

Because different operating systems have different security restrictions, the controller acts slightly differently depending on your OS:

- 🐧 **Linux**: **Full Gamepad Support**. The app uses `evdev` to create a virtual Xbox 360 joystick. Games will see it as a real controller.
- 🪟 **Windows**: **Full Gamepad Support**. The app uses `vgamepad` (ViGEmBus) to create a virtual Xbox 360 joystick. Games will see it as a real controller.
- 🍏 **macOS**: **Keyboard/Mouse Mode Only**. Apple's strict driver security prevents apps from easily creating fake "gamepads" without kernel extensions. To bypass this, the app translates your phone's buttons into actual Mac keyboard presses (e.g., A/B/X/Y on phone = K/L/J/I on Mac). **You can absolutely still play games on macOS!** Just make sure your game is configured to use Keyboard controls instead of Gamepad controls.

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Download & Install on your PC

Head over to the [Releases Page](https://github.com/pdev-labs/controller/releases) to download the latest version for your platform.

#### 🪟 Windows Setup
1. Download the `psp-controller-Setup-*.exe` file.
2. Double-click the installer and follow the prompts.
3. Open the installed app. Your Windows Firewall may ask you to allow it through—click **Allow** so your phone can connect!

#### 🐧 Linux Setup
1. Download the `.AppImage` or `.deb` file.
2. **AppImage**: Right-click the file -> Properties -> Permissions -> "Allow executing file as program". Double-click to run.
3. **Debian/Ubuntu**: Install via terminal: `sudo apt install ./psp-controller_*.deb`.
> **Important:** On the first launch, the app will request your root password. This is required to configure the `uinput` drivers so Linux can create the virtual Xbox controller.

#### 🍏 macOS Setup
1. Download the `.dmg` file.
2. Open the `.dmg` and drag the PSP Controller app into your Applications folder.
3. Because macOS uses Keyboard emulation, you may need to grant the app **Accessibility** permissions in `System Settings > Privacy & Security > Accessibility`.

### Step 2: Connect Your Phone

1. **Start the Host**: Keep the PSP Controller app open on your PC. It will display a prominent IP address (e.g., `http://192.168.1.5:8080`).
2. **Ensure Same Network**: Make sure your phone and PC are connected to the exact same Wi-Fi network.
3. **Connect**: 
   - **Option A (Web Browser)**: Open Chrome or Safari on your phone and type in the IP address displayed on your PC screen.
   - **Option B (Native Android App)**: Download the `psp-controller-android.apk` from the Releases page, install it, open it, and type the IP address into the Settings menu. The native app hides the browser address bar and locks orientation for a true full-screen experience!

### Step 3: Play and Customize!

Once connected, your phone screen will light up with the gamepad interface. You can immediately start controlling your PC.

- **Customize Layout**: Tap the **Edit Layout** button in the top bar to enter edit mode. You can drag buttons around to suit your fingers. Use two fingers to pinch/zoom and resize buttons. Tap "Save Layout" when done.
- **Settings**: Tap the **Gear Icon** in the top right to change Themes, toggle Haptics, or adjust Gyroscope sensitivity.

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
