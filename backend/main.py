# backend/main.py - Day 2 complete FastAPI backend
import asyncio
import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()

import cognee
from cognee.modules.search.types import SearchType



# Point to Cognee Cloud
os.environ["COGNEE_API_KEY"] = os.getenv("COGNEE_API_KEY", "")
os.environ["COGNEE_BASE_URL"] = os.getenv("COGNEE_BASE_URL", "")

DATASET = "repo_memory"

def _parse_repo(raw: Optional[str]) -> Optional[str]:
    """Accepts 'owner/name', a full GitHub URL, or None. Returns 'owner/name' or None."""
    if not raw or not raw.strip():
        return None
    s = raw.strip().rstrip("/")
    if s.startswith("http://") or s.startswith("https://"):
        s = s.split("github.com/")[-1]
    s = s.removesuffix(".git")
    parts = [p for p in s.split("/") if p]
    if len(parts) >= 2:
        return f"{parts[-2]}/{parts[-1]}"
    return None


# ── Startup ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to Cognee Cloud if credentials are present
    base_url = os.getenv("COGNEE_BASE_URL")
    api_key = os.getenv("COGNEE_API_KEY")
    if base_url and api_key:
        await cognee.serve(url=base_url, api_key=api_key)
        print(f"Connected to Cognee Cloud: {base_url}")
    else:
        print("Running local Cognee (no cloud credentials)")
    print("CodeBase Memory Surgeon API ready")
    yield

app = FastAPI(title="CodeBase Memory Surgeon", lifespan=lifespan)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ────────────────────────────────────────────────
class RecallRequest(BaseModel):
    query: str

class FeedbackRequest(BaseModel):
    record_id: str
    was_helpful: bool

class ForgetNodeRequest(BaseModel):
    node_set: str

class IngestRequest(BaseModel):
    use_sample: bool = True   # True = sample data, False = GitHub
    repo: Optional[str] = None  # e.g. "owner/name" — overrides GITHUB_REPO env var

# ── Sample data (used for fast demo) ─────────────────────
SAMPLE_RECORDS = [
    {"id": "commit:a1b2c3d4", "type": "commit",
     "text": "COMMIT: Fix JWT token expiry using UTC instead of local time\nAuthor: harshini\nDate: 2024-03-15\nFiles: auth/middleware.py\nRoot cause: datetime.now() used IST local time causing tokens valid 5 extra hours. Fixed with datetime.now(timezone.utc)."},
    {"id": "pr:42", "type": "pull_request",
     "text": "PR #42 [MERGED]: Refactor database connection pooling\nReplaced single DB connection with pool of 10. Previous approach caused timeouts above 50 concurrent users. Used SQLAlchemy pool with pool_pre_ping=True. 40% reduction in connection errors."},
    {"id": "issue:17", "type": "issue",
     "text": "ISSUE #17: Memory leak in websocket handler\nServer RAM grows 200MB/hour. Root cause: websocket connections not closed on client disconnect. Fixed by adding explicit cleanup in on_disconnect handler. Always test with long-running connections."},
    {"id": "commit:b3c4d5e6", "type": "commit",
     "text": "COMMIT: Revert payment gateway to v1 API\nReverts commit e7f8a9b. v2 payment API had breaking changes in webhook signature verification. Rolled back to v1. Cost 6 hours of debugging."},
    {"id": "issue:31", "type": "issue",
     "text": "ISSUE #31 [POSTMORTEM]: Production outage — Redis cache key collision\nTwo microservices used identical cache key format 'user:{id}'. Outage 45 minutes, 2000 users affected. Fix: namespaced all cache keys by service. New convention: '{service}:user:{id}'."},
    {"id": "pr:67", "type": "pull_request",
     "text": "PR #67 [MERGED]: Switch REST polling to WebSocket\nFrontend polled /api/status every 2s causing 180k unnecessary requests/day. WebSocket reduced API calls 94%. Chose WebSocket over SSE for future bidirectional support."},
    {"id": "commit:c5d6e7f8", "type": "commit",
     "text": "COMMIT: Add rate limiting to /api/search\nAdded 100 req/min per IP. Bot was hammering search causing DB CPU 95%. Used slowapi with Redis backend. Added exponential backoff on frontend."},
    {"id": "issue:44", "type": "issue",
     "text": "ISSUE #44: CORS errors blocking mobile app in production\nApp connected fine in dev but not production. Root cause: CORS allowed_origins hardcoded to localhost. Fix: use environment variables for allowed origins. Never hardcode localhost in production."},
    {"id": "pr:89", "type": "pull_request",
     "text": "PR #89 [REJECTED]: Migrate PostgreSQL to MongoDB\nREJECTED. Reasons: strong relational data structure, PostgreSQL JSONB handles flexible fields, migration risk too high. Decision: stay on PostgreSQL, use JSONB for dynamic fields."},
    {"id": "issue:52", "type": "issue",
     "text": "ISSUE #52 [POSTMORTEM]: File uploads silently failing over 10MB\nUsers reported files disappearing with no error. Root cause: nginx client_max_body_size 10MB but UI allowed 50MB. Fix: aligned nginx with app limits. Added clear user error messages."},
]

# ── In-memory state ───────────────────────────────────────
state = {
    "ingested": False,
    "record_count": 0,
    "node_count": 0,
    "edge_count": 0,
    "ingesting": False,
}

# ── Routes ────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "ingested": state["ingested"]}

@app.get("/status")
def status():
    return state

@app.post("/ingest")
async def ingest(req: IngestRequest):
    if state["ingesting"]:
        raise HTTPException(409, "Ingestion already running")

    state["ingesting"] = True
    try:
        await cognee.forget(everything=True)

        records = SAMPLE_RECORDS
        if not req.use_sample:
            token = os.getenv("GITHUB_TOKEN")
            repo_name = _parse_repo(req.repo) or os.getenv("GITHUB_REPO")
            if token and repo_name:
                from backend.github_fetcher import GitHubFetcher
                fetcher = GitHubFetcher(repo_name)
                records = fetcher.fetch_all(max_commits=5, max_issues=10)
            else:
                missing = []
                if not token: missing.append("GITHUB_TOKEN (set in backend .env)")
                if not repo_name: missing.append("a repo (type one in the UI, or set GITHUB_REPO in .env)")
                raise HTTPException(400, f"Missing: {' and '.join(missing)}")

        for record in records:
            await cognee.remember(record["text"], dataset_name=DATASET)

        try:
            await cognee.improve()
        except Exception as e:
            print(f"improve() failed (non-fatal, continuing): {e}")

        # Pull real node/edge counts from the graph engine instead of guessing
        try:
            from cognee.infrastructure.databases.graph import get_graph_engine
            from cognee.modules.data.methods import get_authorized_existing_datasets
            from cognee.modules.users.methods import get_default_user
            from cognee.context_global_variables import set_database_global_context_variables

            user = await get_default_user()
            datasets = await get_authorized_existing_datasets([DATASET], "read", user)
            if datasets:
                async with set_database_global_context_variables(datasets[0].id, datasets[0].owner_id):
                    graph_engine = await get_graph_engine()
                    real_nodes, real_edges = await graph_engine.get_graph_data()
                node_count, edge_count = len(real_nodes), len(real_edges)
            else:
                node_count, edge_count = 0, 0
        except Exception as e:
            print(f"Could not read real graph stats (non-fatal): {e}")
            node_count, edge_count = 0, 0

        state["ingested"] = True
        state["record_count"] = len(records)
        state["node_count"] = node_count
        state["edge_count"] = edge_count
        state["ingesting"] = False

        return {
            "status": "complete",
            "records": len(records),
            "nodes": state["node_count"],
            "edges": state["edge_count"],
        }
    except Exception as e:
        state["ingesting"] = False
        import traceback
        traceback.print_exc()
        raise HTTPException(500, str(e))


@app.post("/recall")
async def recall(req: RecallRequest):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    try:
        results = await cognee.recall(
            query_text=req.query,
            datasets=[DATASET],
            query_type=SearchType.GRAPH_COMPLETION,
            top_k=5,
        )
        if not results:
            return {"query": req.query, "answer": "No relevant memory found.", "citations": []}

        answer = results[0].text if hasattr(results[0], "text") else str(results[0])
        return {
            "query": req.query,
            "answer": answer,
            "citations": [
                r.text[:150] if hasattr(r, "text") else str(r)
                for r in results[:3]
            ],
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/improve")
async def improve():
    try:
        await cognee.improve()
        return {"status": "Graph enrichment complete"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/feedback")
async def feedback(req: FeedbackRequest):
    note = f"User feedback on {req.record_id}: {'HELPFUL' if req.was_helpful else 'NOT HELPFUL'}"
    await cognee.remember(note, dataset_name=DATASET)
    return {"status": "feedback recorded", "record_id": req.record_id}


@app.delete("/forget")
async def forget_all():
    await cognee.forget(everything=True)
    state["ingested"] = False
    state["record_count"] = 0
    state["node_count"] = 0
    state["edge_count"] = 0
    return {"status": "All memory cleared"}

class RiskRequest(BaseModel):
    change_description: str

@app.post("/risk-check")
async def risk_check(req: RiskRequest):
    if not req.change_description.strip():
        raise HTTPException(400, "Describe the change first")
    
    query = f"Have we tried or failed with something similar to: {req.change_description}"
    try:
        results = await cognee.recall(
            query_text=query,
            datasets=[DATASET],
            query_type=SearchType.GRAPH_COMPLETION,
            top_k=5,
        )
        if not results:
            return {
                "risk_level": "unknown",
                "warning": None,
                "message": "No similar past decisions found in memory.",
                "safe": True,
            }

        answer = results[0].text if hasattr(results[0], "text") else str(results[0])

        danger_keywords = ["failed", "reverted", "outage", "broken", "rejected", "bug", "incident", "postmortem", "rollback"]
        caution_keywords = ["changed", "replaced", "switched", "refactored", "fixed"]

        answer_lower = answer.lower()
        risk_level = "low"
        if any(w in answer_lower for w in danger_keywords):
            risk_level = "high"
        elif any(w in answer_lower for w in caution_keywords):
            risk_level = "medium"

        return {
            "risk_level": risk_level,
            "warning": answer if risk_level != "low" else None,
            "message": answer,
            "safe": risk_level == "low",
        }
    except Exception as e:
        raise HTTPException(500, str(e))
    

@app.get("/graph")
async def get_graph():
    try:
        from cognee.infrastructure.databases.graph import get_graph_engine
        from cognee.modules.data.methods import get_authorized_existing_datasets
        from cognee.modules.users.methods import get_default_user
        from cognee.context_global_variables import set_database_global_context_variables

        user = await get_default_user()
        datasets = await get_authorized_existing_datasets([DATASET], "read", user)
        if not datasets:
            return {"nodes": [], "edges": []}

        async with set_database_global_context_variables(datasets[0].id, datasets[0].owner_id):
            graph_engine = await get_graph_engine()
            raw_nodes, raw_edges = await graph_engine.get_graph_data()

        def guess_type(props: dict) -> str:
            t = (props.get("type") or props.get("node_type") or "").lower()
            if "commit" in t: return "commit"
            if "pull" in t or "pr" in t: return "pull_request"
            if "issue" in t: return "issue"
            if "postmortem" in t or "incident" in t: return "postmortem"
            return "commit"

        def guess_label(node_id: str, props: dict) -> str:
            for key in ("name", "title", "text", "description"):
                val = props.get(key)
                if val:
                    return str(val)[:60]
            return str(node_id)[:24]

        nodes = [
            {
                "id": str(node_id),
                "label": guess_label(node_id, props or {}),
                "type": guess_type(props or {}),
                "weight": min(3, max(1, len(props or {}) // 3)),
            }
            for node_id, props in raw_nodes
        ]
        edges = [
            {"source": str(src), "target": str(tgt), "label": rel}
            for src, tgt, rel, _props in raw_edges
        ]
        return {"nodes": nodes, "edges": edges}
    except Exception as e:
        raise HTTPException(500, f"Could not load graph: {e}")


@app.get("/tribal-report")
async def tribal_report():
    queries = [
        ("Architecture Decisions", "what are the main architectural decisions and why were they made?"),
        ("Known Danger Zones", "what are the recurring bugs incidents and failure patterns?"),
        ("Rejected Approaches", "what approaches or migrations were rejected and why?"),
        ("Hard-Won Lessons", "what lessons were learned from production incidents?"),
        ("Coding Conventions", "what coding conventions and best practices does this codebase follow?"),
    ]
    sections = []
    for i, (title, query) in enumerate(queries):
        if i > 0:
            await asyncio.sleep(65)  # each call costs ~3.7k tokens; must wait out the rolling 60s TPM window
        try:
            results = await cognee.recall(query_text=query, datasets=[DATASET], query_type=SearchType.GRAPH_COMPLETION, top_k=5)
            answer = results[0].text if results and hasattr(results[0], "text") else "No data found."
            sections.append({"title": title, "content": answer})
        except Exception as e:
            sections.append({"title": title, "content": f"Could not retrieve: {str(e)}"})
    return {
        "title": "Tribal Knowledge Report",
        "subtitle": "Auto-generated onboarding doc from codebase memory",
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "sections": sections,
    }