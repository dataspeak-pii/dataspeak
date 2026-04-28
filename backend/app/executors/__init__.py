"""
Executores de SQL.

A interface QueryExecutor é abstrata; SqliteExecutor é a implementação
concreta do MVP. Adicionar HanaExecutor, OracleExecutor, etc. é plug-in.
"""

from .base import (
    ExecutionResult,
    QueryExecutor,
    SqlExecutionError,
    SqlForbiddenError,
    SqlSyntaxError,
    SqlTimeoutError,
)

__all__ = [
    "ExecutionResult",
    "QueryExecutor",
    "SqlExecutionError",
    "SqlForbiddenError",
    "SqlSyntaxError",
    "SqlTimeoutError",
]