from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import os, psutil, time, platform, socket, json, asyncio
from dotenv import load_dotenv
from .auth import require_token, is_public
from .deps import read_temp_c, get_host_ips

load_dotenv()

APP_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(APP_DIR, "static")

app = FastAPI(title="Pi-Dash", version="1.6.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

def snapshot():
    cpu_percent = psutil.cpu_percent(interval=0.1)
    load1, load5, load15 = psutil.getloadavg()
    vm = psutil.virtual_memory()
    du = psutil.disk_usage("/")
    uptime_s = int(time.time() - psutil.boot_time())
    temp_c = read_temp_c()

    # Keep IPs in API responses, but do not show them on the web UI
    ips = []
    for name, addrs in psutil.net_if_addrs().items():
        for a in addrs:
            if getattr(a, "family", None) and str(a.family).endswith("AF_INET"):
                if a.address and not a.address.startswith("127."):
                    ips.append({"iface": name, "ip": a.address})

    host_ips = get_host_ips()
    primary_ip = host_ips[0] if host_ips else (ips[0]["ip"] if ips else None)

    return {
        "hostname": socket.gethostname(),
        "platform": platform.platform(),
        "arch": platform.machine(),
        "python": platform.python_version(),
        "cpu_count": psutil.cpu_count(logical=True) or 0,
        "cpu_percent": cpu_percent,
        "load": {"1": load1, "5": load5, "15": load15},
        "mem": {
            "total": vm.total, "used": vm.used,
            "percent": vm.percent, "available": vm.available
        },
        "disk": {
            "total": du.total, "used": du.used,
            "percent": du.percent, "free": du.free, "mount": "/"
        },
        "temp_c": temp_c,
        "uptime_s": uptime_s,
        # Not shown anymore, but kept in the API:
        "ips": ips,
        "host_ips": host_ips,
        "primary_ip": primary_ip,
        "ts": int(time.time()),
    }

@app.get("/")
def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/api/sys", dependencies=[Depends(require_token)])
def api_sys():
    return snapshot()

@app.get("/api/stream")
async def api_stream(dep=Depends(require_token)):
    # Interval can be set via .env (default 30 seconds)
    interval = int(os.getenv("PI_DASH_INTERVAL", "30"))

    async def gen():
        while True:
            yield "data: " + json.dumps(snapshot(), separators=(",", ":")) + "\n\n"
            await asyncio.sleep(interval)

    headers = {"Cache-Control": "no-cache", "Connection": "keep-alive"}
    return StreamingResponse(gen(), media_type="text/event-stream", headers=headers)

@app.get("/api/meta")
def api_meta():
    return {"public": is_public()}
