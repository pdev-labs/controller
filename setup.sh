#!/bin/bash
echo "Setting up permissions for virtual joystick (/dev/uinput)..."
echo 'KERNEL=="uinput", MODE="0666"' | sudo tee /etc/udev/rules.d/99-psp-uinput.rules > /dev/null
sudo udevadm control --reload-rules
sudo udevadm trigger
sudo chmod 666 /dev/uinput
echo "Done! You can now start the app without sudo using 'npm start'."
