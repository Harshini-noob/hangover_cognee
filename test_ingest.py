import httpx
import asyncio

async def main():
    print("Starting ingest... (takes 2-3 mins, be patient)")
    async with httpx.AsyncClient(timeout=300) as client:
        r = await client.post("http://localhost:8000/ingest")
        print(r.json())

asyncio.run(main())