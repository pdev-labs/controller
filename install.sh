#!/bin/bash

# Ensure the script is run from the project directory
cd "$(dirname "$0")"

echo "==========================================="
echo "   PSP Controller Setup & Installation     "
echo "==========================================="

echo "1. Requesting permissions for virtual joystick..."
echo "You may be prompted for your password."
echo 'KERNEL=="uinput", MODE="0666"' | sudo tee /etc/udev/rules.d/99-psp-uinput.rules > /dev/null
sudo udevadm control --reload-rules
sudo udevadm trigger
sudo chmod 666 /dev/uinput

echo "2. Installing Application Dependencies..."
npm install

echo "3. Installing Desktop Shortcut..."
mkdir -p ~/.local/share/applications/

PROJECT_DIR=$(pwd)
ICON_PATH="$PROJECT_DIR/public/xbox-controller.png"

# We use a generic gamepad icon if the specific one doesn't exist yet
if [ ! -f "$ICON_PATH" ]; then
    ICON_PATH="gamepad"
fi

# Create Desktop Entry
cat << EOF > ~/.local/share/applications/psp-controller.desktop
[Desktop Entry]
Name=PSP Controller
Comment=Virtual PC Controller Server
Exec=sh -c "cd '$PROJECT_DIR' && npm start"
Icon=$ICON_PATH
Terminal=false
Type=Application
Categories=Game;Utility;
EOF

chmod +x ~/.local/share/applications/psp-controller.desktop

echo "==========================================="
echo "Setup Complete!"
echo "You can now launch 'PSP Controller' from your Application Menu!"
echo "==========================================="
