import asyncio
from dotenv import load_dotenv
load_dotenv()

import cognee
from backend.memory import remember_records, run_improve


SAMPLE_RECORDS = [
    {
        "id": "commit:a1b2c3d4",
        "type": "commit",
        "text": "COMMIT: Fix JWT token expiry using UTC instead of local time\nAuthor: harshini\nDate: 2024-03-15\nChanged files: auth/middleware.py\nRoot cause: datetime.now() was using IST local time causing tokens to stay valid 5 hours extra. Fixed by replacing with datetime.now(timezone.utc) across all auth modules.",
    },
    {
        "id": "pr:42",
        "type": "pull_request",
        "text": "PR #42 [MERGED]: Refactor database connection pooling\nAuthor: harshini\nDescription: Replaced single DB connection with connection pool of size 10. Previous approach caused timeout errors under load above 50 concurrent users. Decision was made to use SQLAlchemy pool with pool_pre_ping=True after testing showed 40% reduction in connection errors.",
    },
    {
        "id": "issue:17",
        "type": "issue",
        "text": "ISSUE #17: Memory leak in websocket handler\nDescription: Server RAM usage grows by 200MB per hour under normal load. Root cause identified as websocket connections not being properly closed on client disconnect. Fixed by adding explicit cleanup in on_disconnect handler. Lesson: always test with long-running connections.",
    },
    {
        "id": "commit:b3c4d5e6",
        "type": "commit",
        "text": "COMMIT: Revert payment gateway integration to v1 API\nAuthor: harshini\nDate: 2024-04-02\nThis reverts commit e7f8a9b. The v2 payment API had undocumented breaking changes in webhook signature verification. Rolled back to v1 until vendor fixes documentation. Cost us 6 hours of debugging.",
    },
    {
        "id": "issue:31",
        "type": "issue",
        "text": "ISSUE #31 [POSTMORTEM]: Production outage — Redis cache key collision\nDescription: Two microservices used identical cache key format 'user:{id}' causing one service to overwrite another's data. Outage lasted 45 minutes affecting 2000 users. Fix: namespaced all cache keys by service prefix. New convention: '{service}:user:{id}'. All teams must follow this going forward.",
    },
    {
        "id": "pr:67",
        "type": "pull_request",
        "text": "PR #67 [MERGED]: Switch from REST polling to WebSocket for live updates\nAuthor: harshini\nDescription: Frontend was polling /api/status every 2 seconds causing 180k unnecessary requests per day. Replaced with WebSocket connection. Decision debated: SSE vs WebSocket. Chose WebSocket because we needed bidirectional communication for future features. 94% reduction in API calls.",
    },
    {
        "id": "commit:c5d6e7f8",
        "type": "commit",
        "text": "COMMIT: Add rate limiting to /api/search endpoint\nAuthor: harshini\nDate: 2024-04-18\nAdded 100 requests/minute per IP limit. A bot was hammering the search endpoint causing DB CPU to spike to 95%. Used slowapi with Redis backend. Also added exponential backoff on the frontend.",
    },
    {
        "id": "issue:44",
        "type": "issue",
        "text": "ISSUE #44: CORS errors blocking mobile app in production\nDescription: Mobile app could not connect to API in production but worked in development. Root cause: CORS allowed_origins was set to localhost only. Fix: Added production domain to allowed_origins list. Note: never hardcode localhost in production configs — use environment variables.",
    },
    {
        "id": "pr:89",
        "type": "pull_request",
        "text": "PR #89 [REJECTED]: Migrate from PostgreSQL to MongoDB\nAuthor: contributor\nDescription: Proposed switching entire database to MongoDB for flexibility. REJECTED after team discussion. Reasons: existing data has strong relational structure, PostgreSQL JSONB already handles flexible fields, migration risk too high at current stage. Decision: stay on PostgreSQL, use JSONB for dynamic fields.",
    },
    {
        "id": "issue:52",
        "type": "issue",
        "text": "ISSUE #52 [POSTMORTEM]: File upload silently failing for files over 10MB\nDescription: Users reported uploaded files disappearing with no error message. Root cause: nginx had client_max_body_size set to 10MB but our UI allowed up to 50MB. Fix: Aligned nginx config with application limits. Added proper error handling to show users a clear message when file is too large.",
    },
]

async def main():
    
    
    print(f"\n Ingesting {len(SAMPLE_RECORDS)} decision records...")
    results = await remember_records(SAMPLE_RECORDS)
    ok = len([r for r in results if r["status"] == "ok"])
    print(f"\n Ingested: {ok}/{len(SAMPLE_RECORDS)}")

    print("\n Running improve()...")
    await run_improve()

    print("\nTesting recall...")
    test_queries = [
        "what caused the auth bug?",
        "why did we reject the MongoDB migration?",
        "what lessons did we learn from production incidents?",
    ]
    for q in test_queries:
        r = await cognee.recall(query_text=q)
        answer = r[0].text if r else "no result"
        print(f"\nQ: {q}")
        print(f"A: {answer[:200]}")

    print("\n Done! Memory Surgeon is loaded and ready.")

asyncio.run(main())