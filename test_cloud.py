import asyncio
from dotenv import load_dotenv
load_dotenv()

import cognee

async def main():
    

    await cognee.remember(
        "Harshini fixed the authentication bug in PR #42. "
        "JWT tokens used local time instead of UTC."
    )

    results = await cognee.recall(
        query_text="Who fixed the authentication bug?"
    )

    print(results)

asyncio.run(main())