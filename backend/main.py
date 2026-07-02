import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()

import cognee
from .github_fetcher import GitHubFetcher
from .memory import remember_records, recall_query, run_improve, run_forget

app = FastAPI(title="CodeBase Memory Surgeon")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class RecallRequest(BaseModel):
    query: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ingest")
async def ingest():
    fetcher = GitHubFetcher()
    records = fetcher.fetch_all()
    results = await remember_records(records)
    ok = len([r for r in results if r["status"] == "ok"])
    return {"ingested": ok, "total": len(records), "records": results}

@app.post("/recall")
async def recall(req: RecallRequest):
    return await recall_query(req.query)

@app.post("/improve")
async def improve():
    return await run_improve()

@app.delete("/forget")
async def forget():
    return await run_forget()