# Memory Surgeon

**Codebases that operate with total recall.**

Every codebase has tribal knowledge — why a decision was made, what broke last time, what got tried and rejected — that lives in people's heads, not in the code. When that person leaves, the knowledge leaves with them.

Memory Surgeon turns your repo's commit and issue history into a living, queryable knowledge graph using [Cognee](https://www.cognee.ai/), an open-source memory framework. Ask *why* code was written, catch repeated mistakes, and get an onboarding-ready report generated straight from your project's real history.

## About the Project

Memory Surgeon turns a codebase's commit and issue history into a living, queryable knowledge graph, so a team's institutional knowledge doesn't disappear when someone leaves. It ingests real GitHub history, uses Cognee to extract entities and relationships into an actual graph, and lets you ask natural-language questions grounded in that history, check whether a planned change has already failed before, and auto-generate a full onboarding report — architecture decisions, danger zones, rejected approaches, and lessons learned — straight from the project's real past, not documentation nobody wrote.

## 🎥 Demo Video

LINK:https://drive.google.com/file/d/1r2IkcPIt1cJHJr5JCQNsMpLpHAiPDOb9/view?usp=sharing


## What it does

- **Ingest**: Pull commits/issues from any public GitHub repo (or use bundled sample data)
- **Remember**: Cognee's `remember()` extracts entities and relationships from each record using an LLM, building a real knowledge graph — not a static summary
- **Recall**: Ask natural-language questions and get answers grounded in your actual repo history, not hallucinated
- **Risk Check**: Describe a planned change, get an instant assessment of whether something similar has been tried/failed before
- **Tribal Report**: Auto-generates a 5-section onboarding document (architecture decisions, danger zones, rejected approaches, hard-won lessons, coding conventions) — the doc every team promises to write and never does
- **Neural Graph**: Live D3 force-directed visualization of the actual ingested knowledge graph, with an honest fallback to a labeled demo graph if nothing's been ingested yet

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  React Frontend │  HTTP   │  FastAPI Backend  │         │   GitHub    │
│  (Vite + D3)    │────────▶│                   │────────▶│   API       │
└─────────────────┘         │  - /ingest        │         └─────────────┘
                             │  - /recall        │
                             │  - /risk-check    │         ┌─────────────┐
                             │  - /tribal-report │────────▶│   Cognee    │
                             │  - /graph         │         │  (memory +  │
                             │  - /status        │         │   graph db) │
                             └──────────────────┘         └──────┬──────┘
                                                                   │
                                                            ┌──────▼──────┐
                                                            │  Groq LLM   │
                                                            │ (extraction │
                                                            │  + recall)  │
                                                            └─────────────┘
```

**Stack:**
- **Frontend:** React 19 + Vite, D3.js for the live knowledge graph visualization
- **Backend:** FastAPI (Python)
- **Memory engine:** Cognee (open-source), running fully local — `remember()`, `recall()`, and `improve()` APIs, with a local Ladybug graph database and SQLite metadata store
- **LLM:** Groq (`llama-3.1-8b-instant` / `llama-3.3-70b-versatile`), accessed via Cognee's LiteLLM integration, using `json_mode` for reliable structured output
- **Embeddings:** fastembed (local, no external API needed)
- **Data source:** GitHub REST API via PyGithub, for live commit/issue ingestion

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  
pip install -r requirements.txt
cp .env.example .env       
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env       
npm run dev
```

Open `http://localhost:5173`.

### Required environment variables

See `.env.example` for the full list. At minimum you need:
- `LLM_API_KEY` — a free Groq API key from [console.groq.com](https://console.groq.com)
- `GITHUB_TOKEN` — a GitHub personal access token (no special scopes needed for public repos)
- `GITHUB_REPO` — default repo to ingest, e.g. `owner/name` (or type one directly in the app's Repository tab, which overrides this per-request)

## A note on the free-tier LLM rate limits

This project runs entirely on Groq's free tier, which has real token-per-minute and token-per-day caps. A few design choices reflect that:
- `LLM_INSTRUCTOR_MODE=json_mode` avoids a known reliability issue with Groq's tool-calling for structured extraction
- Tribal Report queries are explicitly forced to `SearchType.GRAPH_COMPLETION` (single-shot) instead of the auto-router's default Chain-of-Thought mode, and spaced out to respect the rolling 60s TPM window
- `max_commits` is configurable in `backend/main.py`'s `/ingest` route — tune it based on your available quota

## Known limitations

- Ingesting a large repo on Groq's free tier can take several minutes due to rate-limit spacing — this is a quota tradeoff, not a performance bug
- The Neural Graph shows a clearly labeled demo graph as a fallback if nothing has been ingested yet, rather than silently displaying fake data as real
 
## Why Cognee

Memory Surgeon is built to demonstrate what Cognee can do with a real, continuous use case: not just storing facts, but building institutional memory a team can actually query — using Cognee's `remember()`, `recall()`, and self-improvement APIs as the core engine, not just a bolted-on feature.