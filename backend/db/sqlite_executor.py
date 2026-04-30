"""
SqliteExecutor — implementação de QueryExecutor para o banco simulado SQLite.

Características:
- Conexão read-only enforced via URI (`mode=ro`).
- Allowlist: SQL deve começar com SELECT ou WITH (após whitespace e comentários).
- Timeout via set_progress_handler (não via `timeout` do connect).
- Truncamento em max_rows_returned com max_rows_scanned como teto de leitura.
- Exceções tipadas (SqlForbiddenError, SqlSyntaxError, SqlTimeoutError).
"""

from __future__ import annotations

import logging
import re
import sqlite3
import time
from pathlib import Path
from typing import Any

from app.context import RequestContext
from app.executors.base import (
    ExecutionResult,
    QueryExecutor,
    SqlExecutionError,
    SqlForbiddenError,
    SqlSyntaxError,
    SqlTimeoutError,
)

logger = logging.getLogger(__name__)

# Regex que pula whitespace e comentários SQL no início, depois exige SELECT ou WITH
_ALLOWED_START_RE = re.compile(
    r"""
    ^                          # início
    (?:
        \s+                    #   whitespace
      | --[^\n]*\n             #   comentário de linha
      | /\*.*?\*/              #   comentário de bloco
    )*
    (?:SELECT|WITH)\b          # primeira palavra significativa
    """,
    re.IGNORECASE | re.VERBOSE | re.DOTALL,
)


class SqliteExecutor:
    """Executor SQLite read-only para o banco simulado DataSpeak."""

    VALID_TABLES = {
    "MARA", "MSEG", "VBRK", "VBRP", "MARC", "MARD", "MKPF",
    "EKKO", "EKPO", "VBAK", "VBAP", "KNA1", "LFA1", "AFKO", "AFPO",
    }

    def __init__(self, database_path: str):
        self.database_path = database_path

    # --------------------- API pública ---------------------

    def execute(
        self,
        sql: str,
        ctx: RequestContext,
        max_rows_returned: int,
        max_rows_scanned: int,
        timeout_seconds: float,
    ) -> ExecutionResult:
        """Valida, executa, trunca e retorna resultado."""

        self._validate_allowlist(sql)
        self._validate_tables(sql)
        self._validate_not_error_response(sql)
        
        conn = self._open_readonly()
        try:
            return self._run_with_timeout(
                conn=conn,
                sql=sql,
                max_rows_returned=max_rows_returned,
                max_rows_scanned=max_rows_scanned,
                timeout_seconds=timeout_seconds,
            )
        finally:
            conn.close()

    # --------------------- internos ---------------------

    def _validate_allowlist(self, sql: str) -> None:
        """SQL deve começar com SELECT ou WITH (camada 3 de defesa)."""
        if not _ALLOWED_START_RE.match(sql):
            raise SqlForbiddenError(
                "SQL precisa começar com SELECT ou WITH. "
                "Operações de modificação não são permitidas."
            )
            
    def _validate_tables(self, sql: str) -> None:
        sql_sem_comentarios = re.sub(r'--[^\n]*', '', sql)
        found = {t.upper() for t in re.findall(r'\b(?:FROM|JOIN)\s+(\w+)', sql_sem_comentarios, re.IGNORECASE)}
        invalid = found - self.VALID_TABLES
        if invalid:
            raise SqlSyntaxError(f"Tabelas fora do catálogo: {', '.join(sorted(invalid))}")

    def _validate_not_error_response(self, sql: str) -> None:
        no_from = not re.search(r'\bFROM\b', sql, re.IGNORECASE)
        literal_select = bool(re.match(r"\s*SELECT\s+['\"]", sql, re.IGNORECASE))
        if no_from and literal_select:
            raise SqlForbiddenError("Modelo retornou mensagem de erro em vez de SQL. Reformule a pergunta.")

    def _open_readonly(self) -> sqlite3.Connection:
        """Abre conexão read-only enforced pelo driver (camada 1 de defesa)."""
        # Garante caminho absoluto compatível com URI no Windows e Linux
        abs_path = Path(self.database_path).resolve().as_posix()
        uri = f"file:{abs_path}?mode=ro"
        try:
            conn = sqlite3.connect(uri, uri=True, timeout=2.0)
            # Resultado como dict-friendly tuple
            conn.row_factory = None
            return conn
        except sqlite3.OperationalError as e:
            raise SqlExecutionError(
                f"Não foi possível abrir o banco em read-only: {e}"
            ) from e

    def _run_with_timeout(
        self,
        conn: sqlite3.Connection,
        sql: str,
        max_rows_returned: int,
        max_rows_scanned: int,
        timeout_seconds: float,
    ) -> ExecutionResult:
        """
        Executa o SQL instalando um progress_handler que aborta após timeout.
        SQLite chama o handler a cada N operações virtuais; se ele retornar
        não-zero, a execução é interrompida e raise OperationalError.
        """
        start = time.monotonic()
        timed_out = {"flag": False}

        def progress_handler() -> int:
            if time.monotonic() - start > timeout_seconds:
                timed_out["flag"] = True
                return 1  # sinaliza ao SQLite para abortar
            return 0

        # Chama o handler a cada ~1000 operações
        conn.set_progress_handler(progress_handler, 1000)

        try:
            cursor = conn.execute(sql)
        except sqlite3.OperationalError as e:
            if timed_out["flag"]:
                raise SqlTimeoutError(
                    f"Query excedeu o timeout de {timeout_seconds}s."
                ) from e
            raise SqlSyntaxError(f"SQL inválido: {e}") from e
        except sqlite3.DatabaseError as e:
            raise SqlSyntaxError(f"Erro no banco: {e}") from e

        # Lê até max_rows_scanned para saber o total verdadeiro
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        scanned_rows: list[tuple] = []
        for i, row in enumerate(cursor):
            if timed_out["flag"]:
                raise SqlTimeoutError(
                    f"Query excedeu o timeout de {timeout_seconds}s durante leitura."
                )
            if i >= max_rows_scanned:
                # Para de ler — total_rows fica como max_rows_scanned (teto)
                break
            scanned_rows.append(row)

        total_rows = len(scanned_rows)
        truncated = total_rows > max_rows_returned
        kept = scanned_rows[:max_rows_returned]
        results = [dict(zip(columns, row)) for row in kept]

        return ExecutionResult(
            results=results,
            columns=columns,
            total_rows=total_rows,
            truncated=truncated,
        )