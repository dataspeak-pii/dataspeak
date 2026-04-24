from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any
import time

app = FastAPI(title="DataSpeak API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    sql: str
    explanation: str
    results: list[dict[str, Any]]
    tables_used: list[str]
    model_used: str
    duration_ms: int

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Pergunta não pode ser vazia.")
    start = time.time()
    # TODO (Chat 04): substituir por RAG + LLM real
    sql = "SELECT * FROM MARA LIMIT 10; -- placeholder"
    explanation = f"[MOCK] Recebi: '{req.question}'. Integração com LLM pendente."
    duration_ms = int((time.time() - start) * 1000)
    return QueryResponse(sql=sql, explanation=explanation, results=[],
                         tables_used=["MARA"], model_used="mock", duration_ms=duration_ms)
