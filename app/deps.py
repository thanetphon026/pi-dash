import subprocess
from typing import List, Optional


def _run(cmd: list[str], timeout: float = 1.5) -> str:
    """Run a command and return stdout (stripped)."""
    return subprocess.check_output(cmd, timeout=timeout).decode().strip()


def read_temp_c() -> Optional[float]:
    """
    Read Raspberry Pi SoC temperature in Celsius.
    1) vcgencmd measure_temp
    2) /sys/class/thermal/thermal_zone0/temp
    """
    try:
        out = _run(["vcgencmd", "measure_temp"])
        # e.g. "temp=48.8'C"
        return float(out.split("=")[1].split("'")[0])
    except Exception:
        try:
            with open("/sys/class/thermal/thermal_zone0/temp") as f:
                milli = int(f.read().strip())
            return milli / 1000.0
        except Exception:
            return None


def _is_private_ipv4(ip: str) -> bool:
    """Rough check for RFC1918 private addresses."""
    return (
        ip.startswith("192.168.")
        or ip.startswith("10.")
        or any(ip.startswith(f"172.{n}.") for n in range(16, 32))
    )


def get_host_ips() -> List[str]:
    """
    Return IPv4 addresses of this host, prioritizing LAN IPs.
    Strategy:
      1) hostname -I
      2) ip -4 -o addr show scope global  (fallback)
    Filters:
      - exclude 127.0.0.0/8, 169.254.0.0/16, 0.0.0.0, empty
      - deduplicate
    Sorted with private LAN IPs first.
    """
    candidates: list[str] = []

    # Try hostname -I
    try:
        out = _run(["hostname", "-I"])
        if out:
            candidates.extend(out.split())
    except Exception:
        pass

    # Fallback: ip -4 -o addr show scope global
    if not candidates:
        try:
            out = _run(["ip", "-4", "-o", "addr", "show", "scope", "global"])
            # lines like: "2: wlan0    inet 192.168.1.23/24 brd 192.168.1.255 scope global dynamic ..."
            for line in out.splitlines():
                parts = line.split()
                if "inet" in parts:
                    i = parts.index("inet")
                    if i + 1 < len(parts):
                        ip_cidr = parts[i + 1]
                        ip = ip_cidr.split("/")[0]
                        candidates.append(ip)
        except Exception:
            pass

    # Clean + de-dup + filter
    seen = set()
    ips: list[str] = []
    for ip in candidates:
        if not ip or "." not in ip:
            continue
        if ip.startswith("127.") or ip.startswith("169.254.") or ip == "0.0.0.0":
            continue
        if ip in seen:
            continue
        seen.add(ip)
        ips.append(ip)

    # Sort: private LAN first, then others; keep original order inside each group
    ips_private = [ip for ip in ips if _is_private_ipv4(ip)]
    ips_public = [ip for ip in ips if not _is_private_ipv4(ip)]
    return ips_private + ips_public

