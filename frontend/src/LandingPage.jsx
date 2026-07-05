import { useEffect, useRef, useState } from "react";
import logo from "./assets/logo.png";

const TYPING_LINES = [
  "recall('why was auth middleware changed?')",
  "remember('PR #89: MongoDB migration rejected — relational risk too high')",
  "risk_check('migrate PostgreSQL to MongoDB')",
  "improve() // reweighting 108 nodes, 159 edges...",
];

export default function Landing({ onEnter }) {
  const [displayText, setDisplayText] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");

  // Typing animation
  useEffect(() => {
    const line = TYPING_LINES[lineIdx];
    let timeout;

    if (!deleting && charIdx < line.length) {
      timeout = setTimeout(() => {
        setDisplayText(line.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      }, 45);
    } else if (!deleting && charIdx === line.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setDisplayText(line.slice(0, charIdx - 1));
        setCharIdx(c => c - 1);
      }, 18);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setLineIdx(i => (i + 1) % TYPING_LINES.length);
    }
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, lineIdx]);

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", background: "#050505" }}>
      <div className="scanline" />

      {/* Ambient background orbs */}
      <div style={{
        position: "fixed", top: "20%", left: "10%", width: 600, height: 600,
        background: "radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", top: "50%", right: "5%", width: 500, height: 500,
        background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "10%", left: "30%", width: 400, height: 400,
        background: "radial-gradient(circle, rgba(0,255,136,0.03) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Top nav */}
      <header className="glass" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: 64, display: "flex", alignItems: "center",
        padding: "0 24px", justifyContent: "space-between",
        boxShadow: "0 0 20px rgba(0,212,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logo} alt="Memory Surgeon logo" style={{ width: 26, height: 26, objectFit: "contain" }} />
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: "var(--cyan-soft)" }}>
            Memory Surgeon
          </span>
        </div>
        <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {["Neural Graph", "Surgery", "Repository", "Pulse"].map((item, i) => (
            <span key={item} className="mono" style={{
              fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase",
              color: i === 0 ? "var(--cyan)" : "var(--text-muted)",
              borderBottom: i === 0 ? "1px solid var(--cyan)" : "none",
              paddingBottom: 2, cursor: "pointer",
            }}>{item}</span>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 16 }}>
          {["memory", "terminal", "settings"].map(icon => (
            <span key={icon} className="material-symbols-outlined" style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>{icon}</span>
          ))}
        </div>
      </header>

      {/* Hero content */}
      <main style={{
        position: "relative", zIndex: 10,
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 24px 40px", textAlign: "center",
      }}>
        {/* Status badge */}
        <div className="glass fade-up" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 999,
          border: "1px solid rgba(0,212,255,0.2)", marginBottom: 32,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} className="pulse" />
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Neural Synapse Active
          </span>
        </div>

        {/* Headline */}
        <h1 className="fade-up delay-1" style={{ fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, maxWidth: 800 }}>
          Codebases that operate{" "}
          <span className="grad-cyan">with total recall.</span>
        </h1>

        {/* Subtitle */}
        <p className="fade-up delay-2" style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 600, lineHeight: 1.7, marginBottom: 48 }}>
          Every commit, PR, and incident — transformed into a living knowledge graph.
          Ask <em>why</em> code was written, catch repeated mistakes, and never lose institutional memory again.
        </p>

        {/* Repo input */}
        <div className="fade-up delay-3" style={{ width: "100%", maxWidth: 580, marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: -1,
              background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,255,136,0.08))",
              borderRadius: 14, filter: "blur(8px)", opacity: 0.6,
              transition: "opacity 0.3s",
            }} />
            <div style={{
              position: "relative", display: "flex", alignItems: "center",
              background: "var(--surface-low)", border: "1px solid rgba(60,73,78,0.6)",
              borderRadius: 12, padding: "12px 16px",
              transition: "border-color 0.2s",
            }}>
              <span className="material-symbols-outlined" style={{ color: "var(--cyan)", marginRight: 12, fontSize: 20 }}>terminal</span>
              <input
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onEnter(repoUrl)}
                placeholder="Enter repository URL to begin surgery..."
                className="mono"
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--text)", fontSize: 13, letterSpacing: 0,
                }}
              />
              <button
                onClick={() => onEnter(repoUrl)}
                style={{
                  background: "linear-gradient(135deg, var(--cyan), #0099bb)",
                  color: "#001f27", padding: "8px 20px", borderRadius: 8,
                  border: "none", cursor: "pointer", fontWeight: 700,
                  fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
                  fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
                  marginLeft: 12,
                }}
              >
                Begin Surgery →
              </button>
            </div>
          </div>
        </div>

        {/* Tag chips */}
        <div className="fade-up delay-3" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
          {["#root-cause", "#architecture-audit", "#refactor-history", "#incident-recall"].map(tag => (
            <span key={tag} className="mono" style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(60,73,78,0.4)",
              color: "var(--text-muted)", padding: "4px 10px", borderRadius: 4,
              fontSize: 11, letterSpacing: "0.03em",
            }}>{tag}</span>
          ))}
        </div>

        {/* Terminal typing card */}
        <div className="glass glow-green fade-up delay-3" style={{
          borderRadius: 10, padding: 20, width: "100%", maxWidth: 560,
          borderLeft: "3px solid var(--green)", textAlign: "left",
        }}>
          {/* Titlebar dots */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, opacity: 0.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5449" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffb4ab" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#00e479" }} />
          </div>
          <div className="mono" style={{ fontSize: 13, minHeight: 22, color: "var(--text)" }}>
            <span style={{ color: "var(--green)", fontWeight: 700 }}>surgeon@prompt:~$ </span>
            <span>{displayText}</span>
            <span className="cursor" />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 40, marginTop: 56, justifyContent: "center" }}>
          {[
            { val: "108", label: "Graph Nodes" },
            { val: "159", label: "Relationships" },
            { val: "4", label: "Cognee APIs Used" },
            { val: "∞", label: "Institutional Memory" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--cyan)", letterSpacing: "-0.03em" }}>{s.val}</div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}