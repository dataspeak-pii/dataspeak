"""
Bloco E — pós-processamento analítico sobre os results do executor.
Sem LLM, sem banco. Python puro sobre lista de dicts.
"""

from __future__ import annotations
from typing import Any


# Palavras que sugerem coluna temporal → gráfico de linha
_TIME_KEYWORDS = {"dat", "per", "mes", "ano", "year", "month", "data", "periodo", "date"}


def _is_numeric(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _col_is_numeric(rows: list[dict], col: str) -> bool:
    values = [r[col] for r in rows if r.get(col) is not None]
    return bool(values) and all(_is_numeric(v) for v in values)


def _col_is_temporal(col: str) -> bool:
    col_lower = col.lower()
    return any(kw in col_lower for kw in _TIME_KEYWORDS)


def compute_analytics(
    results: list[dict[str, Any]],
    columns: list[str],
) -> dict:
    """
    Recebe results e columns do executor.
    Retorna dict com kpis, chart_type, chart_data.
    """
    if not results or not columns:
        return {"kpis": [], "chart_type": None, "chart_data": {}}

    numeric_cols = [c for c in columns if _col_is_numeric(results, c)]
    text_cols = [c for c in columns if c not in numeric_cols]

    # --- KPIs ---
    kpis = []

    for col in numeric_cols:
        values = [r[col] for r in results if r.get(col) is not None]
        total = sum(values)
        avg = total / len(values)
        kpis.append({"label": f"Total {col}", "value": round(total, 2), "type": "sum"})
        if len(values) > 1:
            kpis.append({"label": f"Média {col}", "value": round(avg, 2), "type": "avg"})

    for col in text_cols:
        distinct = len({r[col] for r in results if r.get(col) is not None})
        if distinct < len(results):  # só vale se há repetição (agregação faz sentido)
            kpis.append({"label": f"Distintos {col}", "value": distinct, "type": "count"})

    # --- chart_type ---
    has_temporal = any(_col_is_temporal(c) for c in columns)
    chart_type = "line" if has_temporal else ("bar" if numeric_cols else None)

    # --- chart_data ---
    chart_data: dict = {}
    if numeric_cols and chart_type:
        label_col = text_cols[0] if text_cols else columns[0]
        labels = [str(r.get(label_col, "")) for r in results]
        series = [
            {"name": col, "data": [r.get(col) for r in results]}
            for col in numeric_cols
        ]
        chart_data = {"labels": labels, "series": series}

    return {"kpis": kpis, "chart_type": chart_type, "chart_data": chart_data}