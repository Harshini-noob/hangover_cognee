import asyncio
from dotenv import load_dotenv
load_dotenv()

import cognee

async def main():
    queries = [
        "what caused the auth bug?",
        "why did we reject the MongoDB migration?",
        "what lessons did we learn from production incidents?",
    ]
    for q in queries:
        print(f"\nQ: {q}")
        results = await cognee.recall(query_text=q, datasets=["repo_memory"])
        if results:
            print(f"A: {results[0].text[:300]}")
        else:
            print("A: no result")

asyncio.run(main())