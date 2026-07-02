import { useEffect, useRef } from "react";
import * as d3 from "d3";

const C = {
  bg: "#111827", cyan: "#00d4ff", green: "#00ff88",
  amber: "#ffb800", red: "#ff4560", muted: "#64748b",
  border: "#1e2d45", text: "#e2e8f0",
};

const TYPE_COLOR = {
  commit: C.cyan, pull_request: C.green,
  issue: C.amber, postmortem: C.red,
};

// Sample graph data matching our 10 ingested records
const GRAPH_DATA = {
  nodes: [
    { id: "auth_middleware", label: "Auth Middleware", type: "commit", weight: 3 },
    { id: "jwt_tokens", label: "JWT Tokens", type: "commit", weight: 2 },
    { id: "utc_fix", label: "UTC Fix", type: "commit", weight: 2 },
    { id: "pr42", label: "PR #42 DB Pool", type: "pull_request", weight: 3 },
    { id: "db_pool", label: "Connection Pool", type: "pull_request", weight: 2 },
    { id: "websocket", label: "WebSocket PR #67", type: "pull_request", weight: 3 },
    { id: "polling", label: "REST Polling", type: "issue", weight: 1 },
    { id: "redis_outage", label: "Redis Outage #31", type: "postmortem", weight: 3 },
    { id: "cache_key", label: "Cache Key Collision", type: "postmortem", weight: 2 },
    { id: "mongodb_rejected", label: "MongoDB Rejected #89", type: "pull_request", weight: 3 },
    { id: "postgresql", label: "PostgreSQL", type: "commit", weight: 2 },
    { id: "cors_issue", label: "CORS Error #44", type: "issue", weight: 2 },
    { id: "rate_limit", label: "Rate Limiting", type: "commit", weight: 2 },
    { id: "memory_leak", label: "Memory Leak #17", type: "issue", weight: 2 },
    { id: "websocket_cleanup", label: "WS Cleanup", type: "commit", weight: 1 },
    { id: "nginx_config", label: "Nginx Config #52", type: "postmortem", weight: 2 },
    { id: "payment_revert", label: "Payment Revert", type: "commit", weight: 2 },
  ],
  links: [
    { source: "auth_middleware", target: "jwt_tokens", label: "fixes" },
    { source: "jwt_tokens", target: "utc_fix", label: "caused_by" },
    { source: "pr42", target: "db_pool", label: "implements" },
    { source: "websocket", target: "polling", label: "replaces" },
    { source: "redis_outage", target: "cache_key", label: "caused_by" },
    { source: "mongodb_rejected", target: "postgresql", label: "rejected_for" },
    { source: "memory_leak", target: "websocket_cleanup", label: "fixed_by" },
    { source: "nginx_config", target: "cors_issue", label: "related" },
    { source: "rate_limit", target: "auth_middleware", label: "protects" },
    { source: "payment_revert", target: "pr42", label: "similar_risk" },
    { source: "redis_outage", target: "mongodb_rejected", label: "informed" },
    { source: "cors_issue", target: "auth_middleware", label: "related" },
  ],
};

export default function GraphD3({ width = 700, height = 420 }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Defs — glow filter
    const defs = svg.append("defs");
    ["cyan", "green", "amber", "red"].forEach((name, i) => {
      const colors = [C.cyan, C.green, C.amber, C.red];
      const filter = defs.append("filter").attr("id", `glow-${name}`);
      filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
      const merge = filter.append("feMerge");
      merge.append("feMergeNode").attr("in", "coloredBlur");
      merge.append("feMergeNode").attr("in", "SourceGraphic");
    });

    // Arrow marker
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", C.muted);

    const g = svg.append("g");

    // Zoom
    svg.call(d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Clone data to avoid mutation
    const nodes = GRAPH_DATA.nodes.map(n => ({ ...n }));
    const links = GRAPH_DATA.links.map(l => ({ ...l }));

    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(90))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Links
    const link = g.append("g").selectAll("line")
      .data(links).enter().append("line")
      .attr("stroke", C.border)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,3")
      .attr("marker-end", "url(#arrow)");

    // Link labels
    const linkLabel = g.append("g").selectAll("text")
      .data(links).enter().append("text")
      .attr("font-size", 9)
      .attr("fill", C.muted)
      .attr("font-family", "monospace")
      .attr("text-anchor", "middle")
      .text(d => d.label);

    // Node groups
    const node = g.append("g").selectAll("g")
      .data(nodes).enter().append("g")
      .call(d3.drag()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    const getColor = (type) => TYPE_COLOR[type] || C.muted;
    const getGlowId = (type) => {
      const map = { commit: "cyan", pull_request: "green", issue: "amber", postmortem: "red" };
      return `url(#glow-${map[type] || "cyan"})`;
    };

    // Outer glow ring
    node.append("circle")
      .attr("r", d => (d.weight || 1) * 8 + 4)
      .attr("fill", "none")
      .attr("stroke", d => getColor(d.type))
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.3);

    // Main circle
    node.append("circle")
      .attr("r", d => (d.weight || 1) * 8)
      .attr("fill", d => getColor(d.type) + "33")
      .attr("stroke", d => getColor(d.type))
      .attr("stroke-width", 1.5)
      .attr("filter", d => getGlowId(d.type))
      .style("cursor", "pointer");

    // Labels
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => (d.weight || 1) * 8 + 14)
      .attr("font-size", 9)
      .attr("font-family", "monospace")
      .attr("fill", C.text)
      .attr("opacity", 0.8)
      .text(d => d.label.length > 16 ? d.label.slice(0, 16) + "…" : d.label);

    // Tooltip on hover
    const tooltip = d3.select(tooltipRef.current);
    node
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .style("left", (event.offsetX + 12) + "px")
          .style("top", (event.offsetY - 10) + "px")
          .html(`<strong>${d.label}</strong><br/><span style="color:${getColor(d.type)}">${d.type}</span>`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.offsetX + 12) + "px")
          .style("top", (event.offsetY - 10) + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));

    // Tick
    sim.on("tick", () => {
      link
        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      linkLabel
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [width, height]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        style={{ background: "#111827", borderRadius: 10, border: "1px solid #1e2d45" }}
        viewBox={`0 0 ${width} ${height}`}
      />
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: "absolute", opacity: 0, pointerEvents: "none",
          background: "#0a0e1a", border: "1px solid #1e2d45",
          borderRadius: 6, padding: "8px 12px", fontSize: 12,
          color: "#e2e8f0", fontFamily: "monospace",
          transition: "opacity 0.15s",
        }}
      />
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
        {[["commit", C.cyan], ["pull_request", C.green], ["issue", C.amber], ["postmortem", C.red]].map(([type, col]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: col, fontFamily: "monospace" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: col + "44", border: `1px solid ${col}` }} />
            {type}
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
        drag nodes • scroll to zoom • hover for details
      </div>
    </div>
  );
}