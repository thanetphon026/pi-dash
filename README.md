# Pi-Dash — Realtime Raspberry Pi Dashboard

## Features
- Realtime via SSE: CPU %, Memory %, Disk %, Temp °C
- Responsive UI, token modal + logout, sticky footer
- Primary IP from `hostname -I` + per-interface IPs
- Specs card: Hostname, OS/Platform, Arch, CPU cores, RAM/Storage, Interfaces, Python

## Install (Raspberry Pi)
```bash
unzip pi-dash.zip
mv pi-dash /home/pi/pi-dash
cd /home/pi/pi-dash

cp .env.example .env
nano .env   # set PI_DASH_TOKEN and (optional) PI_DASH_PORT

bash scripts/install.sh
sudo systemctl status pi-dash
```
Open: `http://<PI-IP>:<PORT>` (first time enter token in modal)

---
# (TH) คำแนะนำแบบย่อ
- แตก zip → ย้ายไป `/home/pi/pi-dash` → `cp .env.example .env` แล้วแก้โทเคน
- รัน `bash scripts/install.sh`
- เปิด `http://<IP-ของ-Pi>:<PORT>` แล้วกรอก token
