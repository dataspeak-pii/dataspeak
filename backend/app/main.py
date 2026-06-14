"""
DataSpeak API - ponto de entrada do backend FastAPI.

Recebe perguntas em linguagem natural via /query, orquestra o motor de IA
(RAG + LLM via OpenRouter) e executa o SQL gerado contra o banco simulado.
"""

from dotenv import load_dotenv
load_dotenv()  # carrega backend/.env antes de qualquer import que dependa

import json
import logging
import time
from hashlib import sha256
from typing import Any, Optional, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.ai_engine.generator import generate_sql
from app.context import RequestContext, new_context
from app.executors import (
    ExecutionResult,
    SqlExecutionError,
    SqlForbiddenError,
    SqlSyntaxError,
    SqlTimeoutError,
)
from app.analytics import compute_analytics
from app.settings import settings
from db.sqlite_executor import SqliteExecutor

# -------------------- Logging --------------------

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

# -------------------- App --------------------

app = FastAPI(title="DataSpeak API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instância única do executor (stateless, seguro reutilizar)
executor = SqliteExecutor(database_path=settings.database_path)


# -------------------- Schemas --------------------

class Refusal(BaseModel):
    reason: Literal["out_of_catalog", "write_operation", "ambiguous", "nonsense"]
    message: str
    
    
class QueryRequest(BaseModel):
    """Payload de entrada do endpoint /query."""
    question: str = Field(..., min_length=1, description="Pergunta em linguagem natural")
    model: str | None = Field(default=None, description="Modelo OpenRouter (opcional)")


class QueryResponse(BaseModel):
    """Payload de resposta do endpoint /query."""
    # Identificação
    query_id: str

    # Bloco A — geração de SQL
    question: str
    sql: Optional[str] = None
    explanation: Optional[str] = None
    tables_used: list[str] = []
    retrieved_tables: list[str] = []
    confidence: str = "low"
    assumptions: list[str] = []

    # Bloco B — interpretação enriquecida (Optional para Graceful Degradation)
    intent: Optional[str] = None
    category: Optional[str] = None
    period: Optional[str] = None
    refusal: Optional[Refusal] = None

    # Metadados
    model_used: str

    # Bloco D — execução do SQL
    results: list[dict[str, Any]] = []
    columns: list[str] = []
    total_rows: int = 0
    truncated: bool = False
    execution_error: Optional[str] = None
    
    powerbi_script: Optional[str] = None

    kpis: list[dict] = []
    chart_type: Optional[str] = None
    chart_data: dict = {}

    # Tempo total
    duration_ms: int


# -------------------- Endpoints --------------------

@app.get("/health")
def health():
    """Healthcheck simples para verificar se a API está no ar."""
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    """
    Pipeline:
    1. Cria RequestContext (request_id único).
    2. Chama generator (RAG → LLM → SQL) — Bloco A + B.
    3. Executa o SQL no banco simulado — Bloco D.
       Falhas de execução NÃO invalidam a resposta (Graceful Degradation).
    4. Retorna QueryResponse com tudo populado.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Pergunta não pode ser vazia.")

    ctx = new_context()
    start = time.monotonic()

    # --- Etapa 1: gerar SQL via LLM ---
    try:
        kwargs = {"model": req.model} if req.model else {}
        result = await generate_sql(req.question, **kwargs)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="O modelo retornou uma resposta malformada (JSON inválido). Tente novamente.",
        )
    except Exception as e:
        logger.exception("query.generator_failed", extra={"request_id": ctx.request_id})
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar SQL: {type(e).__name__}: {e}",
        )
        
    # Etapa 1.5: motor pode recusar antes da execução
    if result.get("refusal"):
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "query.refused",
            extra={
                "request_id": ctx.request_id,
                "refusal_reason": result["refusal"]["reason"],
            },
        )
        return QueryResponse(
            query_id=ctx.request_id,
            question=result["question"],
            sql=result.get("sql", ""),
            explanation=result.get("explanation", ""),
            tables_used=result.get("tables_used", []),
            retrieved_tables=result.get("retrieved_tables", []),
            confidence=result.get("confidence", "low"),
            assumptions=result.get("assumptions", []),
            intent=result.get("intent"),
            category=result.get("category"),
            period=result.get("period"),
            refusal=Refusal(**result["refusal"]),
            model_used=result["model_used"],
            duration_ms=duration_ms,
        )

    # --- Etapa 2: executar SQL no banco simulado ---
    execution = ExecutionResult()
    execution_error: Optional[str] = None

    try:
        execution = executor.execute(
            sql=result["sql"],
            ctx=ctx,
            max_rows_returned=settings.max_rows_returned,
            max_rows_scanned=settings.max_rows_scanned,
            timeout_seconds=settings.query_timeout_seconds,
        )
    except SqlExecutionError as e:
        execution_error = e.code
        logger.warning(
            "query.execution_failed",
            extra={
                "request_id": ctx.request_id,
                "error_code": e.code,
                "error_message": e.message,
            },
        )

    duration_ms = int((time.monotonic() - start) * 1000)

    logger.info(
        "query.completed",
        extra={
            "request_id": ctx.request_id,
            "user_id": ctx.user_id,
            "tenant_id": ctx.tenant_id,
            "sql_hash": sha256(result["sql"].encode("utf-8")).hexdigest()[:12],
            "duration_ms": duration_ms,
            "rows_returned": len(execution.results),
            "total_rows": execution.total_rows,
            "truncated": execution.truncated,
            "execution_error": execution_error,
            "model_used": result.get("model_used"),
        },
    )

    return QueryResponse(
        query_id=ctx.request_id,
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
        results=execution.results,
        columns=execution.columns,
        total_rows=execution.total_rows,
        truncated=execution.truncated,
        execution_error=execution_error,
        **compute_analytics(execution.results, execution.columns),
        duration_ms=duration_ms,
    )