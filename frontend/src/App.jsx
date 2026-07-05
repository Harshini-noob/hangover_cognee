import { useState, useEffect } from "react";
import LandingPage from "./LandingPage";
import Dashboard from "./Dashboard";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [entered, setEntered] = useState(false);
  const [initialRepoUrl, setInitialRepoUrl] = useState("");

  const [status, setStatus] = useState({
    ingested: false,
    record_count: 0,
    node_count: 0,
    edge_count: 0,
  });

  // Sync with backend on load so a refresh doesn't lose ingestion state
  useEffect(() => {
    fetch(`${API}/status`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setStatus(s => ({ ...s, ...data })); })
      .catch(() => {}); // backend not up yet — fine, defaults stand
  }, []);

  return entered ? (
    <Dashboard
      status={status}
      setStatus={setStatus}
      initialRepoUrl={initialRepoUrl}
    />
  ) : (
    <LandingPage
      onEnter={(repoUrl) => { setInitialRepoUrl(repoUrl || ""); setEntered(true); }}
    />
  );
}