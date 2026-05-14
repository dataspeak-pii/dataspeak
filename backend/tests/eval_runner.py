"""
eval_runner.py — Avaliação multinível do DataSpeak (v2).

Para cada caso do gold standard, classifica o resultado em 6 níveis:
  exact_match    → hash idêntico
  semantic_match → tabelas certas + chave-primária bate (aliases ignorados)
  partial_match  → tabelas certas, linhas divergem
  wrong_tables   → tabelas erradas
  error_sql      → SQL não executou
  error_api      → backend retornou erro
  error_timeout  → chamada excedeu timeout

Casos adversariais usam lógica especial: pass se sistema NÃO executou SQL.

Uso:
    python backend/tests/eval_runner.py --model anthropic/claude-sonnet-4-5
    python backend/tests/eval_runner.py --model openai/gpt-4o --runs 3
    python backend/tests/eval_runner.py --model google/gemini-2.0-flash-001 --categoria simples
    python backend/tests/eval_runner.py --model anthropic/claude-sonnet-4-5 --caso Q001 --runs 1
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sqlite3
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx


# ──────────────────────────────────────────────────────────────────────────────
# Configuração
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class EvalConfig:
    model: str
    runs: int = 5
    categoria: str | None = None
    caso_id: str | None = None
    api_url: str = "http://localhost:8000/query"
    db_path: Path = Path("backend/data/dataspeak.db")
    dataset_path: Path = Path("backend/tests/eval_dataset.json")
    results_dir: Path = Path("backend/tests/results")
    timeout_seconds: float = 60.0
    max_rows_execute: int = 5000


# Tabelas SAP do catálogo DataSpeak — usado para extrair tabelas do SQL gerado
TABELAS_CATALOGO = {
    "MARA", "MSEG", "VBRK", "VBRP", "MARC", "MARD", "MKPF",
    "EKKO", "EKPO", "VBAK", "VBAP", "KNA1", "LFA1", "AFKO", "AFPO", "MAKT",
}


def extrair_tabelas_do_sql(sql: str) -> set[str]:
    """
    Extrai tabelas SAP referenciadas no SQL.
    Usa regex sobre catálogo conhecido — não tenta parsear SQL completo.
    """
    sql_upper = sql.upper()
    pattern = r"\b(" + "|".join(TABELAS_CATALOGO) + r")\b"
    return set(re.findall(pattern, sql_upper))


# ──────────────────────────────────────────────────────────────────────────────
# Cliente HTTP
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class QueryResult:
    sql: str | None = None
    explanation: str | None = None
    latencia_ms: float = 0.0
    status_http: int = 0
    erro: str | None = None


class QueryClient:
    def __init__(self, config: EvalConfig):
        self.config = config

    def call(self, pergunta: str) -> QueryResult:
        payload = {"question": pergunta, "model": self.config.model}
        start = time.perf_counter()
        try:
            with httpx.Client(timeout=self.config.timeout_seconds) as client:
                response = client.post(self.config.api_url, json=payload)
            latencia_ms = (time.perf_counter() - start) * 1000

            if response.status_code != 200:
                return QueryResult(
                    status_http=response.status_code,
                    latencia_ms=latencia_ms,
                    erro=f"HTTP {response.status_code}: {response.text[:200]}",
                )

            data = response.json()
            return QueryResult(
                sql=data.get("sql"),
                explanation=data.get("explanation"),
                latencia_ms=latencia_ms,
                status_http=200,
            )

        except httpx.TimeoutException:
            return QueryResult(
                latencia_ms=(time.perf_counter() - start) * 1000,
                erro=f"Timeout após {self.config.timeout_seconds}s",
            )
        except Exception as exc:
            return QueryResult(
                latencia_ms=(time.perf_counter() - start) * 1000,
                erro=f"{type(exc).__name__}: {exc}",
            )


# ──────────────────────────────────────────────────────────────────────────────
# Executor SQLite
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class ExecutionResult:
    columns: list[str] = field(default_factory=list)
    rows: list[tuple] = field(default_factory=list)
    row_count: int = 0
    hash: str | None = None
    erro: str | None = None


def execute_sql(db_path: Path, sql: str, max_rows: int) -> ExecutionResult:
    """Executa SQL no SQLite (read-only). Erros ficam em ExecutionResult.erro."""
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute(sql)
        columns = [d[0] for d in cursor.description] if cursor.description else []
        rows = cursor.fetchmany(max_rows)
        conn.close()

        # Hash sobre dados ordenados (mesma lógica do build_gold_standard)
        payload = {"rows": sorted([list(r) for r in rows], key=lambda x: str(x))}
        serialized = json.dumps(payload, sort_keys=True, default=str, ensure_ascii=False)
        result_hash = hashlib.sha256(serialized.encode()).hexdigest()

        return ExecutionResult(
            columns=columns,
            rows=rows,
            row_count=len(rows),
            hash=result_hash,
        )
    except sqlite3.Error as exc:
        return ExecutionResult(erro=f"{type(exc).__name__}: {exc}")
    except Exception as exc:
        return ExecutionResult(erro=f"{type(exc).__name__}: {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# Avaliador multinível
# ──────────────────────────────────────────────────────────────────────────────
ALIASES_CONHECIDOS = {
    "CODIGO_MATERIAL": "MATNR", "NUMERO_MATERIAL": "MATNR",
    "TIPO_MATERIAL": "MTART", "GRUPO_MERCADORIAS": "MATKL",
    "UNIDADE_MEDIDA": "MEINS", "UNIDADE": "MEINS",
    "PLANTA": "WERKS", "DEPOSITO": "LGORT", "ALMOXARIFADO": "LGORT",
    "ESTOQUE_DISPONIVEL": "LABST", "ESTOQUE_LIVRE": "LABST",
    "DOCUMENTO": "MBLNR", "ANO": "MJAHR", "ITEM": "ZEILE",
    "TIPO_MOVIMENTO": "BWART", "QUANTIDADE": "MENGE",
    "NUMERO_NOTA_FISCAL": "VBELN", "NOTA_FISCAL": "VBELN",
    "NUMERO_PEDIDO": "EBELN", "ITEM_PEDIDO": "EBELP",
    "NUMERO_ORDEM": "AUFNR", "ORDEM_PRODUCAO": "AUFNR",
    "CODIGO_CLIENTE": "KUNNR", "CLIENTE": "KUNNR",
    "CODIGO_FORNECEDOR": "LIFNR", "FORNECEDOR": "LIFNR",
    "DATA_EMISSAO": "FKDAT", "DATA_PEDIDO": "BEDAT",
    "TIPO_MRP": "DISMM", "ESTOQUE_MINIMO": "MINBE",
    "ESTOQUE_SEGURANCA": "EISBE", "TIPO_ABASTECIMENTO": "BESKZ",
    "MES": "mes", "USUARIO": "USNAM",
    "ORGANIZACAO_VENDAS": "VKORG",
}


def localizar_indices_chave(
    columns_obtidas: list[str],
    chave_primaria: list[str],
    columns_esperadas: list[str],
) -> list[int] | None:
    """
    Forma C estendida com dicionário de aliases:
    1. Nome direto (case-insensitive)
    2. Alias português → SAP via ALIASES_CONHECIDOS
    3. Posição no gold standard
    """
    if not chave_primaria:
        return None

    indices = []
    col_obtidas_upper = [c.upper() for c in columns_obtidas]

    for chave in chave_primaria:
        chave_upper = chave.upper()

        # Tentativa 1: nome direto
        if chave_upper in col_obtidas_upper:
            indices.append(col_obtidas_upper.index(chave_upper))
            continue

        # Tentativa 2: alias reverso — alguma coluna obtida mapeia para esta chave?
        found = False
        for i, col in enumerate(col_obtidas_upper):
            if ALIASES_CONHECIDOS.get(col) == chave_upper or ALIASES_CONHECIDOS.get(col, "").upper() == chave_upper:
                indices.append(i)
                found = True
                break
        if found:
            continue

        # Tentativa 3: posição no gold standard
        cols_esp_upper = [c.upper() for c in columns_esperadas]
        if chave_upper in cols_esp_upper:
            pos = cols_esp_upper.index(chave_upper)
            if pos < len(columns_obtidas):
                indices.append(pos)
                continue

        return None

    return indices


def comparar_chaves_primarias(
    columns_obtidas: list[str],
    rows_obtidas: list[tuple],
    chave_primaria: list[str],
    chave_valores_esperados: list[list[str]],
    columns_esperadas: list[str],
) -> bool:
    """
    True se o conjunto de chaves-primárias do obtido == conjunto do esperado.
    Robusto a aliases (Forma C) e ordem das linhas.
    """
    indices = localizar_indices_chave(columns_obtidas, chave_primaria, columns_esperadas)
    if indices is None:
        return False

    chaves_obtidas = {tuple(str(row[i]) for i in indices) for row in rows_obtidas}
    chaves_esperadas = {tuple(v) for v in chave_valores_esperados}
    return chaves_obtidas == chaves_esperadas


class ResultEvaluator:
    """Classifica execuções em 7 níveis (incluindo erros)."""

    def evaluate(
        self,
        caso: dict[str, Any],
        query_result: QueryResult,
        exec_result: ExecutionResult,
    ) -> str:
        # Erros de infraestrutura primeiro
        if query_result.erro:
            if "Timeout" in query_result.erro:
                return "error_timeout"
            return "error_api"

        # ─── Casos adversariais: avaliados ANTES do check de SQL vazio ───
        # SQL vazio em adversarial = recusa correta do sistema
        if caso["categoria"] == "adversarial":
            if not query_result.sql:
                return "exact_match"  # Sistema recusou (resposta ideal)
            if exec_result.erro:
                return "exact_match"  # Bloqueado pelo SQLite — também correto
            if exec_result.row_count == 1 and exec_result.columns == ["mensagem"]:
                return "exact_match"  # LLM auto-censurou com mensagem
            return "fail"  # Executou SQL real quando não devia

        # ─── Casos não-adversariais ───
        if not query_result.sql:
            return "error_api"

        if exec_result.erro:
            return "error_sql"

        # Hash idêntico
        if exec_result.hash == caso.get("resultado_esperado_hash"):
            return "exact_match"

        # Verifica tabelas
        tabelas_obtidas = extrair_tabelas_do_sql(query_result.sql)
        tabelas_esperadas = set(caso.get("tabelas_esperadas", []))
        if not tabelas_esperadas.issubset(tabelas_obtidas):
            return "wrong_tables"

        # Semantic match
        chave_primaria = caso.get("chave_primaria_resultado", [])
        chave_valores_esperados = caso.get("chave_valores_esperados", [])
        if chave_primaria and chave_valores_esperados:
            if comparar_chaves_primarias(
                exec_result.columns,
                exec_result.rows,
                chave_primaria,
                chave_valores_esperados,
                caso.get("resultado_esperado_cols", []),
            ):
                return "semantic_match"

        return "partial_match"


# ──────────────────────────────────────────────────────────────────────────────
# Runner
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class EvalRecord:
    id: str
    pergunta: str
    categoria: str
    subcategoria: str
    modelo: str
    execucao: int
    status: str
    sql_gerado: str
    latencia_ms: float
    hash_obtido: str
    hash_esperado: str
    rows_obtidos: int
    rows_esperados: int
    tabelas_esperadas: str
    tabelas_obtidas: str
    erro_detalhe: str


# Status considerados sucesso para fins de "pass rate"
STATUS_SUCESSO = {"exact_match", "semantic_match"}


class EvalRunner:
    def __init__(self, config: EvalConfig):
        self.config = config
        self.client = QueryClient(config)
        self.evaluator = ResultEvaluator()

    def load_casos(self) -> list[dict]:
        with self.config.dataset_path.open(encoding="utf-8") as f:
            dataset = json.load(f)
        casos = [c for c in dataset["casos"] if c.get("build_status") == "ok"]
        if self.config.categoria:
            casos = [c for c in casos if c["categoria"] == self.config.categoria]
        if self.config.caso_id:
            casos = [c for c in casos if c["id"] == self.config.caso_id]
        return casos

    def run_single(self, caso: dict, execucao: int) -> EvalRecord:
        query_result = self.client.call(caso["pergunta"])

        exec_result = ExecutionResult()
        if query_result.sql and not query_result.erro:
            exec_result = execute_sql(
                self.config.db_path,
                query_result.sql,
                self.config.max_rows_execute,
            )

        status = self.evaluator.evaluate(caso, query_result, exec_result)

        tabelas_obtidas = (
            extrair_tabelas_do_sql(query_result.sql) if query_result.sql else set()
        )

        return EvalRecord(
            id=caso["id"],
            pergunta=caso["pergunta"],
            categoria=caso["categoria"],
            subcategoria=caso.get("subcategoria", ""),
            modelo=self.config.model,
            execucao=execucao,
            status=status,
            sql_gerado=query_result.sql or "",
            latencia_ms=round(query_result.latencia_ms, 1),
            hash_obtido=exec_result.hash or "",
            hash_esperado=caso.get("resultado_esperado_hash", ""),
            rows_obtidos=exec_result.row_count,
            rows_esperados=caso.get("resultado_esperado_rows", 0),
            tabelas_esperadas=json.dumps(caso.get("tabelas_esperadas", [])),
            tabelas_obtidas=json.dumps(sorted(tabelas_obtidas)),
            erro_detalhe=query_result.erro or exec_result.erro or "",
        )

    def run(self) -> Path:
        casos = self.load_casos()
        if not casos:
            print("❌ Nenhum caso encontrado.")
            raise SystemExit(1)

        self.config.results_dir.mkdir(parents=True, exist_ok=True)
        model_slug = self.config.model.replace("/", "_").replace("-", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = self.config.results_dir / f"{model_slug}_{timestamp}.csv"

        total = len(casos) * self.config.runs
        contadores: dict[str, int] = {}

        print(f"\n🚀 Iniciando avaliação")
        print(f"   Modelo:   {self.config.model}")
        print(f"   Casos:    {len(casos)}")
        print(f"   Execuções por caso: {self.config.runs}")
        print(f"   Total de chamadas:  {total}")
        print(f"   Output:   {output_path}\n")

        with output_path.open("w", newline="", encoding="utf-8") as csvfile:
            fieldnames = list(EvalRecord.__dataclass_fields__.keys())
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for caso in casos:
                statuses_caso = []
                for run_num in range(1, self.config.runs + 1):
                    record = self.run_single(caso, run_num)
                    writer.writerow(asdict(record))
                    csvfile.flush()
                    statuses_caso.append(record.status)
                    contadores[record.status] = contadores.get(record.status, 0) + 1

                # Resumo do caso: quantas execuções foram sucesso
                sucessos = sum(1 for s in statuses_caso if s in STATUS_SUCESSO)
                sucesso_rate = sucessos / len(statuses_caso) * 100
                icon = "✅" if sucesso_rate == 100 else "⚠️ " if sucesso_rate >= 60 else "❌"
                # Status mais frequente
                status_dominante = max(set(statuses_caso), key=statuses_caso.count)
                print(
                    f"  {icon} {caso['id']} [{caso['categoria']}]: "
                    f"{sucessos}/{self.config.runs} sucesso "
                    f"(predominante: {status_dominante})"
                )

        # Resumo final por nível
        sucesso_total = sum(contadores.get(s, 0) for s in STATUS_SUCESSO)
        sucesso_rate = sucesso_total / total * 100 if total > 0 else 0

        print(f"\n{'='*60}")
        print(f"📊 Resultado final — {self.config.model}")
        print(f"   Total: {total} execuções")
        print(f"   ✅ Taxa de sucesso (exact + semantic): {sucesso_rate:.1f}%\n")
        print(f"   Distribuição:")
        for status in [
            "exact_match", "semantic_match", "partial_match",
            "wrong_tables", "error_sql", "error_api", "error_timeout", "fail",
        ]:
            count = contadores.get(status, 0)
            if count > 0:
                pct = count / total * 100
                print(f"     {status:18} {count:4} ({pct:5.1f}%)")
        print(f"\n   💾 CSV: {output_path}")

        return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Avaliação multinível do DataSpeak.")
    parser.add_argument("--model", required=True, help="Modelo via OpenRouter")
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--categoria", choices=["simples", "media", "complexa", "robustez", "adversarial"])
    parser.add_argument("--caso", help="ID de um caso específico (debug)")
    parser.add_argument("--db", type=Path, default=Path("backend/data/dataspeak.db"))
    args = parser.parse_args()

    config = EvalConfig(
        model=args.model,
        runs=args.runs,
        categoria=args.categoria,
        caso_id=args.caso,
        db_path=args.db,
    )
    EvalRunner(config).run()


if __name__ == "__main__":
    main()