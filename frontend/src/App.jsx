import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const API = "http://localhost:8000";

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#050505",
  surface:   "#131313",
  surfLow:   "#0e0e0e",
  surfMid:   "#1c1b1b",
  surfHigh:  "#2a2a2a",
  cyan:      "#00d4ff",
  cyanDim:   "#3cd7ff",
  cyanSoft:  "#a8e8ff",
  green:     "#00ff88",
  greenDim:  "#00e479",
  violet:    "#d0bcff",
  violetMid: "#8b5cf6",
  red:       "#ff5449",
  amber:     "#ffb4ab",
  text:      "#e5e2e1",
  muted:     "#bbc9cf",
  border:    "#3c494e",
  soft:      "rgba(60,73,78,0.35)",
};

const TYPE_COLOR = {
  commit:       C.cyanDim,
  pull_request: C.greenDim,
  issue:        C.amber,
  postmortem:   C.red,
};

// ─────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = C.muted, style = {} }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1, flexShrink: 0, ...style }}>{name}</span>
);

const Chip = ({ children, color = C.cyan, small }) => (
  <span className="mono" style={{
    background: color + "18", color, border: `1px solid ${color}33`,
    borderRadius: 4, padding: small ? "1px 6px" : "2px 8px",
    fontSize: small ? 10 : 11, letterSpacing: "0.05em", textTransform: "uppercase",
  }}>{children}</span>
);

const Btn = ({ children, onClick, color = C.cyan, disabled, full, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? C.surfMid : color + "18",
    border: `1px solid ${disabled ? C.soft : color + "40"}`,
    color: disabled ? C.muted : color,
    borderRadius: 6, padding: "7px 16px", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
    width: full ? "100%" : "auto", transition: "all 0.15s", ...style,
  }}>{children}</button>
);

// ─────────────────────────────────────────────────────────────
// SHARED LAYOUT
// ─────────────────────────────────────────────────────────────
const NAV = [
  { id: "graph",     icon: "hub",          label: "Neural Graph" },
  { id: "surgery",   icon: "terminal",     label: "Surgery"      },
  { id: "pulse",     icon: "analytics",    label: "Pulse"        },
  { id: "repo",      icon: "account_tree", label: "Repository"   },
];

function AppShell({ page, setPage, status, setStatus, children }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="scanline" />

      {/* ── Top nav ────────────────────────────────────────── */}
      <nav className="glass" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 64,
        display: "flex", alignItems: "center", padding: "0 24px",
        justifyContent: "space-between", boxShadow: "0 0 20px rgba(0,212,255,0.07)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="biotech" size={22} color={C.cyan} />
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: C.cyanSoft }}>Memory Surgeon</span>
          <div style={{ width: 1, height: 16, background: C.soft, margin: "0 8px" }} />
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} className="mono" style={{
              background: page === n.id ? C.cyan + "12" : "none",
              border: "none", borderBottom: `2px solid ${page === n.id ? C.cyan : "transparent"}`,
              color: page === n.id ? C.cyan : C.muted,
              padding: "4px 12px", cursor: "pointer", fontSize: 11,
              letterSpacing: "0.05em", textTransform: "uppercase", transition: "all 0.15s",
            }}>{n.label}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", background: C.surfLow, border: `1px solid ${C.soft}`, borderRadius: 8, padding: "6px 12px", width: 240 }}>
          <Icon name="search" size={16} color={C.muted} style={{ marginRight: 8 }} />
          <input placeholder="Filter Neural Web..." className="mono" style={{ background: "none", border: "none", outline: "none", color: C.text, fontSize: 12, width: "100%" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.green + "10", border: `1px solid ${C.green}22`, borderRadius: 999, padding: "4px 12px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} className="pulse" />
            <span className="mono" style={{ fontSize: 10, color: C.green, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {status?.ingested ? "Memory Active" : "No Memory"}
            </span>
          </div>
          {["memory", "settings"].map(ic => <Icon key={ic} name={ic} size={20} color={C.muted} style={{ cursor: "pointer" }} />)}
        </div>
      </nav>

      {/* ── Left sidebar ────────────────────────────────────── */}
      <aside style={{
        position: "fixed", left: 0, top: 64, bottom: 0, width: 240, zIndex: 40,
        background: C.surfLow, borderRight: `1px solid ${C.soft}`,
        display: "flex", flexDirection: "column", padding: "20px 0",
      }}>
        {/* Profile badge */}
        <div style={{ padding: "0 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.cyan + "20", border: `1px solid ${C.cyan}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="person" size={16} color={C.cyan} />
            </div>
            <div>
              <div className="mono" style={{ fontSize: 11, color: C.cyan }}>Surgeon Profile</div>
              <div className="mono" style={{ fontSize: 9, color: C.green, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Logic Sync: Active</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
              background: page === n.id ? C.cyan + "08" : "none",
              borderLeft: `2px solid ${page === n.id ? C.cyan : "transparent"}`,
              border: "none",
              color: page === n.id ? C.cyan : C.muted,
              cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%",
            }}>
              <Icon name={n.icon} size={20} color={page === n.id ? C.cyan : C.muted} />
              <span className="mono" style={{ fontSize: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{n.label}</span>
            </button>
          ))}
          <button onClick={() => setPage("history")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "none", border: "none", color: C.muted, cursor: "pointer", textAlign: "left", width: "100%" }}>
            <Icon name="history" size={20} color={C.muted} />
            <span className="mono" style={{ fontSize: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>History</span>
          </button>
        </div>

        {/* Stats */}
        <div style={{ padding: "16px", borderTop: `1px solid ${C.soft}` }}>
          {[
            { label: "Nodes", val: status?.node_count || 108, color: C.cyan },
            { label: "Edges", val: status?.edge_count || 159, color: C.green },
            { label: "Records", val: status?.record_count || 10, color: C.violet },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</span>
              <span className="mono" style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.val}</span>
            </div>
          ))}
        </div>

        {/* Ingest button */}
        <div style={{ padding: "0 12px 16px" }}>
          <button onClick={() => setPage("repo")} style={{
            width: "100%", background: `linear-gradient(135deg, ${C.cyan}, #0099bb)`,
            color: "#001f27", border: "none", borderRadius: 8, padding: "10px 0",
            cursor: "pointer", fontWeight: 700, fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em",
          }}>
            ↑ Ingest Repository
          </button>
        </div>

        {/* Bottom links */}
        <div style={{ borderTop: `1px solid ${C.soft}`, padding: "12px 16px" }}>
          {[["settings", "Settings"], ["help", "Support"]].map(([ic, label]) => (
            <div key={ic} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer", color: C.muted }}>
              <Icon name={ic} size={18} color={C.muted} />
              <span className="mono" style={{ fontSize: 11 }}>{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────── */}
      <main style={{ marginLeft: 240, marginTop: 64, minHeight: "calc(100vh - 64px)" }}>
        {children}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 1: LANDING
// ─────────────────────────────────────────────────────────────
const TYPING = [
  "recall('why was auth middleware changed?')",
  "remember('PR #89: MongoDB migration rejected')",
  "risk_check('migrate PostgreSQL to MongoDB')",
  "improve() // reweighting 108 nodes...",
  "forget(node_set='deprecated_branch')",
];

function LandingPage({ onEnter }) {
  const [display, setDisplay] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const line = TYPING[lineIdx];
    let t;
    if (!deleting && charIdx < line.length) {
      t = setTimeout(() => { setDisplay(line.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, 42);
    } else if (!deleting && charIdx === line.length) {
      t = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && charIdx > 0) {
      t = setTimeout(() => { setDisplay(line.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }, 16);
    } else {
      setDeleting(false);
      setLineIdx(i => (i + 1) % TYPING.length);
    }
    return () => clearTimeout(t);
  }, [charIdx, deleting, lineIdx]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, position: "relative", overflow: "hidden" }}>
      <div className="scanline" />

      {/* Ambient orbs */}
      {[
        ["20%", "8%", 700, C.cyan + "06"],
        ["55%", "5%", 500, C.violetMid + "06"],
        ["70%", "30%", 400, C.green + "04"],
      ].map(([top, left, size, bg], i) => (
        <div key={i} style={{ position: "fixed", top, left, width: size, height: size, background: `radial-gradient(circle, ${bg}, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
      ))}

      {/* Top nav */}
      <header className="glass" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 64, display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="biotech" size={22} color={C.cyan} />
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: C.cyanSoft }}>Memory Surgeon</span>
          <div style={{ width: 1, height: 16, background: C.soft, margin: "0 8px" }} />
          {["Neural Graph", "Surgery", "Pulse"].map((label, i) => (
            <span key={label} className="mono" style={{ fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: i === 0 ? C.cyan : C.muted, borderBottom: i === 0 ? `1px solid ${C.cyan}` : "none", paddingBottom: 2, cursor: "pointer" }}>{label}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["memory", "terminal", "settings"].map(ic => <Icon key={ic} name={ic} size={20} color={C.muted} style={{ cursor: "pointer" }} />)}
        </div>
      </header>

      {/* Hero */}
      <main style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 40px", textAlign: "center" }}>

        <div className="glass fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, border: `1px solid ${C.cyan}20`, marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} className="pulse" />
          <span className="mono" style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Neural Synapse Active</span>
        </div>

        <h1 className="fade-up d1" style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, maxWidth: 760 }}>
          Codebases that operate{" "}
          <span className="grad-cyan">with total recall.</span>
        </h1>

        <p className="fade-up d2" style={{ fontSize: 17, color: C.muted, maxWidth: 580, lineHeight: 1.7, marginBottom: 48 }}>
          Every commit, PR, and incident — transformed into a living knowledge graph.
          Ask <em style={{ color: C.cyan }}>why</em> code was written, catch repeated mistakes, and preserve institutional memory forever.
        </p>

        {/* Input */}
        <div className="fade-up d3" style={{ width: "100%", maxWidth: 560, marginBottom: 20 }}>
          <div style={{ position: "relative", background: C.surfLow, border: `1px solid ${C.soft}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", transition: "border-color 0.2s" }}>
            <Icon name="terminal" size={20} color={C.cyan} style={{ marginRight: 12 }} />
            <input placeholder="Enter repository URL to begin surgery..." className="mono" style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 13 }} />
            <button onClick={onEnter} style={{ background: `linear-gradient(135deg, ${C.cyan}, #0099bb)`, color: "#001f27", padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 12, whiteSpace: "nowrap" }}>
              Begin Surgery →
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="fade-up d3" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 52 }}>
          {["#root-cause", "#architecture-audit", "#refactor-history", "#incident-recall", "#tribal-knowledge"].map(t => (
            <span key={t} className="mono" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.soft}`, color: C.muted, padding: "3px 10px", borderRadius: 4, fontSize: 11 }}>{t}</span>
          ))}
        </div>

        {/* Terminal card */}
        <div className="glass glow-green fade-up d4" style={{ borderRadius: 10, padding: 20, width: "100%", maxWidth: 540, borderLeft: `3px solid ${C.green}`, textAlign: "left", marginBottom: 56 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, opacity: 0.5 }}>
            {[C.red, C.amber, C.green].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          </div>
          <div className="mono" style={{ fontSize: 13 }}>
            <span style={{ color: C.green, fontWeight: 700 }}>surgeon@prompt:~$ </span>
            <span style={{ color: C.text }}>{display}</span>
            <span className="cursor" />
          </div>
        </div>

        {/* Stats */}
        <div className="fade-up d4" style={{ display: "flex", gap: 48, justifyContent: "center", flexWrap: "wrap" }}>
          {[["108", "Graph Nodes"], ["159", "Relationships"], ["4", "Cognee APIs"], ["∞", "Tribal Memory"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: C.cyan, letterSpacing: "-0.03em" }}>{v}</div>
              <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 2: NEURAL GRAPH (D3 force graph, full screen)
// ─────────────────────────────────────────────────────────────
const GRAPH_NODES = [
  { id:"auth",    label:"Auth Middleware",  type:"commit",       weight:3 },
  { id:"jwt",     label:"JWT Tokens",       type:"commit",       weight:2 },
  { id:"utc",     label:"UTC Fix",          type:"commit",       weight:2 },
  { id:"pr42",    label:"DB Pool PR#42",    type:"pull_request", weight:3 },
  { id:"ws",      label:"WebSocket PR#67",  type:"pull_request", weight:3 },
  { id:"poll",    label:"REST Polling",     type:"issue",        weight:1 },
  { id:"redis",   label:"Redis Outage#31",  type:"postmortem",   weight:3 },
  { id:"cache",   label:"Cache Collision",  type:"postmortem",   weight:2 },
  { id:"mongo",   label:"MongoDB PR#89",    type:"pull_request", weight:3 },
  { id:"pg",      label:"PostgreSQL",       type:"commit",       weight:2 },
  { id:"cors",    label:"CORS #44",         type:"issue",        weight:2 },
  { id:"rate",    label:"Rate Limiting",    type:"commit",       weight:2 },
  { id:"memleak", label:"Memory Leak#17",   type:"issue",        weight:2 },
  { id:"nginx",   label:"Nginx #52",        type:"postmortem",   weight:2 },
  { id:"pay",     label:"Payment Revert",   type:"commit",       weight:2 },
];
const GRAPH_LINKS = [
  { source:"auth",  target:"jwt",   label:"fixes"        },
  { source:"jwt",   target:"utc",   label:"caused_by"    },
  { source:"ws",    target:"poll",  label:"replaces"     },
  { source:"redis", target:"cache", label:"caused_by"    },
  { source:"mongo", target:"pg",    label:"rejected_for" },
  { source:"memleak",target:"ws",   label:"fixed_by"     },
  { source:"rate",  target:"auth",  label:"protects"     },
  { source:"pay",   target:"pr42",  label:"similar_risk" },
  { source:"redis", target:"mongo", label:"informed"     },
  { source:"cors",  target:"auth",  label:"related"      },
  { source:"nginx", target:"cors",  label:"related"      },
];

function NeuralGraphPage() {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const svgSel = useRef(null);
  const [zoom, setZoom] = useState(100);
  const [selected, setSelected] = useState(null);
  const [riskInput, setRiskInput] = useState("");
  const [riskResult, setRiskResult] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);

  useEffect(() => {
    if (!svgRef.current) return;
    const el = svgRef.current;
    const W = el.clientWidth || 900, H = el.clientHeight || 600;
    const svg = d3.select(el);
    svg.selectAll("*").remove();
    svgSel.current = svg;

    const defs = svg.append("defs");
    const glowMap = { commit:"cyan", pull_request:"green", issue:"amber", postmortem:"red" };
    const glowColors = { cyan: C.cyanDim, green: C.greenDim, amber: C.amber, red: C.red };
    Object.entries(glowColors).forEach(([name, col]) => {
      const f = defs.append("filter").attr("id", `gfx-${name}`).attr("x","-50%").attr("y","-50%").attr("width","200%").attr("height","200%");
      f.append("feGaussianBlur").attr("in","SourceGraphic").attr("stdDeviation",5).attr("result","blur");
      const m = f.append("feMerge"); m.append("feMergeNode").attr("in","blur"); m.append("feMergeNode").attr("in","SourceGraphic");
    });
    defs.append("marker").attr("id","arr").attr("viewBox","0 -5 10 10").attr("refX",24).attr("refY",0).attr("markerWidth",5).attr("markerHeight",5).attr("orient","auto")
      .append("path").attr("d","M0,-5L10,0L0,5").attr("fill","rgba(60,73,78,0.5)");

    const g = svg.append("g");
    const z = d3.zoom().scaleExtent([0.15,5]).on("zoom", ev => { g.attr("transform",ev.transform); setZoom(Math.round(ev.transform.k*100)); });
    zoomRef.current = z;
    svg.call(z);

    const nodes = GRAPH_NODES.map(n => ({...n}));
    const links = GRAPH_LINKS.map(l => ({...l}));

    // Grid dots
    const grid = g.append("g").attr("opacity", 0.04);
    for(let x=0; x<W+50; x+=40) for(let y=0; y<H+50; y+=40)
      grid.append("circle").attr("cx",x).attr("cy",y).attr("r",1).attr("fill",C.muted);

    const link = g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke","rgba(60,73,78,0.35)").attr("stroke-width",1).attr("stroke-dasharray","4,4").attr("marker-end","url(#arr)");

    const linkText = g.append("g").selectAll("text").data(links).enter().append("text")
      .attr("font-size",9).attr("fill","rgba(133,147,152,0.4)").attr("font-family","JetBrains Mono,monospace")
      .attr("text-anchor","middle").text(d=>d.label);

    const node = g.append("g").selectAll("g").data(nodes).enter().append("g").style("cursor","pointer")
      .call(d3.drag()
        .on("start",(ev,d)=>{ if(!ev.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on("drag", (ev,d)=>{ d.fx=ev.x; d.fy=ev.y; })
        .on("end",  (ev,d)=>{ if(!ev.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }))
      .on("click",(ev,d)=>{ ev.stopPropagation(); setSelected(d); link.attr("stroke",l=>(l.source.id===d.id||l.target.id===d.id)?TYPE_COLOR[d.type]:"rgba(60,73,78,0.2)"); });

    const col = d => TYPE_COLOR[d.type] || C.muted;
    node.append("circle").attr("r",d=>d.weight*9+5).attr("fill","none").attr("stroke",d=>col(d)).attr("stroke-width",0.4).attr("opacity",0.15);
    node.append("circle").attr("r",d=>d.weight*9).attr("fill",d=>col(d)+"22").attr("stroke",d=>col(d)).attr("stroke-width",1.5)
      .attr("filter",d=>`url(#gfx-${glowMap[d.type]||"cyan"})`);
    node.append("text").attr("text-anchor","middle").attr("dy",d=>d.weight*9+14).attr("font-size",9)
      .attr("font-family","JetBrains Mono,monospace").attr("fill",C.text).attr("opacity",0.75)
      .text(d=>d.label.length>16?d.label.slice(0,15)+"…":d.label);

    const sim = d3.forceSimulation(nodes)
      .force("link",d3.forceLink(links).id(d=>d.id).distance(100))
      .force("charge",d3.forceManyBody().strength(-340))
      .force("center",d3.forceCenter(W/2,H/2))
      .force("coll",d3.forceCollide().radius(32));

    sim.on("tick",()=>{
      link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
      linkText.attr("x",d=>(d.source.x+d.target.x)/2).attr("y",d=>(d.source.y+d.target.y)/2);
      node.attr("transform",d=>`translate(${d.x},${d.y})`);
    });
    svg.on("click",()=>{ setSelected(null); link.attr("stroke","rgba(60,73,78,0.35)"); });
    return ()=>sim.stop();
  }, []);

  const doZoom = delta => svgSel.current?.transition().duration(250).call(zoomRef.current.scaleBy, delta);
  const resetZoom = () => svgSel.current?.transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity);

  async function checkRisk() {
    if(!riskInput.trim()) return;
    setRiskLoading(true);
    try {
      const r = await fetch(`${API}/risk-check`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({change_description:riskInput})});
      setRiskResult(await r.json());
    } catch(e) { setRiskResult({risk_level:"error",message:e.message}); }
    setRiskLoading(false);
  }

  const col = selected ? (TYPE_COLOR[selected.type] || C.cyan) : C.cyan;

  return (
    <div style={{ position:"fixed", top:64, left:240, right:0, bottom:0 }}>
      <svg ref={svgRef} style={{ width:"100%", height:"100%", background:C.bg, display:"block" }} />

      {/* Zoom toolbar */}
      <div className="glass glow-green" style={{ position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:4, padding:"4px 8px", borderRadius:999 }}>
        {[["add",()=>doZoom(1.3)],["remove",()=>doZoom(0.77)],["restart_alt",resetZoom]].map(([ic,fn])=>(
          <button key={ic} onClick={fn} style={{ width:36,height:36,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Icon name={ic} size={18} color={C.cyan} />
          </button>
        ))}
        <div style={{ width:1,height:16,background:C.soft,margin:"0 4px" }} />
        <span className="mono" style={{ fontSize:11,color:C.muted,padding:"0 8px" }}>Zoom: {zoom}%</span>
      </div>

      {/* Legend */}
      <div className="glass" style={{ position:"absolute",top:16,left:16,padding:"10px 14px",borderRadius:8 }}>
        {[["COMMIT",C.cyanDim],["PULL REQUEST",C.greenDim],["ISSUE",C.amber],["POST-MORTEM",C.red]].map(([l,c])=>(
          <div key={l} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:c+"44",border:`1px solid ${c}` }} />
            <span className="mono" style={{ fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em" }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Right panel — slides in on node click */}
      <div className="glass" style={{
        position:"absolute", right:0, top:0, bottom:0, width:300, zIndex:30,
        borderLeft:`1px solid ${C.soft}`, padding:20,
        display:"flex", flexDirection:"column", gap:16, overflowY:"auto",
        transform: selected ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {selected && <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div>
              <Chip color={col} small>{selected.type.replace("_"," ")}</Chip>
              <div style={{ fontWeight:600,fontSize:16,marginTop:8,letterSpacing:"-0.01em" }}>{selected.label}</div>
            </div>
            <button onClick={()=>setSelected(null)} style={{ background:"none",border:"none",cursor:"pointer" }}>
              <Icon name="close" size={18} color={C.muted} />
            </button>
          </div>

          <div style={{ background:C.surfLow,border:`1px solid ${C.soft}`,borderRadius:10,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div className="mono" style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4 }}>Risk Score</div>
              <div style={{ fontSize:26,fontWeight:800,color:selected.weight>2?C.amber:C.green }}>{selected.weight>2?"HIGH":"LOW"}</div>
            </div>
            <div style={{ width:44,height:44,borderRadius:"50%",border:`2px solid ${selected.weight>2?C.amber:C.green}30`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon name="security" size={22} color={selected.weight>2?C.amber:C.green} />
            </div>
          </div>

          <div style={{ background:C.surfLow,border:`1px solid ${C.soft}`,borderRadius:8,padding:14 }}>
            <div className="mono" style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8 }}>Node Intelligence</div>
            <div style={{ fontSize:13,color:C.text,lineHeight:1.65 }}>
              This {selected.type.replace("_"," ")} node connects to {selected.weight+1} related decision records in the knowledge graph.
            </div>
          </div>

          {/* Inline risk check */}
          <div>
            <div className="mono" style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8 }}>Quick Risk Check</div>
            <textarea value={riskInput} onChange={e=>setRiskInput(e.target.value)} placeholder={`Describe a change related to ${selected.label}...`} rows={3}
              style={{ width:"100%",background:C.surfLow,border:`1px solid ${C.soft}`,borderRadius:6,padding:10,color:C.text,fontSize:12,fontFamily:"JetBrains Mono,monospace",resize:"none",outline:"none" }} />
            <Btn onClick={checkRisk} disabled={riskLoading} color={col} full style={{ marginTop:8 }}>
              {riskLoading ? "Checking memory..." : "⚡ Check Risk"}
            </Btn>
            {riskResult && (
              <div style={{ marginTop:10,padding:12,borderRadius:6,background:riskResult.risk_level==="high"?C.red+"12":C.green+"12",border:`1px solid ${riskResult.risk_level==="high"?C.red:C.green}33`,fontSize:12,lineHeight:1.65,color:C.text }}>
                <div style={{ fontWeight:700,color:riskResult.risk_level==="high"?C.red:C.green,marginBottom:4 }}>
                  {riskResult.risk_level==="high"?"🚨 HIGH RISK":"✅ LOW RISK"}
                </div>
                {riskResult.message?.slice(0,220)}
              </div>
            )}
          </div>
        </>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 3: PULSE / INTELLIGENCE DASHBOARD
// ─────────────────────────────────────────────────────────────
function PulsePage({ status }) {
  const bars = [72,88,60,95,45,82,91,68,77,85,55,90];
  const activity = [
    { type:"commit", label:"feat: add rate limiting to /api/search", sha:"c5d6e7", time:"2h ago", color:C.cyanDim },
    { type:"postmortem", label:"[POSTMORTEM] Redis cache key collision — outage 45min", sha:"issue:31", time:"1d ago", color:C.red },
    { type:"pull_request", label:"PR #89 REJECTED: MongoDB migration — relational risk", sha:"pr:89", time:"3d ago", color:C.greenDim },
    { type:"issue", label:"ISSUE #44: CORS errors blocking mobile app in production", sha:"issue:44", time:"5d ago", color:C.amber },
    { type:"commit", label:"fix: JWT token expiry using UTC instead of local time", sha:"a1b2c3", time:"1w ago", color:C.cyanDim },
  ];

  return (
    <div style={{ height:"calc(100vh - 64px)", overflowY:"auto", padding:32 }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",borderBottom:`1px solid ${C.soft}`,paddingBottom:20,marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:28,fontWeight:700,letterSpacing:"-0.02em",color:C.text }}>Intelligence Dashboard</h1>
            <p style={{ color:C.muted,fontSize:14,marginTop:4 }}>Surgical overview of codebase cognitive health and structural integrity.</p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,background:C.surfMid,border:`1px solid ${C.soft}`,borderRadius:6,padding:"6px 12px" }}>
            <span style={{ width:8,height:8,borderRadius:"50%",background:C.green }} className="pulse" />
            <span className="mono" style={{ fontSize:10,color:C.green,textTransform:"uppercase",letterSpacing:"0.05em" }}>SYSTEM_LIVE</span>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28 }}>
          {[
            { label:"Graph Nodes",  val:status?.node_count||108,   icon:"hub",          color:C.cyan,   suffix:"+12" },
            { label:"Graph Edges",  val:status?.edge_count||159,   icon:"mediation",    color:C.green,  suffix:"+8"  },
            { label:"Records",      val:status?.record_count||10,  icon:"memory",       color:C.violet, suffix:"+2"  },
            { label:"Risk Flags",   val:"3",                        icon:"warning",      color:C.amber,  suffix:"high"},
          ].map(s=>(
            <div key={s.label} className="glass" style={{ borderRadius:12,padding:20,border:`1px solid ${s.color}18` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <span className="mono" style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em" }}>{s.label}</span>
                <Icon name={s.icon} size={18} color={s.color} />
              </div>
              <div style={{ fontSize:30,fontWeight:800,color:s.color,letterSpacing:"-0.03em" }}>{s.val}</div>
              <div className="mono" style={{ fontSize:10,color:C.muted,marginTop:6 }}>
                <span style={{ color:s.color }}>{s.suffix}</span> from last sync
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28 }}>
          {/* Activity chart */}
          <div className="glass" style={{ borderRadius:12,padding:20 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <div>
                <div style={{ fontWeight:600,fontSize:15 }}>Memory Activity</div>
                <div className="mono" style={{ fontSize:10,color:C.muted,marginTop:2 }}>GRAPH INGESTION FREQUENCY</div>
              </div>
              <Chip color={C.green} small>+14% this week</Chip>
            </div>
            <div style={{ display:"flex",alignItems:"flex-end",gap:6,height:100 }}>
              {bars.map((h,i)=>(
                <div key={i} style={{ flex:1,background:i===bars.length-1?C.cyan:C.cyan+"40",borderRadius:2,height:`${h}%`,transition:"all 0.3s" }} />
              ))}
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:8 }}>
              <span className="mono" style={{ fontSize:9,color:C.muted }}>Jun 22</span>
              <span className="mono" style={{ fontSize:9,color:C.muted }}>Today</span>
            </div>
          </div>

          {/* Cognee API usage */}
          <div className="glass" style={{ borderRadius:12,padding:20 }}>
            <div style={{ fontWeight:600,fontSize:15,marginBottom:4 }}>Cognee API Usage</div>
            <div className="mono" style={{ fontSize:10,color:C.muted,marginBottom:20 }}>MEMORY LIFECYCLE CALLS</div>
            {[
              { api:"remember()", val:10, total:50, color:C.cyan },
              { api:"recall()",   val:38, total:50, color:C.green },
              { api:"improve()",  val:8,  total:50, color:C.violet },
              { api:"forget()",   val:3,  total:50, color:C.red },
            ].map(a=>(
              <div key={a.api} style={{ marginBottom:14 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                  <span className="mono" style={{ fontSize:11,color:C.text }}>{a.api}</span>
                  <span className="mono" style={{ fontSize:11,color:a.color }}>{a.val} calls</span>
                </div>
                <div style={{ height:4,background:C.surfHigh,borderRadius:2 }}>
                  <div style={{ height:"100%",width:`${(a.val/a.total)*100}%`,background:a.color,borderRadius:2,transition:"width 1s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="glass" style={{ borderRadius:12,padding:20 }}>
          <div style={{ fontWeight:600,fontSize:15,marginBottom:4 }}>Recent Memory Events</div>
          <div className="mono" style={{ fontSize:10,color:C.muted,marginBottom:20 }}>COMMIT · ISSUE · PR · POSTMORTEM</div>
          {activity.map((a,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:16,padding:"12px 0",borderBottom:i<activity.length-1?`1px solid ${C.soft}`:"none" }}>
              <div style={{ width:4,height:40,background:a.color,borderRadius:2,flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,color:C.text,marginBottom:4 }}>{a.label}</div>
                <span className="mono" style={{ fontSize:10,color:a.color,background:a.color+"15",padding:"1px 6px",borderRadius:3 }}>{a.sha}</span>
              </div>
              <span className="mono" style={{ fontSize:10,color:C.muted,flexShrink:0 }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 4: SURGERY (Chat interface)
// ─────────────────────────────────────────────────────────────
function SurgeryPage({ status }) {
  const [messages, setMessages] = useState([
    { role:"assistant", id:0, content:"Memory graph online. I have access to your codebase's full decision history — commits, PRs, incidents, and architectural choices. Ask me anything.", citations:[] }
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  async function ask() {
    if(!query.trim()||loading) return;
    const q = query.trim(); setQuery(""); setLoading(true);
    setMessages(m=>[...m,{role:"user",id:Date.now(),content:q}]);
    const lid = Date.now()+1;
    setMessages(m=>[...m,{role:"assistant",id:lid,content:"",loading:true,citations:[]}]);
    try {
      const r = await fetch(`${API}/recall`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:q})});
      const data = await r.json();
      setMessages(m=>m.map(msg=>msg.id===lid?{...msg,content:data.answer,loading:false,citations:data.citations||[]}:msg));
    } catch(e) {
      setMessages(m=>m.map(msg=>msg.id===lid?{...msg,content:`❌ ${e.message}`,loading:false}:msg));
    }
    setLoading(false);
  }

  const SUGGESTIONS = [
    { q:"What caused the auth bug?", icon:"bug_report" },
    { q:"Why was MongoDB rejected?", icon:"storage" },
    { q:"What lessons from Redis outage?", icon:"warning" },
    { q:"Why switch to WebSocket?", icon:"hub" },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"calc(100vh - 64px)",background:C.surfLow }}>

      {/* Chat header */}
      <div className="glass" style={{ padding:"12px 24px",borderBottom:`1px solid ${C.soft}`,display:"flex",alignItems:"center",gap:12 }}>
        <Icon name="terminal" size={20} color={C.cyan} />
        <span style={{ fontWeight:700,fontSize:16,color:C.cyan,letterSpacing:"-0.01em" }}>Memory Surgeon Chat</span>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex",alignItems:"center",gap:8,background:C.violetMid+"15",border:`1px solid ${C.violetMid}33`,borderRadius:999,padding:"4px 12px" }}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:C.violetMid }} className="pulse" />
          <span className="mono" style={{ fontSize:10,color:C.violet,textTransform:"uppercase",letterSpacing:"0.05em" }}>AI Active — Graph Traversal Mode</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1,overflowY:"auto",padding:"24px 32px",maxWidth:900,margin:"0 auto",width:"100%" }}>

        {messages.length===1 && (
          <div style={{ marginBottom:28 }}>
            <div className="mono" style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12 }}>Suggested Queries</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              {SUGGESTIONS.map(s=>(
                <button key={s.q} onClick={()=>setQuery(s.q)} style={{ display:"flex",alignItems:"center",gap:10,background:C.surfMid,border:`1px solid ${C.soft}`,borderRadius:8,padding:"10px 14px",color:C.muted,fontSize:13,cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
                  <Icon name={s.icon} size={16} color={C.cyan} />
                  {s.q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg=>(
          <div key={msg.id} style={{ display:"flex",gap:14,marginBottom:24,flexDirection:msg.role==="user"?"row-reverse":"row",alignItems:"flex-start" }}>
            <div style={{ width:36,height:36,borderRadius:"50%",flexShrink:0,background:msg.role==="user"?C.cyan+"22":C.violetMid+"22",border:`1px solid ${msg.role==="user"?C.cyan:C.violetMid}44`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon name={msg.role==="user"?"person":"biotech"} size={16} color={msg.role==="user"?C.cyan:C.violet} />
            </div>
            <div style={{ maxWidth:"74%" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                <span className="mono" style={{ fontSize:10,color:msg.role==="user"?C.cyan:C.violet,textTransform:"uppercase",letterSpacing:"0.06em" }}>{msg.role==="user"?"You":"Memory Assistant"}</span>
                <div style={{ flex:1,height:1,background:`${C.soft}` }} />
              </div>
              <div style={{ background:msg.role==="user"?C.cyan+"10":C.surfMid,border:`1px solid ${msg.role==="user"?C.cyan+"25":C.soft}`,borderRadius:msg.role==="user"?"12px 4px 12px 12px":"4px 12px 12px 12px",padding:"12px 16px",fontSize:14,lineHeight:1.7,color:C.text,boxShadow:msg.role==="assistant"?"0 0 16px rgba(139,92,246,0.06)":"none" }}>
                {msg.loading?(
                  <span style={{ color:C.violet }}>
                    Querying knowledge graph<span className="typing-dot">.</span><span className="typing-dot" style={{ animationDelay:"0.2s" }}>.</span><span className="typing-dot" style={{ animationDelay:"0.4s" }}>.</span>
                  </span>
                ):msg.content}
              </div>
              {msg.citations?.length>0 && (
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginTop:8 }}>
                  {msg.citations.slice(0,3).map((c,i)=>(
                    <span key={i} className="mono" style={{ background:C.surfMid,border:`1px solid ${C.soft}`,borderRadius:4,padding:"2px 8px",fontSize:10,color:C.muted }}>
                      📎 {(typeof c==="string"?c:c.snippet||"").slice(0,45)}...
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding:20,borderTop:`1px solid ${C.soft}`,background:C.surfLow }}>
        <div style={{ maxWidth:900,margin:"0 auto",display:"flex",gap:12,alignItems:"center" }}>
          <div style={{ flex:1,display:"flex",alignItems:"center",background:C.bg,border:`1px solid ${C.soft}`,borderRadius:10,padding:"10px 16px" }}>
            <Icon name="terminal" size={16} color={C.cyan} style={{ marginRight:10 }} />
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()}
              placeholder="Ask why code was written this way... (Enter to send)"
              className="mono"
              style={{ flex:1,background:"none",border:"none",outline:"none",color:C.text,fontSize:13 }} />
          </div>
          <button onClick={ask} disabled={loading||!query.trim()} style={{ background:loading?C.surfMid:`linear-gradient(135deg,${C.cyan},#0099bb)`,color:loading?C.muted:"#001f27",border:"none",borderRadius:10,padding:"10px 20px",cursor:loading?"not-allowed":"pointer",fontWeight:700,fontSize:13,fontFamily:"'JetBrains Mono',monospace",transition:"all 0.15s" }}>
            {loading?"...":"Send →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE 5: REPOSITORY (Ops + Ingest + Tribal Report)
// ─────────────────────────────────────────────────────────────
function RepoPage({ status, setStatus }) {
  const [log, setLog] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [riskInput, setRiskInput] = useState("");
  const [riskResult, setRiskResult] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const addLog = (msg, color=C.muted) => setLog(l=>[...l,{msg,color,id:Date.now()}]);

  async function ingest(useSample=true) {
    setIngesting(true); setLog([]);
    addLog("🗑️ Clearing old memory...", C.amber);
    try {
      const r = await fetch(`${API}/ingest`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({use_sample:useSample})});
      const data = await r.json();
      addLog(`✅ Ingested ${data.records} decision records`, C.green);
      addLog(`📊 Knowledge graph: ${data.nodes} nodes, ${data.edges} edges`, C.cyan);
      addLog(`⚡ improve() completed — graph enriched`, C.violet);
      setStatus(s=>({...s,ingested:true,record_count:data.records,node_count:data.nodes,edge_count:data.edges}));
      addLog("🎉 Memory active and ready!", C.green);
    } catch(e) { addLog(`❌ ${e.message}`, C.red); }
    setIngesting(false);
  }

  async function improve() {
    addLog("⚡ Running improve()...", C.violet);
    try { await fetch(`${API}/improve`,{method:"POST"}); addLog("✅ Graph reweighted and enriched", C.green); }
    catch(e) { addLog(`❌ ${e.message}`, C.red); }
  }

  async function forget() {
    if(!confirm("Wipe all memory? This cannot be undone.")) return;
    await fetch(`${API}/forget`,{method:"DELETE"});
    setStatus(s=>({...s,ingested:false,record_count:0,node_count:0,edge_count:0}));
    setLog([]); addLog("🗑️ All memory cleared", C.amber);
  }

  async function generateReport() {
    setReportLoading(true); setReport(null);
    addLog("📋 Generating tribal knowledge report...", C.violet);
    try {
      const r = await fetch(`${API}/tribal-report`);
      const data = await r.json();
      setReport(data);
      addLog("✅ Tribal Knowledge Report generated!", C.green);
    } catch(e) { addLog(`❌ ${e.message}`, C.red); }
    setReportLoading(false);
  }

  async function checkRisk() {
    if(!riskInput.trim()) return;
    setRiskLoading(true);
    try {
      const r = await fetch(`${API}/risk-check`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({change_description:riskInput})});
      setRiskResult(await r.json());
    } catch(e) { setRiskResult({risk_level:"error",message:e.message}); }
    setRiskLoading(false);
  }

  function downloadReport() {
    if(!report) return;
    const md = `# ${report.title}\n${report.subtitle}\n_${report.generated_at}_\n\n`+
      report.sections?.map(s=>`## ${s.title}\n${s.content}`).join("\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md],{type:"text/markdown"}));
    a.download = "tribal-knowledge.md"; a.click();
  }

  return (
    <div style={{ height:"calc(100vh - 64px)",overflowY:"auto",padding:32 }}>
      <div style={{ maxWidth:1100,margin:"0 auto" }}>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>

          {/* Left column — Memory Operations */}
          <div>
            <h2 style={{ fontSize:20,fontWeight:700,letterSpacing:"-0.02em",marginBottom:4 }}>Memory Operations</h2>
            <p style={{ color:C.muted,fontSize:13,marginBottom:24 }}>Cognee memory lifecycle APIs — remember, recall, improve, forget.</p>

            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {[
                { api:"remember()", icon:"memory", label:"Ingest Sample Data", desc:"Load 10 decision records into knowledge graph", action:()=>ingest(true), color:C.cyan, loading:ingesting },
                { api:"remember()", icon:"hub", label:"Ingest GitHub Repo", desc:"Fetch real commits + issues from your repo", action:()=>ingest(false), color:C.cyanDim, loading:ingesting },
                { api:"improve()", icon:"auto_awesome", label:"Enrich Graph", desc:"Reweight nodes, derive new triplets, prune stale edges", action:improve, color:C.violet },
                { api:"memify()", icon:"description", label:"Generate Tribal Report", desc:"Auto-generate onboarding document from memory", action:generateReport, color:C.green, loading:reportLoading },
                { api:"forget()", icon:"delete_sweep", label:"Wipe Memory", desc:"Clear entire knowledge graph — irreversible", action:forget, color:C.red, danger:true },
              ].map(op=>(
                <div key={op.label} className="glass" style={{ borderRadius:10,padding:16,border:`1px solid ${op.danger?C.red+"22":C.soft}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div style={{ flex:1 }}>
                      <span className="mono" style={{ fontSize:10,color:op.color,letterSpacing:"0.04em" }}>{op.api}</span>
                      <div style={{ fontWeight:600,fontSize:14,color:C.text,marginTop:2 }}>{op.label}</div>
                      <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{op.desc}</div>
                    </div>
                    <Btn onClick={op.action} disabled={op.loading} color={op.color} style={{ marginLeft:16,flexShrink:0 }}>
                      <Icon name={op.icon} size={16} color={op.loading?C.muted:op.color} />
                    </Btn>
                  </div>
                </div>
              ))}
            </div>

            {/* Log */}
            {log.length>0 && (
              <div style={{ marginTop:20,background:C.bg,border:`1px solid ${C.soft}`,borderRadius:8,padding:16 }}>
                <div className="mono" style={{ fontSize:10,color:C.muted,textTransform:"uppercase",marginBottom:10 }}>Operation Log</div>
                {log.map(l=><div key={l.id} className="mono" style={{ fontSize:11,color:l.color,lineHeight:1.9 }}>{l.msg}</div>)}
              </div>
            )}
          </div>

          {/* Right column — Risk Flagging + Tribal Report */}
          <div>
            {/* Risk flagging */}
            <h2 style={{ fontSize:20,fontWeight:700,letterSpacing:"-0.02em",marginBottom:4 }}>⚠️ Risk Flagging</h2>
            <p style={{ color:C.muted,fontSize:13,marginBottom:20 }}>Describe a change — Memory Surgeon checks if you're about to repeat a past mistake.</p>

            <div className="glass" style={{ borderRadius:12,padding:20,marginBottom:24 }}>
              <textarea value={riskInput} onChange={e=>setRiskInput(e.target.value)} placeholder="e.g. I want to migrate our database from PostgreSQL to MongoDB..." rows={4}
                style={{ width:"100%",background:C.surfLow,border:`1px solid ${C.soft}`,borderRadius:8,padding:12,color:C.text,fontSize:13,fontFamily:"JetBrains Mono,monospace",resize:"none",outline:"none",marginBottom:12 }} />
              <Btn onClick={checkRisk} disabled={riskLoading} color={C.amber} full>
                {riskLoading?"⏳ Checking memory...":"🔍 Check Risk"}
              </Btn>

              {/* Quick examples */}
              <div style={{ marginTop:12,display:"flex",flexWrap:"wrap",gap:6 }}>
                {["Migrate PostgreSQL to MongoDB","Change JWT to local server time","Poll API every 2 seconds"].map(ex=>(
                  <button key={ex} onClick={()=>setRiskInput(ex)} className="mono" style={{ background:C.surfMid,border:`1px solid ${C.soft}`,borderRadius:20,padding:"4px 10px",color:C.muted,fontSize:10,cursor:"pointer" }}>
                    {ex.slice(0,28)}...
                  </button>
                ))}
              </div>

              {riskResult && (
                <div style={{ marginTop:16,padding:16,borderRadius:8,background:riskResult.risk_level==="high"?C.red+"12":C.green+"12",border:`2px solid ${riskResult.risk_level==="high"?C.red:C.green}33` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
                    <span style={{ fontSize:26 }}>{riskResult.risk_level==="high"?"🚨":"✅"}</span>
                    <div>
                      <div style={{ fontWeight:700,color:riskResult.risk_level==="high"?C.red:C.green,fontSize:14,textTransform:"uppercase",letterSpacing:1 }}>{riskResult.risk_level} risk</div>
                      <div className="mono" style={{ fontSize:10,color:C.muted }}>based on memory graph analysis</div>
                    </div>
                  </div>
                  <div style={{ fontSize:13,color:C.text,lineHeight:1.7,borderTop:`1px solid ${C.soft}`,paddingTop:10 }}>{riskResult.message}</div>
                </div>
              )}
            </div>

            {/* Tribal Knowledge Report */}
            {report && (
              <div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                  <div style={{ fontWeight:600,fontSize:16,color:C.green }}>📋 Tribal Knowledge Report</div>
                  <Btn onClick={downloadReport} color={C.green} small>↓ Download .md</Btn>
                </div>
                <div className="mono" style={{ fontSize:10,color:C.muted,marginBottom:14 }}>Generated: {new Date(report.generated_at).toLocaleString()}</div>
                {report.sections?.map((s,i)=>(
                  <div key={i} className="glass" style={{ borderRadius:8,padding:16,marginBottom:10,borderLeft:`3px solid ${[C.cyan,C.green,C.violet,C.amber,C.red][i%5]}` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                      <span className="mono" style={{ fontSize:10,color:C.muted }}>0{i+1}</span>
                      <div style={{ fontWeight:600,fontSize:13,color:C.text }}>{s.title}</div>
                    </div>
                    <div style={{ fontSize:12,color:C.muted,lineHeight:1.7 }}>{s.content?.slice(0,280)}{s.content?.length>280?"...":""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [status, setStatus] = useState({ ingested: false, node_count: 108, edge_count: 159, record_count: 10 });

  // Fetch real status on mount
  useEffect(() => {
    fetch(`${API}/status`).then(r => r.json()).then(setStatus).catch(() => {});
  }, []);

  if (page === "landing") {
    return <LandingPage onEnter={() => setPage("graph")} />;
  }

  return (
    <AppShell page={page} setPage={setPage} status={status} setStatus={setStatus}>
      {page === "graph"   && <NeuralGraphPage />}
      {page === "surgery" && <SurgeryPage status={status} />}
      {page === "pulse"   && <PulsePage status={status} />}
      {page === "repo"    && <RepoPage status={status} setStatus={setStatus} />}
      {page === "history" && (
        <div style={{ padding:32 }}>
          <h2 style={{ fontSize:20,fontWeight:700,marginBottom:8 }}>History</h2>
          <p style={{ color:C.muted }}>Session recall history coming soon.</p>
        </div>
      )}
    </AppShell>
  );
}