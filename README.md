# Pi-Dash — Realtime Raspberry Pi Dashboard

## Features
- Realtime via SSE: CPU %, Memory %, Disk %, Temp °C
- Responsive UI, token modal + logout, sticky footer
- Specs card: Hostname, OS/Platform, Arch, CPU cores, RAM/Storage, Interfaces, Python

## Install (Raspberry Pi) #github download ZIP
```bash
unzip pi-dash-main.zip
mv pi-dash-main /home/pi/pi-dash
cd /home/pi/pi-dash

cp .env.example .env
nano .env   # set PI_DASH_TOKEN and (optional) PI_DASH_PORT

bash scripts/install.sh
sudo systemctl status pi-dash


## Install (Raspberry Pi) #github clone
```bash
cd /home/pi/pi-dash

cp .env.example .env
nano .env   # set PI_DASH_TOKEN and (optional) PI_DASH_PORT

bash scripts/install.sh
sudo systemctl status pi-dash

```
Open: `http://<PI-IP>:<PORT>` (first time enter token in modal)

----------------------------------------------------------
