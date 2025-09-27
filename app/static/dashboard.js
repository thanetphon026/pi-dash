// app/static/dashboard.js  — stable

const $ = s => document.querySelector(s);

/* ---------------- DOM refs ---------------- */
const login = $("#login");
const tokenInput = $("#token");
const saveBtn = $("#saveBtn");
const logoutBtn = $("#logoutBtn");
const clearBtn = $("#clearBtn");
const connChip = $("#connChip");
const langBtn = $("#langBtn");

/* ---------------- State ---------------- */
let TOKEN = null;
let lastSnap = null;           // Store latest snapshot to re-render when language changes
let currentLang = "en";        // en by default
let es = null;                 // EventSource

/* ---------------- Harden token field ---------------- */
(function hardenTokenField(){
  const refreshName = () =>
    tokenInput.setAttribute("name", "pi_token_" + Math.random().toString(36).slice(2));
  refreshName();
  const realShow = login.showModal.bind(login);
  login.showModal = function () {
    tokenInput.value = "";
    refreshName();
    realShow();
    setTimeout(() => tokenInput.focus({ preventScroll: true }), 30);
  };
})();

/* ---------------- i18n ---------------- */
const I18N = {
  en: {
    title: "Dashboard",
    device: "Device",
    status: "Status",
    connection: "Connection",
    lastUpdate: "Last Update",
    metrics: "Metrics (Realtime)",
    clear: "Clear graphs",
    cpuL: "CPU %",
    memL: "Memory %",
    diskL: "Disk %",
    tempL: "Temp °C",
    summary: "Overall Status",
    specs: "Board Specs",
    hostname: "Hostname",
    osPlatform: "OS / Platform",
    arch: "Architecture",
    cpuCores: "CPU Cores",
    ramTotal: "RAM (Total)",
    storageTotal: "Storage (Total)",
    storageFree: "Storage (Free)",
    python: "Python",
    uptime: "Uptime",
    load: "Load",
    authTitle: "Authentication",
    authDesc: "Please enter API Token to access this board.",
    apiToken: "API Token",
    save: "Save",
    logout: "Logout",
    statusLabel: "Status",
    sConnecting: "Connecting…",
    sConnected: "Connected",
    sReconnecting: "Reconnecting…",
    hours: "h",
    btnLang: "EN",
  },
  th: {
    title: "แดชบอร์ด",
    device: "เครื่อง",
    status: "สถานะ",
    connection: "การเชื่อมต่อ",
    lastUpdate: "อัปเดตล่าสุด",
    metrics: "ข้อมูลแบบเรียลไทม์",
    clear: "ล้างกราฟ",
    cpuL: "CPU %",
    memL: "หน่วยความจำ %",
    diskL: "ดิสก์ %",
    tempL: "อุณหภูมิ °C",
    summary: "สถานะโดยรวม",
    specs: "สเปกบอร์ด",
    hostname: "ชื่อโฮสต์",
    osPlatform: "ระบบปฏิบัติการ",
    arch: "สถาปัตยกรรม",
    cpuCores: "จำนวนคอร์ CPU",
    ramTotal: "RAM (ทั้งหมด)",
    storageTotal: "พื้นที่รวม",
    storageFree: "พื้นที่ว่าง",
    python: "ไพธอน",
    uptime: "เวลาทำงาน",
    load: "โหลด",
    authTitle: "ยืนยันตัวตน",
    authDesc: "กรุณาใส่ API Token เพื่อเข้าถึงข้อมูลบอร์ด",
    apiToken: "API Token",
    save: "บันทึก",
    logout: "ออกจากระบบ",
    statusLabel: "สถานะ",
    sConnecting: "กำลังเชื่อมต่อ…",
    sConnected: "เชื่อมต่อแล้ว",
    sReconnecting: "กำลังเชื่อมใหม่…",
    hours: "ชม.",
    btnLang: "TH",
  },
};
function t(key){ return (I18N[currentLang]||I18N.en)[key] || key; }

/* apply i18n to static texts having [data-i18n] */
function applyStaticI18n(){
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });
  langBtn.textContent = t("btnLang");
}

/* ---------------- Charts ---------------- */
function makeChart(canvasId, label, yMax=100){
  const ctx = document.getElementById(canvasId).getContext("2d");
  const data = { labels: [], datasets: [{ label, data: [], tension: .35 }] };
  const chart = new Chart(ctx, {
    type:"line",
    data,
    options:{
      responsive:true, maintainAspectRatio:true, animation:false,
      scales:{ y:{ min:0, max:yMax } },
      plugins:{ legend:{ labels:{ color:"#cdd7ff" } } }
    }
  });
  const push = (x,y)=>{
    data.labels.push(x); data.datasets[0].data.push(y);
    if (data.labels.length>120){ data.labels.shift(); data.datasets[0].data.shift(); }
    if (!push._raf){ push._raf = requestAnimationFrame(()=>{ chart.update(); push._raf=null; }); }
  };
  const clear = ()=>{ data.labels.length=0; data.datasets[0].data.length=0; chart.update(); };
  const setLegend = (newLabel)=>{ data.datasets[0].label = newLabel; chart.update(); };
  return { push, clear, setLegend };
}
const C = {
  cpu:  makeChart("cpuChart",  "CPU %",   100),
  mem:  makeChart("memChart",  "Memory %",100),
  disk: makeChart("diskChart", "Disk %",  100),
  temp: makeChart("tempChart", "Temp °C", 110),
};
clearBtn.onclick = ()=>{ C.cpu.clear(); C.mem.clear(); C.disk.clear(); C.temp.clear(); };

/* ---------------- Helpers ---------------- */
const fmtBytes = b => { const u=["B","KB","MB","GB","TB"]; let i=0,v=b; for(;v>=1024&&i<u.length-1;i++) v/=1024; return `${v.toFixed(1)} ${u[i]}`; };
const badgeClass = p => p<60?"ok":p<85?"warn":"crit";

function setConnState(kind){ // "connecting" | "connected" | "reconnecting"
  const text = kind==="connected" ? t("sConnected") : kind==="reconnecting" ? t("sReconnecting") : t("sConnecting");
  const klass = kind==="connected" ? "ok" : kind==="reconnecting" ? "warn" : "";
  $("#conn").textContent = text;
  $("#conn").className = `badge ${klass}`;
  connChip.textContent = `${t("statusLabel")}: ${text}`;
}

/* ---------------- Renderers ---------------- */
function renderMeta(j){
  $("#metaHost").textContent = `${j.hostname} (${j.platform.split(' ')[0]})`;
}

function renderStats(j){
  // overall
  $("#quick").innerHTML = `
    <div><div class="muted">${t("uptime")}</div><div class="badge">${(j.uptime_s/3600).toFixed(1)} ${t("hours")}</div></div>
    <div><div class="muted">CPU</div><div class="badge ${badgeClass(j.cpu_percent)}">${j.cpu_percent.toFixed(1)}%</div></div>
    <div><div class="muted">${t("load")}</div><div class="badge">${j.load["1"].toFixed(2)}, ${j.load["5"].toFixed(2)}, ${j.load["15"].toFixed(2)}</div></div>
    <div><div class="muted">${t("memL")}</div><div class="badge ${badgeClass(j.mem.percent)}">${j.mem.percent}% (${fmtBytes(j.mem.used)}/${fmtBytes(j.mem.total)})</div></div>
    <div><div class="muted">${t("diskL")}</div><div class="badge ${badgeClass(j.disk.percent)}">${j.disk.percent}% (${fmtBytes(j.disk.used)}/${fmtBytes(j.disk.total)})</div></div>
    <div><div class="muted">${t("tempL")}</div><div class="badge ${j.temp_c!=null && j.temp_c>75?'crit':(j.temp_c>60?'warn':'ok')}">${j.temp_c ?? "-"} °C</div></div>
  `;

  // specs
  $("#specs").innerHTML = `
    <div><div class="muted">${t("hostname")}</div><div class="badge">${j.hostname}</div></div>
    <div><div class="muted">${t("osPlatform")}</div><div class="badge">${j.platform}</div></div>
    <div><div class="muted">${t("arch")}</div><div class="badge">${j.arch ?? "-"}</div></div>
    <div><div class="muted">${t("cpuCores")}</div><div class="badge">${j.cpu_count ?? "-"}</div></div>
    <div><div class="muted">${t("ramTotal")}</div><div class="badge">${fmtBytes(j.mem.total)}</div></div>
    <div><div class="muted">${t("storageTotal")}</div><div class="badge">${fmtBytes(j.disk.total)}</div></div>
    <div><div class="muted">${t("storageFree")}</div><div class="badge">${fmtBytes(j.disk.free)}</div></div>
    <div><div class="muted">${t("python")}</div><div class="badge">${j.python ?? "-"}</div></div>
  `;

  const ts = new Date(j.ts*1000).toLocaleTimeString();
  $("#last").textContent = ts;

  // push to charts
  C.cpu.setLegend(t("cpuL"));
  C.mem.setLegend(t("memL"));
  C.disk.setLegend(t("diskL"));
  C.temp.setLegend(t("tempL"));

  C.cpu.push(ts,  j.cpu_percent);
  C.mem.push(ts,  j.mem.percent);
  C.disk.push(ts, j.disk.percent);
  C.temp.push(ts, j.temp_c ?? 0);
}

/* ---------------- Auth ---------------- */
function getStoredToken(){
  return localStorage.getItem("PI_DASH_TOKEN") || "";
}
function storeToken(tk){
  localStorage.setItem("PI_DASH_TOKEN", tk || "");
}

async function isPublic(){
  try{ const r = await fetch("/api/meta"); if(!r.ok) return false; const m = await r.json(); return !!m.public; }
  catch{ return false; }
}

async function fetchSysWithToken(tk){
  const q = tk ? `?token=${encodeURIComponent(tk)}` : "";
  try{
    const res = await fetch(`/api/sys${q}`, { cache: "no-store" });
    if(!res.ok) return null;
    return await res.json();
  }catch{ return null; }
}

function openTokenModal(){
  login.showModal();
  return new Promise(resolve=>{
    saveBtn.onclick = ()=>{
      const t = tokenInput.value.trim();
      if(!t) return;
      storeToken(t);
      TOKEN = t;
      login.close();
      resolve(t);
    };
  });
}

async function ensureAuthAndPrime(){
  if (await isPublic()){
    TOKEN = "";
    return { query: "" };
  }
  TOKEN = getStoredToken();
  if (TOKEN){
    const j = await fetchSysWithToken(TOKEN);
    if (j){ lastSnap = j; renderMeta(j); renderStats(j); return { query: `?token=${encodeURIComponent(TOKEN)}` }; }
  }
  // ask until valid
  while(true){
    const t = await openTokenModal();
    const j = await fetchSysWithToken(t);
    if (j){ lastSnap = j; renderMeta(j); renderStats(j); return { query: `?token=${encodeURIComponent(t)}` }; }
  }
}

/* ---------------- SSE connection ---------------- */
function connectSSE(query){
  if (es) { try{ es.close(); }catch{} es = null; }
  setConnState("connecting");
  es = new EventSource(`/api/stream${query}`);
  es.onopen = ()=> setConnState("connected");
  es.onerror = ()=> setConnState("reconnecting");
  es.onmessage = (ev)=>{
    try{
      const j = JSON.parse(ev.data);
      lastSnap = j;
      renderMeta(j);
      renderStats(j);
    }catch{}
  };
}

/* ---------------- Language toggle ---------------- */
function switchLang(next){
  currentLang = next;
  localStorage.setItem("PI_DASH_LANG", currentLang);
  applyStaticI18n();
  // Re-render values with current language (use lastSnap if available)
  if (lastSnap){ renderMeta(lastSnap); renderStats(lastSnap); }
  // Update connection status to the current language
  const text = $("#conn").textContent;
  // Derive connection state from es.readyState when possible
  const state = es && es.readyState === 1 ? "connected" : (es && es.readyState === 0 ? "connecting" : "reconnecting");
  setConnState(state);
}
langBtn.onclick = ()=> switchLang(currentLang === "en" ? "th" : "en");

/* ---------------- Logout ---------------- */
logoutBtn.onclick = ()=>{
  try{ if(es) es.close(); }catch{}
  es = null;
  storeToken("");
  TOKEN = "";
  lastSnap = null;
  // Clear base UI and trigger auth again
  $("#quick").innerHTML = "";
  $("#specs").innerHTML = "";
  $("#last").textContent = "—";
  C.cpu.clear(); C.mem.clear(); C.disk.clear(); C.temp.clear();
  (async ()=>{
    const { query } = await ensureAuthAndPrime();
    connectSSE(query);
  })();
};

/* ---------------- Boot ---------------- */
(function captureTokenFromURL(){
  const u = new URL(location.href);
  const turl = u.searchParams.get("token");
  if (turl && turl.trim()){
    storeToken(turl.trim());
    u.searchParams.delete("token");
    history.replaceState({}, "", u.toString());
  }
})();
currentLang = localStorage.getItem("PI_DASH_LANG") || "en";
applyStaticI18n();

(async function start(){
  const { query } = await ensureAuthAndPrime();
  connectSSE(query);
})();
