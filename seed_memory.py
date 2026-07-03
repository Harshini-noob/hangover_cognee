import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

import cognee
from backend.memory import remember_records, run_improve

async def main():
    print("🗑️ Clearing old memory...")
    await cognee.forget(everything=True)

    records = []
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPO")

    if token and repo:
        print(f"📡 Fetching real data from {repo}...")
        try:
            from backend.github_fetcher import GitHubFetcher
            fetcher = GitHubFetcher()
            records = fetcher.fetch_all(max_commits=20, max_prs=0, max_issues=10)
        except Exception as e:
            print(f"⚠️ GitHub fetch failed: {e}")

    if not records:
        print("📦 Falling back to synthetic records...")
        from backend.main import SAMPLE_RECORDS
        records = SAMPLE_RECORDS

    print(f"\n🧠 Ingesting {len(records)} records...")
    results = await remember_records(records)
    ok = len([r for r in results if r["status"] == "ok"])
    print(f"✅ {ok}/{len(records)} ingested")

    await run_improve()
    print("🎉 Memory seeded!")

asyncio.run(main())