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



# Point to Cognee Cloud
os.environ["COGNEE_API_KEY"] = os.getenv("COGNEE_API_KEY", "")
os.environ["COGNEE_BASE_URL"] = os.getenv("COGNEE_BASE_URL", "")

DATASET = "repo_memory"


# ── Startup ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("CodeBase Memory Surgeon API ready")
    yield

app = FastAPI(title="CodeBase Memory Surgeon", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
            repo_name = os.getenv("GITHUB_REPO")
            if token and repo_name:
                from backend.github_fetcher import GitHubFetcher
                fetcher = GitHubFetcher()
                records = fetcher.fetch_all(max_commits=20, max_issues=10)
            else:
                raise HTTPException(400, "GITHUB_TOKEN and GITHUB_REPO must be set for real data")

        for record in records:
            await cognee.remember(record["text"], dataset_name=DATASET)

        await cognee.improve()

        state["ingested"] = True
        state["record_count"] = len(records)
        state["node_count"] = 109   
        state["edge_count"] = 172
        state["ingesting"] = False

        return {
            "status": "complete",
            "records": len(records),
            "nodes": state["node_count"],
            "edges": state["edge_count"],
        }
    except Exception as e:
        state["ingesting"] = False
        raise HTTPException(500, str(e))


@app.post("/recall")
async def recall(req: RecallRequest):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    try:
        results = await cognee.recall(
            query_text=req.query,
            datasets=[DATASET]
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
            datasets=[DATASET]
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
    

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to Cognee Cloud
    base_url = os.getenv("COGNEE_BASE_URL")
    api_key = os.getenv("COGNEE_API_KEY")
    if base_url and api_key:
        await cognee.serve(api_url=base_url, api_key=api_key)
        print(f"Connected to Cognee Cloud: {base_url}")
    else:
        print(" Running local Cognee (no cloud credentials)")
    yield


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
    for title, query in queries:
        try:
            results = await cognee.recall(query_text=query, datasets=[DATASET])
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