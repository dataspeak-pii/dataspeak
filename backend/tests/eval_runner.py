"""
eval_runner.py — Motor de avaliação automática do DataSpeak.

Para cada caso do gold standard, chama POST /query, executa o SQL retornado
no SQLite simulado, compara o resultado com o hash esperado e registra tudo em CSV.

Uso:
    # Roda um modelo específico (5 execuções por caso)
    python backend/tests/eval_runner.py --model anthropic/claude-sonnet-4-5

    # Roda com número customizado de execuções
    python backend/tests/eval_runner.py --model openai/gpt-4o --runs 3

    # Roda apenas casos de uma categoria
    python backend/tests/eval_runner.py --model google/gemini-2.0-flash-001 --categoria simples

    # Roda apenas um caso específico (debug)
    python backend/tests/eval_runner.py --model anthropic/claude-sonnet-4-5 --caso Q001

Pré-requisitos:
    - Backend rodando em localhost:8000 (uvicorn)
    - eval_dataset.json presente em backend/tests/
    - banco dataspeak.db presente em backend/data/
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
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
    """
    Centraliza todas as configurações do runner.
    Alterar aqui reflete em todo o script — sem magic strings espalhadas.
    """
    model: str
    runs: int = 5
    categoria: str | None = None
    caso_id: str | None = None

    # Infraestrutura
    api_url: str = "http://localhost:8000/query"
    db_path: Path = Path("backend/data/dataspeak.db")
    dataset_path: Path = Path("backend/tests/eval_dataset.json")
    results_dir: Path = Path("backend/tests/results")

    # Limites
    timeout_seconds: float = 60.0   # LLMs lentos podem demorar >30s
    max_rows_execute: int = 5000     # Evita travar em queries sem LIMIT


# ──────────────────────────────────────────────────────────────────────────────
# Cliente HTTP — chama o POST /query do backend
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class QueryResult:
    """Resultado bruto de uma chamada ao /query."""
    sql: str | None = None
    explanation: str | None = None
    latencia_ms: float = 0.0
    status_http: int = 0
    erro: str | None = None


class QueryClient:
    """
    Responsabilidade única: fazer chamadas HTTP ao endpoint /query.
    Isola detalhes de rede do resto do runner.
    """

    def __init__(self, config: EvalConfig):
        self.config = config

    def call(self, pergunta: str) -> QueryResult:
        """Chama POST /query e retorna QueryResult. Nunca lança exceção."""
        payload = {
            "question": pergunta,
            "model": self.config.model,
        }
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
            latencia_ms = (time.perf_counter() - start) * 1000
            return QueryResult(
                latencia_ms=latencia_ms,
                erro=f"Timeout após {self.config.timeout_seconds}s",
            )
        except Exception as exc:
            latencia_ms = (time.perf_counter() - start) * 1000
            return QueryResult(
                latencia_ms=latencia_ms,
                erro=f"{type(exc).__name__}: {exc}",
            )


# ──────────────────────────────────────────────────────────────────────────────
# Executor SQLite — executa o SQL gerado pelo LLM no banco simulado
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class ExecutionResult:
    """Resultado da execução do SQL no SQLite."""
    columns: list[str] = field(default_factory=list)
    rows: list[tuple] = field(default_factory=list)
    row_count: int = 0
    hash: str | None = None
    erro: str | None = None


def execute_sql(db_path: Path, sql: str, max_rows: int) -> ExecutionResult:
    """
    Executa SQL no SQLite simulado.
    Limitado a max_rows para evitar travar em queries sem LIMIT.
    Nunca lança exceção — erros ficam em ExecutionResult.erro.
    """
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute(sql)
        columns = [d[0] for d in cursor.description] if cursor.description else []
        rows = cursor.fetchmany(max_rows)
        conn.close()

        # Hash só sobre os dados — ignora nomes de colunas e aliases
        payload = {"rows": sorted([list(r) for r in rows], key=lambda x: str(x))}
        serialized = json.dumps(payload, sort_keys=True, default=str, ensure_ascii=False)
        result_hash = hashlib.sha256(serialized.encode()).hexdigest()

        return ExecutionResult(columns=columns, rows=rows, row_count=len(rows), hash=result_hash)
    except sqlite3.Error as exc:
        return ExecutionResult(erro=f"{type(exc).__name__}: {exc}")
    except Exception as exc:
        return ExecutionResult(erro=f"{type(exc).__name__}: {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# Avaliador — compara resultado com gold standard
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class EvalRecord:
    """
    Um registro de avaliação — uma linha do CSV final.
    Cada campo documenta um aspecto da execução para análise posterior.
    """
    id: str
    pergunta: str
    categoria: str
    subcategoria: str
    modelo: str
    execucao: int
    status: str          # pass | fail | error_api | error_sql | error_timeout
    sql_gerado: str
    latencia_ms: float
    hash_obtido: str
    hash_esperado: str
    rows_obtidos: int
    rows_esperados: int
    tabelas_esperadas: str   # JSON serializado para CSV
    erro_detalhe: str


class ResultEvaluator:
    """
    Responsabilidade única: determinar se uma execução passou ou falhou.
    Dois caminhos: casos normais (hash) e adversariais (ausência de resultado).
    """

    def evaluate(
        self,
        caso: dict[str, Any],
        query_result: QueryResult,
        exec_result: ExecutionResult,
    ) -> str:
        """
        Retorna o status da avaliação:
        - pass: resultado correto
        - fail: resultado incorreto
        - error_api: backend retornou erro HTTP
        - error_sql: SQL gerado não executou
        - error_timeout: chamada excedeu timeout
        """
        # Erro de API ou timeout
        if query_result.erro:
            if "Timeout" in query_result.erro:
                return "error_timeout"
            return "error_api"

        # Sem SQL retornado
        if not query_result.sql:
            return "error_api"

        # Casos adversariais: pass se o SQL NÃO executou corretamente
        if caso["categoria"] == "adversarial":
            if exec_result.erro:
                return "pass"   # Sistema bloqueou corretamente
            if exec_result.row_count == 1 and exec_result.columns == ["mensagem"]:
                return "pass"   # LLM auto-censurou com mensagem de erro
            return "fail"       # Sistema executou algo quando não devia

        # Erro na execução do SQL (casos normais)
        if exec_result.erro:
            return "error_sql"

        # Comparação de hash (casos normais)
        if exec_result.hash == caso.get("resultado_esperado_hash"):
            return "pass"
        return "fail"


# ──────────────────────────────────────────────────────────────────────────────
# Runner principal — orquestra tudo
# ──────────────────────────────────────────────────────────────────────────────
class EvalRunner:
    """
    Orquestra o fluxo completo:
    casos → chamadas API → execução SQL → avaliação → CSV
    """

    def __init__(self, config: EvalConfig):
        self.config = config
        self.client = QueryClient(config)
        self.evaluator = ResultEvaluator()

    def load_casos(self) -> list[dict]:
        """Carrega e filtra casos do gold standard."""
        with self.config.dataset_path.open(encoding="utf-8") as f:
            dataset = json.load(f)

        casos = dataset["casos"]

        # Filtra casos com build_status != ok (erros do build_gold_standard)
        casos = [c for c in casos if c.get("build_status") == "ok"]

        # Filtros opcionais via CLI
        if self.config.categoria:
            casos = [c for c in casos if c["categoria"] == self.config.categoria]
        if self.config.caso_id:
            casos = [c for c in casos if c["id"] == self.config.caso_id]

        return casos

    def run_single(self, caso: dict, execucao: int) -> EvalRecord:
        """Executa uma única avaliação de um caso."""
        # 1. Chama o backend
        query_result = self.client.call(caso["pergunta"])

        # 2. Executa o SQL retornado (se houver)
        exec_result = ExecutionResult()
        if query_result.sql and not query_result.erro:
            exec_result = execute_sql(
                self.config.db_path,
                query_result.sql,
                self.config.max_rows_execute,
            )

        # 3. Avalia
        status = self.evaluator.evaluate(caso, query_result, exec_result)

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
            erro_detalhe=query_result.erro or exec_result.erro or "",
        )

    def run(self) -> Path:
        """Executa a bateria completa e salva CSV. Retorna o caminho do arquivo."""
        casos = self.load_casos()
        if not casos:
            print("❌ Nenhum caso encontrado com os filtros aplicados.")
            raise SystemExit(1)

        # Prepara diretório de resultados
        self.config.results_dir.mkdir(parents=True, exist_ok=True)

        # Nome do arquivo de saída: modelo + timestamp
        model_slug = self.config.model.replace("/", "_").replace("-", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = self.config.results_dir / f"{model_slug}_{timestamp}.csv"

        total = len(casos) * self.config.runs
        concluidos = 0
        pass_count = 0
        fail_count = 0
        error_count = 0

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
                case_statuses = []
                for run_num in range(1, self.config.runs + 1):
                    record = self.run_single(caso, run_num)
                    writer.writerow(asdict(record))
                    csvfile.flush()   # Grava linha a linha — não perde dados se interromper

                    case_statuses.append(record.status)
                    concluidos += 1

                    if record.status == "pass":
                        pass_count += 1
                    elif record.status == "fail":
                        fail_count += 1
                    else:
                        error_count += 1

                # Resumo por caso após as N execuções
                pass_rate = case_statuses.count("pass") / len(case_statuses) * 100
                icon = "✅" if pass_rate == 100 else "⚠️ " if pass_rate >= 60 else "❌"
                print(
                    f"  {icon} {caso['id']} [{caso['categoria']}]: "
                    f"{pass_rate:.0f}% pass "
                    f"({case_statuses.count('pass')}/{self.config.runs})"
                )

        # Resumo final
        overall_rate = pass_count / total * 100 if total > 0 else 0
        print(f"\n{'='*50}")
        print(f"📊 Resultado final — {self.config.model}")
        print(f"   Total:  {total} execuções")
        print(f"   ✅ Pass:  {pass_count} ({overall_rate:.1f}%)")
        print(f"   ❌ Fail:  {fail_count}")
        print(f"   ⚠️  Error: {error_count}")
        print(f"   💾 CSV:   {output_path}")

        return output_path


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="Avaliação automática do DataSpeak.")
    parser.add_argument(
        "--model",
        required=True,
        help="Modelo via OpenRouter (ex: anthropic/claude-sonnet-4-5)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=5,
        help="Execuções por caso (default: 5)",
    )
    parser.add_argument(
        "--categoria",
        choices=["simples", "media", "complexa", "robustez", "adversarial"],
        help="Filtrar por categoria (opcional)",
    )
    parser.add_argument(
        "--caso",
        help="Rodar apenas um caso específico, ex: Q001 (debug)",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=Path("backend/data/dataspeak.db"),
        help="Caminho do banco SQLite",
    )
    args = parser.parse_args()

    config = EvalConfig(
        model=args.model,
        runs=args.runs,
        categoria=args.categoria,
        caso_id=args.caso,
        db_path=args.db,
    )

    runner = EvalRunner(config)
    runner.run()


if __name__ == "__main__":
    main()