import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

// ── Design tokens ──────────────────────────────────────
// Dark surgical theme: near-black bg, electric cyan accent,
// monospace data feel — fits a "codebase memory" tool perfectly
const C = {
  bg: "#0a0e1a",
  surface: "#111827",
  surface2: "#1a2235",
  border: "#1e2d45",
  cyan: "#00d4ff",
  cyanDim: "#00d4ff22",
  green: "#00ff88",
  red: "#ff4560",
  amber: "#ffb800",
  text: "#e2e8f0",
  muted: "#64748b",
  white: "#ffffff",
};

// ── Helpers ────────────────────────────────────────────
function Badge({ children, color = C.cyan }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace",
    }}>{children}</span>
  );
}

function StatCard({ label, value, color = C.cyan }) {
  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "16px 20px", textAlign: "center", flex: 1,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 4, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function Btn({ children, onClick, color = C.cyan, disabled, small, danger }) {
  const bg = danger ? C.red : color;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? C.surface2 : bg + "22",
      color: disabled ? C.muted : bg,
      border: `1px solid ${disabled ? C.border : bg + "66"}`,
      borderRadius: 6, padding: small ? "6px 14px" : "10px 20px",
      fontSize: small ? 12 : 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "monospace", letterSpacing: 0.5, transition: "all 0.15s",
    }}>{children}</button>
  );
}

// ── Graph mini-viz (pure SVG, no libs needed) ─────────
function GraphViz({ nodes, edges }) {
  const W = 380, H = 220;
  // Position nodes in a rough circle
  const positioned = nodes.slice(0, 12).map((n, i) => {
    const angle = (i / Math.min(nodes.length, 12)) * 2 * Math.PI - Math.PI / 2;
    const r = i === 0 ? 0 : 80;
    return {
      ...n,
      x: W / 2 + r * Math.cos(angle),
      y: H / 2 + r * Math.sin(angle),
    };
  });

  const typeColor = {
    commit: C.cyan, pull_request: C.green,
    issue: C.amber, postmortem: C.red, default: C.muted,
  };

  return (
    <svg width={W} height={H} style={{ background: C.surface2, borderRadius: 8, border: `1px solid ${C.border}` }}>
      {/* Edges */}
      {positioned.slice(1).map((n, i) => (
        <line key={i} x1={positioned[0].x} y1={positioned[0].y}
          x2={n.x} y2={n.y} stroke={C.border} strokeWidth={1} strokeDasharray="3,3" />
      ))}
      {/* Nodes */}
      {positioned.map((n, i) => {
        const col = typeColor[n.type] || typeColor.default;
        return (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={i === 0 ? 14 : 8}
              fill={col + "33"} stroke={col} strokeWidth={1.5} />
            {i === 0 && (
              <text x={n.x} y={n.y + 4} textAnchor="middle"
                fill={col} fontSize={8} fontFamily="monospace">CORE</text>
            )}
          </g>
        );
      })}
      {/* Legend */}
      {[["commit", C.cyan], ["pr", C.green], ["issue", C.amber]].map(([label, col], i) => (
        <g key={i}>
          <circle cx={12} cy={H - 30 + i * 14} r={4} fill={col + "44"} stroke={col} strokeWidth={1} />
          <text x={22} y={H - 26 + i * 14} fill={C.muted} fontSize={9} fontFamily="monospace">{label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Chat message ────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: isUser ? C.cyan + "33" : C.green + "33",
        border: `1px solid ${isUser ? C.cyan : C.green}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: isUser ? C.cyan : C.green, fontFamily: "monospace",
      }}>{isUser ? "YOU" : "🔬"}</div>
      <div style={{ maxWidth: "75%" }}>
        <div style={{
          background: isUser ? C.cyanDim : C.surface2,
          border: `1px solid ${isUser ? C.cyan + "33" : C.border}`,
          borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
          padding: "12px 16px", color: C.text, fontSize: 14, lineHeight: 1.6,
        }}>
          <div dangerouslySetInnerHTML={{
            __html: msg.content
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\n•/g, "<br/>•")
              .replace(/\n/g, "<br/>")
          }} />
          {msg.loading && <span style={{ color: C.cyan }}>▋</span>}
        </div>
        {msg.citations && msg.citations.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {msg.citations.map((c, i) => (
              <span key={i} style={{
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 4, padding: "3px 8px", fontSize: 11,
                color: C.muted, fontFamily: "monospace",
              }}>📎 {c.slice(0, 60)}...</span>
            ))}
          </div>
        )}
        {msg.feedback !== undefined && (
          <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
            <Btn small onClick={() => msg.onFeedback(true)} color={C.green}>👍 Helpful</Btn>
            <Btn small onClick={() => msg.onFeedback(false)} color={C.red}>👎 Not helpful</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────
export default function App() {
  const [status, setStatus] = useState({ ingested: false, record_count: 0, node_count: 0, edge_count: 0 });
  const [messages, setMessages] = useState([
    { role: "assistant", content: "👋 I'm the CodeBase Memory Surgeon. Ingest a repository to begin — then ask me anything about why code was written the way it was, past incidents, or architectural decisions." }
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // chat | graph | ops
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const chatEndRef = useRef(null);

  const graphNodes = Array.from({ length: Math.min(status.node_count || 12, 12) }, (_, i) => ({
    type: ["commit", "pull_request", "issue", "postmortem", "commit", "pull_request"][i % 6]
  }));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch(`${API}/status`).then(r => r.json()).then(setStatus).catch(() => {});
  }, []);

  async function handleIngest(useSample = true) {
    setIngesting(true);
    addMessage("assistant", `⚙️ ${useSample ? "Loading sample codebase memory..." : "Fetching real GitHub data..."} This takes ~30 seconds.`);
    try {
      const r = await fetch(`${API}/ingest`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ use_sample: useSample })
      });
      const data = await r.json();
      setStatus(s => ({ ...s, ingested: true, record_count: data.records, node_count: data.nodes, edge_count: data.edges }));
      addMessage("assistant",
        `✅ Memory loaded! Ingested **${data.records} decision records** → built a knowledge graph with **${data.nodes} nodes** and **${data.edges} edges**.\n\nTry asking:\n• "What caused the auth bug?"\n• "Why did we reject MongoDB?"\n• "What lessons did we learn from production incidents?"`
      );
    } catch (e) {
      addMessage("assistant", `❌ Ingestion failed: ${e.message}`);
    }
    setIngesting(false);
  }

  async function handleRecall() {
    if (!query.trim() || loading) return;
    const q = query.trim();
    setQuery("");
    addMessage("user", q);
    setLoading(true);
    const loadId = Date.now();
    setMessages(m => [...m, { id: loadId, role: "assistant", content: "Searching memory graph...", loading: true }]);
    try {
      const r = await fetch(`${API}/recall`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await r.json();
      setMessages(m => m.map(msg =>
        msg.id === loadId ? {
          ...msg, content: data.answer, loading: false,
          citations: data.citations,
          feedback: true,
          onFeedback: (helpful) => handleFeedback(q, helpful),
        } : msg
      ));
    } catch (e) {
      setMessages(m => m.map(msg =>
        msg.id === loadId ? { ...msg, content: `❌ Error: ${e.message}`, loading: false } : msg
      ));
    }
    setLoading(false);
  }

  async function handleImprove() {
    addMessage("assistant", "⚡ Running improve() — enriching graph relationships and reweighting nodes...");
    try {
      const r = await fetch(`${API}/improve`, { method: "POST" });
      const data = await r.json();
      addMessage("assistant", `✅ ${data.status}`);
    } catch (e) {
      addMessage("assistant", `❌ ${e.message}`);
    }
  }

  async function handleForget() {
    if (!confirm("Wipe all memory? This cannot be undone.")) return;
    try {
      await fetch(`${API}/forget`, { method: "DELETE" });
      setStatus(s => ({ ...s, ingested: false, record_count: 0, node_count: 0, edge_count: 0 }));
      addMessage("assistant", "🗑️ All memory cleared. The knowledge graph has been wiped.");
    } catch (e) {
      addMessage("assistant", `❌ ${e.message}`);
    }
  }

  async function handleFeedback(query, helpful) {
    setFeedbackMsg(helpful ? "👍 Feedback recorded — boosting this memory node" : "👎 Feedback recorded — downweighting this node");
    await fetch(`${API}/feedback`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record_id: query, was_helpful: helpful })
    });
    setTimeout(() => setFeedbackMsg(""), 3000);
  }

  function addMessage(role, content) {
    setMessages(m => [...m, { role, content, id: Date.now() }]);
  }

  const tabs = ["chat", "graph", "ops"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, background: C.surface }}>
        <div style={{ fontSize: 20, fontFamily: "monospace", fontWeight: 800, color: C.cyan }}>🔬 CodeBase Memory Surgeon</div>
        <div style={{ flex: 1 }} />
        {status.ingested ? (
          <Badge color={C.green}>MEMORY LOADED</Badge>
        ) : (
          <Badge color={C.amber}>NO MEMORY</Badge>
        )}
        <Badge color={C.cyan}>{status.node_count} NODES</Badge>
        <Badge color={C.muted}>{status.edge_count} EDGES</Badge>
      </div>

      {/* Stats bar */}
      {status.ingested && (
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", gap: 12 }}>
          <StatCard label="RECORDS" value={status.record_count} color={C.cyan} />
          <StatCard label="GRAPH NODES" value={status.node_count} color={C.green} />
          <StatCard label="EDGES" value={status.edge_count} color={C.amber} />
          <StatCard label="DATASET" value="repo_memory" color={C.muted} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", gap: 0, background: C.surface }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab ? C.cyan : "transparent"}`,
            color: activeTab === tab ? C.cyan : C.muted, padding: "12px 20px", cursor: "pointer",
            fontFamily: "monospace", fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
          }}>{tab}</button>
        ))}
      </div>

      {/* Feedback toast */}
      {feedbackMsg && (
        <div style={{ background: C.green + "22", border: `1px solid ${C.green}44`, color: C.green, padding: "10px 24px", fontSize: 13, fontFamily: "monospace" }}>
          {feedbackMsg}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

        {/* CHAT TAB */}
        {activeTab === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column" }}>
              {!status.ingested && (
                <div style={{ margin: "auto", textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>No Memory Loaded</div>
                  <div style={{ color: C.muted, marginBottom: 24, fontSize: 14 }}>Ingest a codebase to build the knowledge graph</div>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    <Btn onClick={() => handleIngest(true)} disabled={ingesting}>
                      {ingesting ? "⚙️ Loading..." : "⚡ Load Sample Data (Fast)"}
                    </Btn>
                    <Btn onClick={() => handleIngest(false)} disabled={ingesting} color={C.muted}>
                      📡 Use Real GitHub Repo
                    </Btn>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <Message key={msg.id || i} msg={msg} />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop: `1px solid ${C.border}`, padding: 16, background: C.surface, display: "flex", gap: 10 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRecall()}
                placeholder={status.ingested ? "Ask why code was written this way... (Enter to send)" : "Ingest a repo first..."}
                disabled={!status.ingested || loading}
                style={{
                  flex: 1, background: C.surface2, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "12px 16px", color: C.text, fontSize: 14,
                  outline: "none", fontFamily: "inherit",
                }}
              />
              <Btn onClick={handleRecall} disabled={!status.ingested || loading || !query.trim()}>
                {loading ? "..." : "Ask →"}
              </Btn>
            </div>
          </div>
        )}

        {/* GRAPH TAB */}
        {activeTab === "graph" && (
          <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: C.text }}>Knowledge Graph</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
                Visual representation of extracted entities and relationships from your codebase history.
              </div>
              <GraphViz nodes={graphNodes} edges={[]} />
              <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Auth Middleware", type: "commit", desc: "JWT timezone fix • PR #42" },
                  { label: "MongoDB Decision", type: "pull_request", desc: "Rejected migration • PR #89" },
                  { label: "Redis Outage", type: "issue", desc: "Cache key collision • Issue #31" },
                  { label: "WebSocket Switch", type: "pull_request", desc: "94% API call reduction • PR #67" },
                ].map((node, i) => (
                  <div key={i} style={{
                    background: C.surface2, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: 16,
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <Badge color={node.type === "commit" ? C.cyan : node.type === "pull_request" ? C.green : C.amber}>
                        {node.type}
                      </Badge>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 4 }}>{node.label}</div>
                    <div style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>{node.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* OPS TAB */}
        {activeTab === "ops" && (
          <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            <div style={{ maxWidth: 500, margin: "0 auto" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Memory Operations</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
                Direct access to all 4 Cognee lifecycle APIs.
              </div>
              {[
                {
                  api: "remember()", color: C.cyan, icon: "🧠",
                  label: "Ingest Repository",
                  desc: "Fetches commits, PRs, and issues → builds knowledge graph",
                  action: () => handleIngest(true),
                  actionLabel: "Run remember()",
                  disabled: ingesting,
                },
                {
                  api: "recall()", color: C.green, icon: "🔍",
                  label: "Query Memory",
                  desc: "Ask a question — routes through session → vector → graph traversal",
                  action: () => setActiveTab("chat"),
                  actionLabel: "Go to Chat →",
                },
                {
                  api: "improve()", color: C.amber, icon: "⚡",
                  label: "Enrich Graph",
                  desc: "Reweights nodes by recall frequency, derives new relationship triplets, prunes stale edges",
                  action: handleImprove,
                  actionLabel: "Run improve()",
                },
                {
                  api: "forget()", color: C.red, icon: "🗑️",
                  label: "Clear Memory",
                  desc: "Wipe entire knowledge graph. Use to reset before re-ingesting a refactored codebase.",
                  action: handleForget,
                  actionLabel: "Run forget()",
                  danger: true,
                },
              ].map((op, i) => (
                <div key={i} style={{
                  background: C.surface2, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: 20, marginBottom: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{op.icon}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 13, color: op.color, fontWeight: 700 }}>{op.api}</span>
                    <span style={{ fontWeight: 600, fontSize: 15, color: C.text, marginLeft: 4 }}>{op.label}</span>
                  </div>
                  <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>{op.desc}</div>
                  <Btn onClick={op.action} color={op.color} disabled={op.disabled} danger={op.danger} small>
                    {op.actionLabel || op.api}
                  </Btn>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}