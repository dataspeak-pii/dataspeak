from dotenv import load_dotenv
load_dotenv()

import time
import json
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .ai_engine.generator import generate_sql

app = FastAPI(title="DataSpeak API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- Schemas --------------------

class QueryRequest(BaseModel):
    """Payload de entrada do endpoint /query."""
    question: str = Field(..., min_length=1, description="Pergunta em linguagem natural")
    model: str | None = Field(default=None, description="Modelo OpenRouter (opcional, para comparação)")


class QueryResponse(BaseModel):
    """Payload de resposta do endpoint /query."""
    question: str
    sql: str
    explanation: str
    tables_used: list[str]
    retrieved_tables: list[str]
    confidence: str
    assumptions: list[str]
    intent: Optional[str] = None
    category: Optional[str] = None
    period: Optional[str] = None
    model_used: str
    results: list[dict[str, Any]]  # vazio no MVP atual; preenchido quando Chat 07 integrar SQLite
    duration_ms: int


# -------------------- Endpoints --------------------

@app.get("/health")
def health():
    """Healthcheck simples para verificar se a API está no ar."""
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    """
    Recebe pergunta em linguagem natural e retorna SQL gerado + explicação.

    Pipeline:
    1. Valida input
    2. Chama motor de IA (RAG → LLM → SQL)
    3. Retorna resultado estruturado
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Pergunta não pode ser vazia.")

    start = time.time()

    try:
        # Chama o motor — passa modelo customizado apenas se foi especificado
        kwargs = {"model": req.model} if req.model else {}
        result = await generate_sql(req.question, **kwargs)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="O modelo retornou uma resposta malformada (JSON inválido). Tente novamente."
        )
    except Exception as e:
        # Captura genérica para falhas de rede, API key, timeout, etc.
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar SQL: {type(e).__name__}: {str(e)}"
        )

    duration_ms = int((time.time() - start) * 1000)

    return QueryResponse(
        question=result["question"],
        sql=result["sql"],
        explanation=result["explanation"],
        tables_used=result.get("tables_used", []),
        retrieved_tables=result.get("retrieved_tables", []),
        confidence=result.get("confidence", "medium"),
        assumptions=result.get("assumptions", []),
        intent=result.get("intent"),
        category=result.get("category"),
        period=result.get("period"),
        model_used=result["model_used"],
        results=[],  # placeholder até Chat 07 (execução no SQLite)
        duration_ms=duration_ms,
    )