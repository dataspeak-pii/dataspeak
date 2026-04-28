"""
Interface abstrata para executores de SQL.

Decisão arquitetural D1 — abre caminho para múltiplos backends de banco
(SQLite, HANA, Oracle, etc.) sem reescrever o endpoint /query.
"""

from typing import Any, Protocol
from dataclasses import dataclass, field


# -------------------- Resultado --------------------

@dataclass
class ExecutionResult:
    """Resultado de uma execução de SQL bem-sucedida."""
    results: list[dict[str, Any]] = field(default_factory=list)
    columns: list[str] = field(default_factory=list)
    total_rows: int = 0
    truncated: bool = False


# -------------------- Exceções tipadas --------------------

class SqlExecutionError(Exception):
    """Base para falhas de execução de SQL. Subclasses carregam um `code`."""
    code: str = "internal"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class SqlForbiddenError(SqlExecutionError):
    """SQL viola a allowlist (não começa com SELECT/WITH)."""
    code = "forbidden_sql"


class SqlSyntaxError(SqlExecutionError):
    """SQL malformado ou referencia tabelas/colunas inexistentes."""
    code = "invalid_sql"


class SqlTimeoutError(SqlExecutionError):
    """Query excedeu o timeout configurado."""
    code = "timeout"


# -------------------- Interface --------------------

class QueryExecutor(Protocol):
    """
    Interface de um executor de SQL.

    Implementações devem garantir:
    - Operação read-only (impossível modificar dados).
    - Validação de allowlist antes da execução.
    - Timeout enforçado.
    - Truncamento honesto com `total_rows` e `truncated` corretos.
    - Lançar SqlExecutionError (ou subclasse) em caso de falha.
    """

    def execute(
        self,
        sql: str,
        ctx: "Any",  # RequestContext, evitando import circular
        max_rows_returned: int,
        max_rows_scanned: int,
        timeout_seconds: float,
    ) -> ExecutionResult: ...