import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

import cognee
from backend.memory import remember_records, run_improve

RECORDS = [
    {"id": "commit:a1b2", "type": "commit", "text": "COMMIT: Fix JWT token expiry using UTC instead of local time\nAuthor: harshini\nDate: 2024-03-15\nFiles: auth/middleware.py\nRoot cause: datetime.now() used IST local time causing tokens valid 5 extra hours. Fixed with datetime.now(timezone.utc)."},
    {"id": "pr:42", "type": "pull_request", "text": "PR #42 [MERGED]: Refactor database connection pooling\nReplaced single DB connection with pool of 10. Previous approach caused timeouts above 50 concurrent users. Used SQLAlchemy pool_pre_ping=True. 40% reduction in connection errors."},
    {"id": "issue:17", "type": "issue", "text": "ISSUE #17: Memory leak in websocket handler\nServer RAM grows 200MB/hour. Root cause: websocket connections not closed on client disconnect. Fixed by adding cleanup in on_disconnect handler."},
    {"id": "commit:b3c4", "type": "commit", "text": "COMMIT: Revert payment gateway to v1 API\nReverts commit e7f8a9b. v2 API had breaking changes in webhook signature verification. Rolled back to v1. Cost 6 hours of debugging."},
    {"id": "issue:31", "type": "issue", "text": "ISSUE #31 [POSTMORTEM]: Production outage Redis cache key collision\nTwo microservices used identical cache key user:{id}. Outage 45 minutes, 2000 users affected. Fix: namespaced all keys by service prefix."},
    {"id": "pr:67", "type": "pull_request", "text": "PR #67 [MERGED]: Switch REST polling to WebSocket\nFrontend polled every 2s causing 180k unnecessary requests/day. WebSocket reduced API calls 94%. Chose WebSocket over SSE for bidirectional support."},
    {"id": "commit:c5d6", "type": "commit", "text": "COMMIT: Add rate limiting to /api/search\n100 req/min per IP. Bot was hammering search causing DB CPU 95%. Used slowapi with Redis backend."},
    {"id": "issue:44", "type": "issue", "text": "ISSUE #44: CORS errors blocking mobile app in production\nRoot cause: CORS allowed_origins hardcoded to localhost. Fix: use environment variables. Never hardcode localhost in production configs."},
    {"id": "pr:89", "type": "pull_request", "text": "PR #89 [REJECTED]: Migrate PostgreSQL to MongoDB\nREJECTED. Reasons: strong relational data, PostgreSQL JSONB handles flexible fields, migration risk too high. Stay on PostgreSQL."},
    {"id": "issue:52", "type": "issue", "text": "ISSUE #52 [POSTMORTEM]: File uploads silently failing over 10MB\nRoot cause: nginx client_max_body_size 10MB but UI allowed 50MB. Fix: aligned nginx with app limits. Added clear error messages."},
]

async def main():
    print("🗑️ Clearing old memory...")
    await cognee.forget(everything=True)

    print(f"🧠 Ingesting {len(RECORDS)} records...")
    results = await remember_records(RECORDS)
    ok = len([r for r in results if r["status"] == "ok"])
    print(f"✅ {ok}/{len(RECORDS)} ingested")

    print("⚡ Running improve()...")
    await run_improve()
    print("🎉 Memory seeded and ready!")

asyncio.run(main())