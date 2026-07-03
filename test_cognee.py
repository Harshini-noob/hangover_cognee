import asyncio
from dotenv import load_dotenv
load_dotenv()

import cognee

async def main():
    print("Step 1: forget...")
    await cognee.forget(everything=True)
    print(" forget works")

    print("Step 2: remember...")
    await cognee.remember(
        "Critical bug in auth middleware: JWT tokens were using local server time "
        "instead of UTC. Fixed in PR #42. Root cause was datetime.now() instead of "
        "datetime.now(timezone.utc). Affected IST timezone users in production."
    )
    print(" remember works")

    print("Step 3: recall...")
    results = await cognee.recall(query_text="what caused the auth bug?")
    print(f" recall works — got {len(results)} results")
    if results:
        print(f"   Preview: {str(results[0])[:200]}")

    print("Step 4: improve...")
    await cognee.improve()
    print(" improve works")

    print("\n🎉 ALL GOOD — Cognee is working!")

asyncio.run(main())