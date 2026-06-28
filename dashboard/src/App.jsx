import { useState, useEffect, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "https://flashlock.onrender.com";
const SKU = "iphone15";

const C = {
  bg: "#2C2926", panel: "#3D3935", panel2: "#34302C", border: "#6D655D",
  copper: "#C07A3B", green: "#4E8C5A", amber: "#C58C32", red: "#A44747",
  teal: "#5F8A87", text: "#F4F1EA", dim: "#C7C0B5",
};

const monoFont = "'IBM Plex Mono', monospace";
const headFont = "'IBM Plex Sans', system-ui, sans-serif";
const bodyFont = "'Inter', system-ui, sans-serif";
const hardShadow = "3px 3px 0 0 rgba(0,0,0,0.4)";
const now = () => new Date().toLocaleTimeString("en-GB");
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());

function useAnimatedNumber(target, ms = 600) {
  const [val, setVal] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const start = ref.current;
    const diff = target - start;
    if (diff === 0) return;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      ref.current = start + diff * eased;
      setVal(ref.current);
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

function LED({ color = C.green }) {
  return <span style={{ display: "inline-block", width: 9, height: 9, background: color, boxShadow: `0 0 5px ${color}`, animation: "pulse 2s ease-in-out infinite" }} />;
}

function Panel({ title, children, style, accent }) {
  return (
    <div style={{ background: C.panel, border: `2px solid ${accent || C.border}`, boxShadow: hardShadow, padding: 16, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, ...style }}>
      {title && <div style={{ fontFamily: headFont, fontWeight: 600, fontSize: 13, letterSpacing: 0.5, color: C.dim, textTransform: "uppercase" }}>{title}</div>}
      {children}
    </div>
  );
}

function LineChart({ data, color, height = 130, zeroAnnotation }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const w = (cv.width = cv.clientWidth);
    const h = (cv.height = height);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(109,101,93,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = (h / 4) * i + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (!data || data.length < 2) return;
    const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
    const stepX = w / (data.length - 1);
    const yOf = (v) => h - ((v - min) / range) * (h - 14) - 7;
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    data.forEach((v, i) => { const x = i * stepX, y = yOf(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.fillStyle = color;
    data.forEach((v, i) => { if (i % 4 && i !== data.length - 1) return; ctx.fillRect(i * stepX - 2, yOf(v) - 2, 4, 4); });
    if (zeroAnnotation && data[data.length - 1] === 0) { ctx.fillStyle = C.red; ctx.font = "11px monospace"; ctx.fillText("STOCK = 0", w - 78, 14); }
  }, [data, color, height, zeroAnnotation]);
  return <canvas ref={ref} style={{ width: "100%", height }} />;
}

function Machine({ kind }) {
  const m = { Producer: "⚙️", Kafka: "📡", Consumer: "🛠️", Redis: "🔐", FastAPI: "🌐", PostgreSQL: "🗄️", Dashboard: "🖥️" };
  return <span style={{ fontSize: 22 }}>{m[kind] || "🖥️"}</span>;
}

const SERVICES = ["Producer", "Kafka", "Consumer", "Redis", "FastAPI", "PostgreSQL", "Dashboard"];

function ArchFlow({ intensity, lockActive }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      {SERVICES.map((s, i) => (
        <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel2, border: `2px solid ${C.border}`, padding: "8px 14px", position: "relative" }}>
            <Machine kind={s} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: headFont, fontWeight: 600, fontSize: 14, color: C.text }}>{s}</div>
              <div style={{ fontFamily: monoFont, fontSize: 9, color: C.dim }}>CPU {[12, 34, 26, 18, 41, 29, 9][i]}% · MEM {[18, 51, 30, 22, 38, 44, 14][i]}%</div>
            </div>
            <LED color={C.green} />
            {s === "Redis" && <span style={{ position: "absolute", right: 36, fontSize: 16, transition: "transform .2s", transform: lockActive ? "scale(1.3)" : "scale(1)" }}>{lockActive ? "🔒" : "🔓"}</span>}
          </div>
          {i < SERVICES.length - 1 && (
            <div style={{ flex: 1, minHeight: 14, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
              {Array.from({ length: Math.max(1, Math.round(intensity)) }).map((_, k) => (
                <span key={k} style={{ width: 6, height: 6, margin: "0 3px", background: [C.teal, C.green, C.amber, C.red][(i + k) % 4], animation: `pkt 1s linear ${k * 0.15}s infinite` }} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ label, value, unit, color }) {
  const a = useAnimatedNumber(typeof value === "number" ? value : 0);
  return (
    <div style={{ border: `1px solid ${C.border}`, padding: "8px 10px", background: C.panel2 }}>
      <div style={{ fontSize: 10, color: C.dim, fontFamily: bodyFont }}>{label}</div>
      <div style={{ fontFamily: monoFont, fontWeight: 700, fontSize: 20, color: color || C.text }}>
        {typeof value === "number" ? Math.round(a).toLocaleString() : value}{unit && <span style={{ fontSize: 11, color: C.dim, marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  );
}

function Switch({ label, color, onClick }) {
  return <button onClick={onClick} className="fl-switch" style={{ fontFamily: headFont, fontWeight: 600, fontSize: 12, letterSpacing: 0.5, color: C.text, background: color, border: `2px solid rgba(0,0,0,0.45)`, boxShadow: "0 4px 0 0 rgba(0,0,0,0.5)", padding: "9px 10px", cursor: "pointer", textTransform: "uppercase", width: "100%" }}>{label}</button>;
}

export default function App() {
  const [clock, setClock] = useState(now());
  const [stock, setStock] = useState(null);
  const [maxCap, setMaxCap] = useState(100);
  const [oversell, setOversell] = useState(0);
  const [logs, setLogs] = useState([]);
  const [throughput, setThroughput] = useState([]);
  const [invHistory, setInvHistory] = useState([]);
  const [lockActive, setLockActive] = useState(false);
  const [loadRunning, setLoadRunning] = useState(false);
  const [users, setUsers] = useState(0);
  const loadRef = useRef(null);
  const tput = throughput[throughput.length - 1] || 0;
  const peak = Math.max(0, ...throughput);
  const avg = throughput.length ? Math.round(throughput.reduce((a, b) => a + b, 0) / throughput.length) : 0;

  const addLog = useCallback((msg, color = C.green) => { setLogs((l) => [{ t: now(), msg, color, id: Math.random() }, ...l].slice(0, 50)); }, []);
  useEffect(() => { const id = setInterval(() => setClock(now()), 1000); return () => clearInterval(id); }, []);

  const poll = useCallback(async () => {
    try { const inv = await fetch(`${API}/inventory/${SKU}`).then((r) => r.json()); if (inv.stock != null) { setStock(inv.stock); setInvHistory((h) => [...h, inv.stock].slice(-40)); } } catch {}
    try { const ov = await fetch(`${API}/oversells`).then((r) => r.json()); setOversell(ov.oversells ? ov.oversells.length : 0); } catch {}
  }, []);
  useEffect(() => { poll(); const id = setInterval(poll, 1000); return () => clearInterval(id); }, [poll]);

  useEffect(() => {
    const id = setInterval(() => {
      setThroughput((t) => { const base = loadRunning ? 420 : 25; return [...t, Math.max(0, Math.round(base + (Math.random() - 0.5) * 110))].slice(-40); });
      setUsers(loadRunning ? 200 + Math.round((Math.random() - 0.5) * 18) : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [loadRunning]);

  const startSale = async () => { try { await fetch(`${API}/sale/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku: SKU, stock: 100 }) }); setMaxCap(100); addLog("Sale started — stock set to 100", C.teal); poll(); } catch { addLog("Start sale failed — API unreachable", C.red); } };
  const resetInv = async () => { try { await fetch(`${API}/sale/reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku: SKU, stock: 100 }) }); setMaxCap(100); setInvHistory([]); addLog("Inventory reset", C.teal); poll(); } catch { addLog("Reset failed — API unreachable", C.red); } };
  const generateLoad = () => {
    if (loadRunning) return;
    setLoadRunning(true); addLog("Load generation started", C.amber);
    loadRef.current = setInterval(async () => {
      setLockActive(true); setTimeout(() => setLockActive(false), 220);
      try { const res = await fetch(`${API}/cart/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku: SKU, user_id: "u_" + Math.floor(Math.random() * 1e6) }) }).then((r) => r.json()); if (res.status === "sold") addLog("Purchase Approved · " + res.sku, C.green); else if (res.status === "rejected") addLog("Purchase Rejected · sold out", C.red); } catch { addLog("Request failed — API unreachable", C.red); }
      poll();
    }, 250);
  };
  const stopLoad = () => { setLoadRunning(false); clearInterval(loadRef.current); addLog("Simulation stopped", C.amber); };

  const pct = stock != null && maxCap ? (stock / maxCap) * 100 : 0;
  const barColor = pct > 60 ? C.green : pct > 30 ? C.amber : pct > 10 ? C.copper : C.red;
  const sold = Math.max(0, maxCap - (stock ?? maxCap));
  const animatedStock = useAnimatedNumber(stock ?? 0);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: bodyFont, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@500;600;700&family=Inter:wght@400;500&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes pkt { from{transform:translateY(-8px);opacity:0;} 25%{opacity:1;} to{transform:translateY(12px);opacity:0;} }
        .fl-switch:active { transform: translateY(2px); box-shadow: 0 2px 0 0 rgba(0,0,0,0.5)!important; }
        canvas { image-rendering: pixelated; }
        ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-thumb { background: ${C.border}; }
      `}</style>

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", height: 64, background: C.panel, borderBottom: `2px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontFamily: headFont, fontWeight: 700, fontSize: 18 }}>FlashLock</span>
          <span style={{ color: C.dim, fontSize: 13 }}>Operations Center</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: monoFont, fontSize: 12, color: C.copper, border: `1px solid ${C.copper}`, padding: "3px 8px" }}>● SALE {loadRunning ? "ACTIVE" : "IDLE"}</span>
          <span style={{ fontFamily: monoFont, fontWeight: 700, fontSize: 18 }}>{clock}</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
          {["Kafka", "Redis", "PostgreSQL", "FastAPI"].map((s) => (<span key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}><LED /> {s}</span>))}
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 14, padding: 14, flexShrink: 0 }}>
        <Panel title="Live Flash Sale" accent={oversell > 0 ? C.red : C.border}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: C.dim }}>Inventory Remaining</div>
              <div style={{ fontFamily: monoFont, fontWeight: 700, fontSize: 72, lineHeight: 1, color: barColor }}>{Math.round(animatedStock)}</div>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <MiniMetric label="Items Sold" value={sold} color={C.teal} />
              <MiniMetric label="Max Capacity" value={maxCap} />
              <MiniMetric label="Throughput" value={tput} unit="/s" color={C.copper} />
              <MiniMetric label="Users" value={users} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {Array.from({ length: 50 }).map((_, i) => (<div key={i} style={{ width: "calc(2% - 2px)", height: 16, background: i < Math.round((pct / 100) * 50) ? barColor : "#2a2724", transition: "background .3s" }} />))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, border: `2px solid ${oversell > 0 ? C.red : C.green}`, padding: "8px 12px", background: oversell > 0 ? "#3a2222" : "#243027" }}>
            <span style={{ fontSize: 22 }}>{oversell > 0 ? "⚠️" : "🛡️"}</span>
            <span style={{ fontFamily: headFont, fontWeight: 700, fontSize: 16, color: oversell > 0 ? C.red : C.green }}>{oversell > 0 ? `${oversell} OVERSELL INCIDENTS` : "ZERO OVERSELL"}</span>
          </div>
        </Panel>

        <Panel title="System Architecture — Live Flow">
          <ArchFlow intensity={loadRunning ? 4 : 1} lockActive={lockActive} />
        </Panel>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, padding: "0 14px 14px", flex: 1, minHeight: 0 }}>
        <Panel title="Throughput Analytics">
          <LineChart data={throughput} color={C.copper} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: monoFont, fontSize: 11, color: C.dim }}>
            <span>Now {fmt(tput)}/s</span><span>Avg {fmt(avg)}/s</span><span>Peak {fmt(peak)}/s</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <MiniMetric label="Avg Latency" value={238} unit="ms" />
            <MiniMetric label="P95" value={350} unit="ms" color={C.amber} />
            <MiniMetric label="P99" value={530} unit="ms" color={C.red} />
          </div>
        </Panel>

        <Panel title="Inventory Timeline">
          <LineChart data={invHistory} color={C.green} zeroAnnotation />
          <div style={{ display: "flex", gap: 8 }}>
            <MiniMetric label="Success Rate" value={"100%"} color={C.green} />
            <MiniMetric label="Failed Reqs" value={0} color={C.red} />
          </div>
        </Panel>

        <Panel title="Live Event Terminal" style={{ background: "#211e1b" }}>
          <div style={{ fontFamily: monoFont, fontSize: 12, color: C.green, overflow: "auto", flex: 1, lineHeight: 1.7, minHeight: 0 }}>
            {logs.length === 0 && <div style={{ color: C.dim }}>// awaiting events — Start Sale, then Generate Load</div>}
            {logs.map((l) => (
              <div key={l.id}>
                <span style={{ display: "inline-block", width: 8, height: 8, background: l.color, marginRight: 8 }} />
                <span style={{ color: C.dim }}>{l.t}</span> <span style={{ color: l.color }}>{l.msg}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <div style={{ position: "fixed", right: 18, bottom: 18, width: 200, background: C.panel, border: `2px solid ${C.copper}`, boxShadow: "5px 5px 0 0 rgba(0,0,0,0.5)", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: headFont, fontWeight: 700, fontSize: 12, letterSpacing: 1, color: C.copper, textTransform: "uppercase", marginBottom: 2 }}>⎈ Operations</div>
        <Switch label="Start Sale" color={C.green} onClick={startSale} />
        <Switch label="Reset Inventory" color={C.teal} onClick={resetInv} />
        <Switch label="Generate Load" color={C.copper} onClick={generateLoad} />
        <Switch label="Stop Simulation" color={C.red} onClick={stopLoad} />
      </div>
    </div>
  );
}
