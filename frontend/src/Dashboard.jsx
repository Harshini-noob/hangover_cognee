import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import logo from "./assets/logo.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Design tokens ─────────────────────────────────────────
const C = {
  bg:         "#050505",
  surface:    "#131313",
  surfaceLow: "#0e0e0e",
  surfaceMid: "#1c1b1b",
  surfaceHigh:"#2a2a2a",
  cyan:       "#00d4ff",
  cyanDim:    "#3cd7ff",
  cyanSoft:   "#a8e8ff",
  green:      "#00ff88",
  greenDim:   "#00e479",
  violet:     "#d0bcff",
  violetMid:  "#8b5cf6",
  red:        "#ff5449",
  amber:      "#ffb4ab",
  text:       "#e5e2e1",
  muted:      "#bbc9cf",
  border:     "#3c494e",
  borderSoft: "rgba(60,73,78,0.35)",
};

const TYPE_COLOR = {
  commit:       C.cyanDim,
  pull_request: C.greenDim,
  issue:        C.amber,
  postmortem:   C.red,
};

// ── Helpers ────────────────────────────────────────────────
const Icon = ({ name, size = 20, color, style = {} }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1, ...style }}>{name}</span>
);

const Chip = ({ children, color = C.cyan }) => (
  <span className="mono" style={{
    background: color + "18", color, border: `1px solid ${color}33`,
    borderRadius: 4, padding: "2px 8px", fontSize: 11,
    letterSpacing: "0.05em", textTransform: "uppercase",
  }}>{children}</span>
);

const MsgBubble = ({ msg, onFeedback }) => {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 18, flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-start" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: isUser ? C.cyan + "22" : C.violetMid + "22",
        border: `1px solid ${isUser ? C.cyan : C.violetMid}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, color: isUser ? C.cyan : C.violet, fontFamily: "JetBrains Mono, monospace",
      }}>{isUser ? "YOU" : <Icon name="smart_toy" size={14} color={C.violet} />}</div>
      <div style={{ maxWidth: "76%" }}>
        <div style={{
          background: isUser ? C.cyan + "12" : C.surfaceMid,
          border: `1px solid ${isUser ? C.cyan + "30" : C.borderSoft}`,
          borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
          padding: "10px 14px", fontSize: 14, lineHeight: 1.65, color: C.text,
          boxShadow: msg.role === "assistant" ? "0 0 12px rgba(139,92,246,0.06)" : "none",
        }}>
          {msg.loading ? (
            <span style={{ color: C.violet }}>
              <span style={{ display: "inline-block", animation: "blink 1s step-end infinite" }}>▋</span>
              <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>searching memory graph...</span>
            </span>
          ) : msg.content}
        </div>
        {msg.citations?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {msg.citations.slice(0, 3).map((c, i) => (
              <span key={i} className="mono" style={{
                background: C.surfaceMid, border: `1px solid ${C.borderSoft}`,
                borderRadius: 4, padding: "2px 8px", fontSize: 10, color: C.muted,
              }}>📎 {c.slice(0, 50)}...</span>
            ))}
          </div>
        )}
        {onFeedback && !msg.loading && (
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button onClick={() => onFeedback(true)} style={{ background: C.green + "15", border: `1px solid ${C.green}33`, color: C.green, borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "JetBrains Mono, monospace" }}>👍 helpful</button>
            <button onClick={() => onFeedback(false)} style={{ background: C.red + "15", border: `1px solid ${C.red}33`, color: C.red, borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "JetBrains Mono, monospace" }}>👎 not helpful</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── D3 Force Graph ─────────────────────────────────────────
const GRAPH_DATA = {
  nodes: [
    { id: "auth_middleware", label: "Auth Middleware", type: "commit", weight: 3 },
    { id: "jwt_tokens",     label: "JWT Tokens",      type: "commit",  weight: 2 },
    { id: "utc_fix",        label: "UTC Fix",         type: "commit",  weight: 2 },
    { id: "pr42",           label: "DB Pool PR #42",  type: "pull_request", weight: 3 },
    { id: "websocket",      label: "WebSocket PR #67",type: "pull_request", weight: 3 },
    { id: "polling",        label: "REST Polling",    type: "issue",   weight: 1 },
    { id: "redis_outage",   label: "Redis Outage #31",type: "postmortem", weight: 3 },
    { id: "cache_key",      label: "Cache Collision", type: "postmortem", weight: 2 },
    { id: "mongodb",        label: "MongoDB PR #89",  type: "pull_request", weight: 3 },
    { id: "postgresql",     label: "PostgreSQL",      type: "commit",  weight: 2 },
    { id: "cors_issue",     label: "CORS #44",        type: "issue",   weight: 2 },
    { id: "rate_limit",     label: "Rate Limiting",   type: "commit",  weight: 2 },
    { id: "memory_leak",    label: "Memory Leak #17", type: "issue",   weight: 2 },
    { id: "nginx_config",   label: "Nginx #52",       type: "postmortem", weight: 2 },
    { id: "payment_revert", label: "Payment Revert",  type: "commit",  weight: 2 },
  ],
  links: [
    { source: "auth_middleware", target: "jwt_tokens",   label: "fixes" },
    { source: "jwt_tokens",      target: "utc_fix",      label: "caused_by" },
    { source: "websocket",       target: "polling",      label: "replaces" },
    { source: "redis_outage",    target: "cache_key",    label: "caused_by" },
    { source: "mongodb",         target: "postgresql",   label: "rejected_for" },
    { source: "memory_leak",     target: "websocket",    label: "fixed_by" },
    { source: "rate_limit",      target: "auth_middleware", label: "protects" },
    { source: "payment_revert",  target: "pr42",         label: "similar_risk" },
    { source: "redis_outage",    target: "mongodb",      label: "informed" },
    { source: "cors_issue",      target: "auth_middleware", label: "related" },
    { source: "nginx_config",    target: "cors_issue",   label: "related" },
  ],
};

function NeuralGraph({ onNodeClick }) {
  const svgRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const zoomRef = useRef(null);
  const svgSelRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [usingDemo, setUsingDemo] = useState(false);

  // Fetch real graph from the ingested database; fall back to demo data
  useEffect(() => {
    fetch(`${API}/graph`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.nodes?.length > 0) {
          setGraphData({
            nodes: data.nodes,
            links: (data.edges || []).map(e => ({ source: e.source, target: e.target, label: e.label })),
          });
          setUsingDemo(false);
        } else {
          setGraphData(GRAPH_DATA);
          setUsingDemo(true);
        }
      })
      .catch(() => { setGraphData(GRAPH_DATA); setUsingDemo(true); });
  }, []);

  useEffect(() => {
    if (!svgRef.current || !graphData) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const W = svgRef.current.clientWidth || 900;
    const H = svgRef.current.clientHeight || 600;

    const defs = svg.append("defs");
    // Glow filters
    const glows = { cyan: C.cyanDim, green: C.greenDim, amber: C.amber, red: C.red };
    Object.entries(glows).forEach(([name, col]) => {
      const f = defs.append("filter").attr("id", `glow-${name}`).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      f.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", 4).attr("result", "blur");
      const merge = f.append("feMerge");
      merge.append("feMergeNode").attr("in", "blur");
      merge.append("feMergeNode").attr("in", "SourceGraphic");
    });
    // Arrow
    defs.append("marker").attr("id", "arrow").attr("viewBox", "0 -5 10 10").attr("refX", 22).attr("refY", 0).attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "rgba(133,147,152,0.3)");

    const g = svg.append("g");
    svgSelRef.current = svg;

    const zoom = d3.zoom().scaleExtent([0.2, 4]).on("zoom", (ev) => {
      g.attr("transform", ev.transform);
      setZoomLevel(Math.round(ev.transform.k * 100));
    });
    zoomRef.current = zoom;
    svg.call(zoom);

    const nodes = graphData.nodes.map(n => ({ ...n }));
    const links = graphData.links.map(l => ({ ...l }));

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide().radius(32));

    // Grid background dots
    const gridG = g.append("g").attr("opacity", 0.06);
    for (let x = 0; x < W + 100; x += 40) {
      for (let y = 0; y < H + 100; y += 40) {
        gridG.append("circle").attr("cx", x).attr("cy", y).attr("r", 1).attr("fill", C.muted);
      }
    }

    const link = g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke", "rgba(60,73,78,0.4)").attr("stroke-width", 1).attr("stroke-dasharray", "4,4").attr("marker-end", "url(#arrow)");

    const linkLabel = g.append("g").selectAll("text").data(links).enter().append("text")
      .attr("font-size", 9).attr("fill", "rgba(133,147,152,0.5)").attr("font-family", "JetBrains Mono, monospace")
      .attr("text-anchor", "middle").text(d => d.label);

    const node = g.append("g").selectAll("g").data(nodes).enter().append("g").style("cursor", "pointer")
      .call(d3.drag()
        .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag",  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on("end",   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on("click", (ev, d) => {
        ev.stopPropagation();
        onNodeClick(d);
        // Highlight
        link.attr("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? TYPE_COLOR[d.type] : "rgba(60,73,78,0.2)");
      });

    const getCol = d => TYPE_COLOR[d.type] || C.muted;
    const getGlowFilter = d => {
      const map = { commit: "cyan", pull_request: "green", issue: "amber", postmortem: "red" };
      return `url(#glow-${map[d.type] || "cyan"})`;
    };

    // Outer pulse ring
    node.append("circle").attr("r", d => d.weight * 9 + 6).attr("fill", "none")
      .attr("stroke", d => getCol(d)).attr("stroke-width", 0.5).attr("opacity", 0.2);

    // Main node
    node.append("circle").attr("r", d => d.weight * 9).attr("fill", d => getCol(d) + "25")
      .attr("stroke", d => getCol(d)).attr("stroke-width", 1.5).attr("filter", d => getGlowFilter(d));

    // Label
    node.append("text").attr("text-anchor", "middle").attr("dy", d => d.weight * 9 + 14)
      .attr("font-size", 9).attr("font-family", "JetBrains Mono, monospace").attr("fill", C.text).attr("opacity", 0.75)
      .text(d => d.label.length > 16 ? d.label.slice(0, 15) + "…" : d.label);

    sim.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      linkLabel.attr("x", d => (d.source.x + d.target.x) / 2).attr("y", d => (d.source.y + d.target.y) / 2);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Click canvas to deselect
    svg.on("click", () => {
      onNodeClick(null);
      link.attr("stroke", "rgba(60,73,78,0.4)");
    });

    return () => sim.stop();
  }, [graphData]);

  const handleZoom = (delta) => {
    if (!svgSelRef.current || !zoomRef.current) return;
    svgSelRef.current.transition().duration(250).call(zoomRef.current.scaleBy, delta);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%", background: C.bg }} />

      {/* Data source badge */}
      <div className="glass" style={{
        position: "absolute", top: 16, left: 16, padding: "6px 12px",
        borderRadius: 999, display: "flex", alignItems: "center", gap: 8,
        border: `1px solid ${usingDemo ? C.amber + "44" : C.green + "44"}`,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: usingDemo ? C.amber : C.green }} />
        <span className="mono" style={{ fontSize: 10, color: usingDemo ? C.amber : C.green, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {usingDemo ? "Demo Graph — Ingest to See Real Data" : "Live: From Ingested Memory"}
        </span>
      </div>

      {/* Zoom controls */}
      <div className="glass" style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
        borderRadius: 999, boxShadow: "0 0 20px rgba(0,228,121,0.12)",
      }}>
        {[
          { icon: "add", action: () => handleZoom(1.3) },
          { icon: "remove", action: () => handleZoom(0.77) },
          { icon: "restart_alt", action: () => svgSelRef.current?.transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity) },
        ].map(({ icon, action }, i) => (
          <button key={icon} onClick={action} style={{
            width: 36, height: 36, borderRadius: "50%", background: "none", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: C.cyan, transition: "background 0.15s",
          }}>
            <Icon name={icon} size={18} color={C.cyan} />
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: C.borderSoft, margin: "0 4px" }} />
        <span className="mono" style={{ fontSize: 11, color: C.muted, padding: "0 8px" }}>
          {zoomLevel}%
        </span>
      </div>

      {/* Legend */}
      <div className="glass" style={{
        position: "absolute", top: 16, right: 16, padding: "10px 14px",
        borderRadius: 8, display: "flex", flexDirection: "column", gap: 6,
      }}>
        {[["commit", C.cyanDim], ["pull_request", C.greenDim], ["issue", C.amber], ["postmortem", C.red]].map(([type, col]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: col + "44", border: `1px solid ${col}` }} />
            <span className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{type.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Surgery Panel (right slide-in) ─────────────────────────
function SurgeryPanel({ node, onClose }) {
  const [riskQuery, setRiskQuery] = useState("");
  const [riskResult, setRiskResult] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const col = node ? (TYPE_COLOR[node.type] || C.cyan) : C.cyan;

  async function checkRisk() {
    if (!riskQuery.trim()) return;
    setRiskLoading(true);
    try {
      const r = await fetch(`${API}/risk-check`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change_description: riskQuery }),
      });
      setRiskResult(await r.json());
    } catch (e) {
      setRiskResult({ risk_level: "error", message: e.message });
    }
    setRiskLoading(false);
  }

  return (
    <div className="glass" style={{
      position: "fixed", right: 0, top: 64, bottom: 0, width: 320, zIndex: 40,
      borderLeft: `1px solid ${C.borderSoft}`, padding: 20,
      display: "flex", flexDirection: "column", gap: 16,
      transform: node ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
      overflowY: "auto",
    }}>
      {node && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Chip color={col}>{node.type.replace("_", " ")}</Chip>
              <div style={{ fontWeight: 600, fontSize: 16, marginTop: 8, letterSpacing: "-0.01em" }}>{node.label}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
              <Icon name="close" size={18} color={C.muted} />
            </button>
          </div>

          {/* Risk score */}
          <div style={{ background: C.surfaceLow, border: `1px solid ${C.borderSoft}`, borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Risk Score</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: node.weight > 2 ? C.amber : C.green }}>
                {node.weight > 2 ? "HIGH" : "LOW"}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${node.weight > 2 ? C.amber : C.green}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="security" size={20} color={node.weight > 2 ? C.amber : C.green} />
            </div>
          </div>

          {/* Node info */}
          <div style={{ background: C.surfaceLow, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 14 }}>
            <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Node Intelligence</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
              This {node.type.replace("_", " ")} node is connected to {node.weight + 1} related decision records in the knowledge graph.
            </div>
          </div>

          {/* Quick risk check */}
          <div>
            <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Quick Risk Check</div>
            <textarea
              value={riskQuery}
              onChange={e => setRiskQuery(e.target.value)}
              placeholder={`Describe a change related to ${node.label}...`}
              rows={3}
              style={{
                width: "100%", background: C.surfaceLow, border: `1px solid ${C.borderSoft}`,
                borderRadius: 6, padding: 10, color: C.text, fontSize: 12,
                fontFamily: "JetBrains Mono, monospace", resize: "none", outline: "none",
              }}
            />
            <button onClick={checkRisk} disabled={riskLoading} style={{
              marginTop: 8, width: "100%", background: col + "18", border: `1px solid ${col}40`,
              color: col, borderRadius: 6, padding: "8px 0", cursor: "pointer", fontSize: 12,
              fontFamily: "JetBrains Mono, monospace", fontWeight: 600,
            }}>
              {riskLoading ? "Checking memory..." : "⚡ Check Risk"}
            </button>
            {riskResult && (
              <div style={{
                marginTop: 10, padding: 12, borderRadius: 6,
                background: riskResult.risk_level === "high" ? C.red + "15" : C.green + "15",
                border: `1px solid ${riskResult.risk_level === "high" ? C.red : C.green}33`,
                fontSize: 12, lineHeight: 1.6, color: C.text,
              }}>
                <div style={{ fontWeight: 700, color: riskResult.risk_level === "high" ? C.red : C.green, marginBottom: 4 }}>
                  {riskResult.risk_level === "high" ? "🚨 HIGH RISK" : "✅ LOW RISK"}
                </div>
                {riskResult.message?.slice(0, 200)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Chat Panel ─────────────────────────────────────────────
function ChatPanel({ status }) {
  const [messages, setMessages] = useState([
    { role: "assistant", id: 0, content: "Memory graph loaded. Ask me anything about why code was written the way it was, past incidents, or rejected architectural decisions." }
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function ask() {
    if (!query.trim() || loading) return;
    const q = query.trim();
    setQuery("");
    setMessages(m => [...m, { role: "user", id: Date.now(), content: q }]);
    setLoading(true);
    const lid = Date.now() + 1;
    setMessages(m => [...m, { role: "assistant", id: lid, content: "", loading: true }]);

    try {
      const r = await fetch(`${API}/recall`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await r.json();
      setMessages(m => m.map(msg => msg.id === lid ? {
        ...msg, content: data.answer, loading: false, citations: data.citations,
        onFeedback: (h) => handleFeedback(q, h),
      } : msg));
    } catch (e) {
      setMessages(m => m.map(msg => msg.id === lid ? { ...msg, content: `❌ ${e.message}`, loading: false } : msg));
    }
    setLoading(false);
  }

  async function handleFeedback(q, helpful) {
    await fetch(`${API}/feedback`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record_id: q, was_helpful: helpful }),
    });
  }

  const SUGGESTIONS = [
    "What caused the auth bug?",
    "Why was MongoDB rejected?",
    "What lessons from Redis outage?",
    "Why switch to WebSocket?",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
        {messages.length === 1 && (
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Suggested Queries</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setQuery(s)} style={{
                  background: C.surfaceMid, border: `1px solid ${C.borderSoft}`,
                  borderRadius: 6, padding: "6px 12px", color: C.muted, fontSize: 12,
                  cursor: "pointer", fontFamily: "JetBrains Mono, monospace",
                  transition: "all 0.15s",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => <MsgBubble key={msg.id} msg={msg} onFeedback={msg.onFeedback} />)}
        <div ref={endRef} />
      </div>
      <div style={{ padding: 16, borderTop: `1px solid ${C.borderSoft}`, background: C.surfaceLow }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "8px 12px" }}>
            <Icon name="terminal" size={16} color={C.cyan} style={{ marginRight: 8 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ask()}
              placeholder="Ask why code was written this way..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}
            />
          </div>
          <button onClick={ask} disabled={loading || !query.trim()} style={{
            background: loading ? C.surfaceMid : `linear-gradient(135deg, ${C.cyan}, #0099bb)`,
            color: loading ? C.muted : "#001f27",
            border: "none", borderRadius: 8, padding: "8px 16px", cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: 12, fontFamily: "JetBrains Mono, monospace",
          }}>
            {loading ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ops Panel ──────────────────────────────────────────────
function OpsPanel({ status, setStatus }) {
  const [ingesting, setIngesting] = useState(false);
  const [log, setLog] = useState([]);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [useSample, setUseSample] = useState(true);
  const [repoUrl, setRepoUrl] = useState("");

  function addLog(msg, color = C.muted) { setLog(l => [...l, { msg, color, id: Date.now() }]); }

  async function ingest() {
    setIngesting(true); setLog([]);
    addLog(useSample ? "Clearing old memory (sample data)..." : `Clearing old memory (live repo: ${repoUrl || "using .env GITHUB_REPO"})...`, C.amber);
    try {
      const r = await fetch(`${API}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ use_sample: useSample, repo: useSample ? null : repoUrl }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || `Ingest failed (${r.status})`);
      }
      const data = await r.json();
      addLog(`✅ Ingested ${data.records} records`, C.green);
      addLog(`📊 Graph: ${data.nodes} nodes, ${data.edges} edges`, C.cyan);
      setStatus(s => ({ ...s, ingested: true, record_count: data.records, node_count: data.nodes, edge_count: data.edges }));
      addLog("🎉 Memory seeded!", C.green);
    } catch (e) { addLog(`❌ ${e.message}`, C.red); }
    setIngesting(false);
  }

  async function improve() {
    addLog("Running improve()...", C.violet);
    try {
      await fetch(`${API}/improve`, { method: "POST" });
      addLog("✅ Graph enrichment complete", C.green);
    } catch (e) { addLog(`❌ ${e.message}`, C.red); }
  }

  async function forget() {
    if (!confirm("Wipe all memory?")) return;
    await fetch(`${API}/forget`, { method: "DELETE" });
    setStatus(s => ({ ...s, ingested: false, record_count: 0, node_count: 0, edge_count: 0 }));
    addLog("🗑️ Memory cleared", C.amber);
  }

  async function generateReport() {
    setReportLoading(true); setReport(null);
    addLog("Generating tribal knowledge report (5 queries, ~30-60s on free-tier LLM limits)...", C.violet);
    try {
      const r = await fetch(`${API}/tribal-report`);
      const data = await r.json();
      setReport(data);
      addLog("✅ Report generated!", C.green);
    } catch (e) { addLog(`❌ ${e.message}`, C.red); }
    setReportLoading(false);
  }

  function downloadReport() {
    if (!report) return;
    const md = `# ${report.title}\n${report.subtitle}\n_${report.generated_at}_\n\n` +
      report.sections.map(s => `## ${s.title}\n${s.content}`).join("\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tribal-knowledge.md"; a.click();
  }

  const ops = [
    { api: "remember()", icon: "memory", label: "Ingest Memory", desc: "Load repo data into knowledge graph", action: ingest, color: C.cyan, loading: ingesting },
    { api: "improve()", icon: "auto_awesome", label: "Enrich Graph", desc: "Reweight nodes, derive new triplets", action: improve, color: C.violet },
    { api: "forget()", icon: "delete_sweep", label: "Clear Memory", desc: "Wipe entire knowledge graph", action: forget, color: C.red, danger: true },
    { api: "memify()", icon: "description", label: "Tribal Report", desc: "Auto-generate onboarding document", action: generateReport, color: C.green, loading: reportLoading },
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 20 }}>
      <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
        Cognee Memory Lifecycle APIs
      </div>

      {/* Data source toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surfaceLow, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
        <Icon name="dataset" size={16} color={C.violet} />
        <span className="mono" style={{ fontSize: 11, color: C.muted }}>Ingest source:</span>
        {[{ v: true, label: "Sample Data" }, { v: false, label: "Live GitHub Repo" }].map(opt => (
          <button key={String(opt.v)} onClick={() => setUseSample(opt.v)} style={{
            background: useSample === opt.v ? C.violetMid + "22" : "none",
            border: `1px solid ${useSample === opt.v ? C.violetMid : C.borderSoft}`,
            color: useSample === opt.v ? C.violet : C.muted,
            borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer",
            fontFamily: "JetBrains Mono, monospace",
          }}>{opt.label}</button>
        ))}
      </div>

      {!useSample && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surfaceLow, border: `1px solid ${C.violetMid}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <Icon name="link" size={16} color={C.violet} />
          <input
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            placeholder="owner/repo or https://github.com/owner/repo — leave blank to use .env GITHUB_REPO"
            className="mono"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 12 }}
          />
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        {ops.map(op => (
          <div key={op.api} style={{ background: C.surfaceLow, border: `1px solid ${op.danger ? C.red + "33" : C.borderSoft}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="mono" style={{ fontSize: 11, color: op.color, letterSpacing: "0.04em" }}>{op.api}</span>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginTop: 2 }}>{op.label}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{op.desc}</div>
              </div>
              <button onClick={op.action} disabled={op.loading} style={{
                background: op.danger ? C.red + "18" : op.color + "18",
                border: `1px solid ${op.color}40`, color: op.color,
                borderRadius: 6, padding: "8px 16px", cursor: op.loading ? "not-allowed" : "pointer",
                fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
                flexShrink: 0, marginLeft: 12, display: "flex", alignItems: "center", gap: 8,
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                <Icon name={op.icon} size={16} color={op.color} />
                {op.loading ? "Running..." : "Run"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Log */}
      <div style={{ background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 12, marginBottom: 16, minHeight: 60 }}>
        <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Operation Log</div>
        {log.length === 0 ? (
          <div className="mono" style={{ fontSize: 11, color: C.muted, opacity: 0.6 }}>No operations run yet. Click "Run" on any card above.</div>
        ) : log.map(l => (
          <div key={l.id} className="mono" style={{ fontSize: 11, color: l.color, lineHeight: 1.8 }}>{l.msg}</div>
        ))}
      </div>

      {/* Tribal Report */}
      {report && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.green }}>📋 {report.title}</div>
            <button onClick={downloadReport} style={{ background: C.green + "18", border: `1px solid ${C.green}33`, color: C.green, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
              ↓ Download .md
            </button>
          </div>
          {report.sections?.map((s, i) => (
            <div key={i} style={{ background: C.surfaceLow, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.cyan, marginBottom: 6 }}>
                <span className="mono" style={{ color: C.violet, marginRight: 8, fontSize: 10 }}>0{i + 1}</span>
                {s.title}
              </div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.65 }}>{s.content?.slice(0, 300)}{s.content?.length > 300 ? "..." : ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────
const NAV_ITEMS = [
  { id: "graph",  icon: "hub",          label: "Neural Graph" },
  { id: "chat",   icon: "chat_bubble",  label: "Surgery" },
  { id: "ops",    icon: "account_tree", label: "Repository" },
  { id: "pulse",  icon: "analytics",    label: "Pulse" },
];

export default function Dashboard({ status, setStatus }) {
  const [activeNav, setActiveNav] = useState("graph");
  const [selectedNode, setSelectedNode] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const showPanel = selectedNode !== null;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="scanline" />

      {/* Top nav */}
      <nav className="glass" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 64,
        display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between",
        boxShadow: "0 0 20px rgba(0,212,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logo} alt="Memory Surgeon logo" style={{ width: 24, height: 24, objectFit: "contain" }} />
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: C.cyanSoft }}>Memory Surgeon</span>
          <div style={{ width: 1, height: 16, background: C.borderSoft, margin: "0 4px" }} />
          <div style={{ display: "flex", gap: 2 }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setActiveNav(item.id)} className="mono" style={{
                background: activeNav === item.id ? C.cyan + "15" : "none",
                border: "none", borderBottom: `2px solid ${activeNav === item.id ? C.cyan : "transparent"}`,
                color: activeNav === item.id ? C.cyan : C.muted,
                padding: "4px 14px", cursor: "pointer", fontSize: 11,
                letterSpacing: "0.05em", textTransform: "uppercase",
                transition: "all 0.15s",
              }}>{item.label}</button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ display: "flex", alignItems: "center", background: C.surfaceLow, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "6px 12px", width: 280 }}>
          <Icon name="search" size={16} color={C.muted} style={{ marginRight: 8 }} />
          <input placeholder="Filter Neural Web (Ctrl+K)..." className="mono" style={{ background: "none", border: "none", outline: "none", color: C.text, fontSize: 12, width: "100%" }} />
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {/* Status pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.green + "12", border: `1px solid ${C.green}33`, borderRadius: 999, padding: "4px 12px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} className="pulse" />
            <span className="mono" style={{ fontSize: 10, color: C.green, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Sync Active</span>
          </div>
          {["memory", "terminal", "settings"].map(icon => (
            <Icon key={icon} name={icon} size={20} color={C.muted} style={{ cursor: "pointer" }} />
          ))}
        </div>
      </nav>

      {/* Left sidebar */}
      <aside style={{
        position: "fixed", left: 0, top: 64, bottom: 0, width: 240, zIndex: 40,
        background: C.surfaceLow, borderRight: `1px solid ${C.borderSoft}`,
        display: "flex", flexDirection: "column", padding: "24px 0",
      }}>
        <div style={{ padding: "0 16px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Active Operations</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cyan + "08", border: `1px solid ${C.cyan}20`, borderRadius: 6, padding: "8px 10px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.cyan }} className="pulse" />
            <span className="mono" style={{ fontSize: 11, color: C.cyan }}>AI Logic Sync: Active</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
              background: activeNav === item.id ? C.cyan + "08" : "none",
              borderLeft: `2px solid ${activeNav === item.id ? C.cyan : "transparent"}`,
              color: activeNav === item.id ? C.cyan : C.muted,
              border: "none", borderLeft: `2px solid ${activeNav === item.id ? C.cyan : "transparent"}`,
              cursor: "pointer", textAlign: "left", transition: "all 0.15s",
            }}>
              <Icon name={item.icon} size={20} color={activeNav === item.id ? C.cyan : C.muted} />
              <span className="mono" style={{ fontSize: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ padding: "16px", borderTop: `1px solid ${C.borderSoft}`, marginTop: "auto" }}>
          {[
            { label: "Nodes", val: status.node_count || 108, color: C.cyan },
            { label: "Edges", val: status.edge_count || 159, color: C.green },
            { label: "Records", val: status.record_count || 10, color: C.violet },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</span>
              <span className="mono" style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        position: "fixed", top: 64, left: 240, right: showPanel ? 320 : 0, bottom: 0,
        transition: "right 0.4s cubic-bezier(0.16,1,0.3,1)",
        overflow: "hidden",
      }}>
        {activeNav === "graph" && (
          <NeuralGraph onNodeClick={setSelectedNode} />
        )}
        {activeNav === "chat" && (
          <ChatPanel status={status} />
        )}
        {activeNav === "ops" && (
          <OpsPanel status={status} setStatus={setStatus} />
        )}
        {activeNav === "pulse" && (
          <div style={{ padding: 32 }}>
            <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 20 }}>System Pulse</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Graph Nodes", val: status.node_count || 108, color: C.cyan, icon: "hub" },
                { label: "Graph Edges", val: status.edge_count || 159, color: C.green, icon: "mediation" },
                { label: "Records Ingested", val: status.record_count || 10, color: C.violet, icon: "memory" },
                { label: "Dataset", val: "repo_memory", color: C.amber, icon: "database" },
              ].map(s => (
                <div key={s.label} style={{ background: C.surfaceLow, border: `1px solid ${C.borderSoft}`, borderRadius: 10, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span className="mono" style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                    <Icon name={s.icon} size={16} color={s.color} />
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.color, letterSpacing: "-0.03em" }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Right surgery panel */}
      <SurgeryPanel node={selectedNode} onClose={() => setSelectedNode(null)} />

      {/* Feedback toast */}
      {feedbackMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.green + "22", border: `1px solid ${C.green}44`, color: C.green, padding: "10px 20px", borderRadius: 8, fontSize: 13, zIndex: 200 }}>
          {feedbackMsg}
        </div>
      )}
    </div>
  );
}