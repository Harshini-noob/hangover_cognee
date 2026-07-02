import cognee

DATASET = "repo_memory"

async def remember_records(records):
    results = []
    for i, record in enumerate(records):
        try:
            await cognee.remember(record["text"], dataset_name=DATASET)
            print(f"  ✅ [{i+1}/{len(records)}] {record['id']}")
            results.append({"id": record["id"], "status": "ok"})
        except Exception as e:
            print(f"  ❌ [{i+1}/{len(records)}] {record['id']}: {e}")
            results.append({"id": record["id"], "status": "error", "error": str(e)})
    return results

async def recall_query(query):
    results = await cognee.recall(query_text=query)
    if not results:
        return {"answer": "No relevant memory found.", "raw": []}
    return {
        "answer": results[0].text if hasattr(results[0], 'text') else str(results[0]),
        "raw": [r.text if hasattr(r, 'text') else str(r) for r in results[:3]]
    }

async def run_improve():
    await cognee.improve()
    return {"status": "done"}

async def run_forget():
    await cognee.forget(everything=True)
    return {"status": "forgotten"}