#!/bin/bash
cd "$(dirname "$0")"
echo "Requesting permission for virtual gamepad device..."
sudo chmod 666 /dev/uinput

echo "Starting PSP Controller Server..."
node server.js
