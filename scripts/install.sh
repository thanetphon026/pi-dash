#!/usr/bin/env bash
set -euo pipefail
echo "→ Installing system packages..."
sudo apt update
sudo apt install -y python3-venv python3-pip
echo "→ Creating virtualenv and installing Python deps..."
cd "$(dirname "$0")/.."
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
echo "→ Installing systemd service..."
sudo cp systemd/pi-dash.service /etc/systemd/system/pi-dash.service
sudo systemctl daemon-reload
sudo systemctl enable --now pi-dash
echo "→ Done! Open http://<PI-IP>:${PI_DASH_PORT:-8080}"
