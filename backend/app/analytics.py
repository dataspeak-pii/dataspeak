"""
Bloco E — pós-processamento analítico sobre os results do executor.
Sem LLM, sem banco. Python puro sobre lista de dicts.
"""

from __future__ import annotations
from typing import Any


# Palavras que sugerem coluna temporal → gráfico de linha
_TIME_KEYWORDS = {"dat", "per", "mes", "ano", "year", "month", "data", "periodo", "date"}


# ─── Humanização de nomes de coluna ──────────────────────────────────────────

_WORD_MAP: dict[str, str] = {
    # Quantidades
    "qtd": "Quantidade", "qnt": "Quantidade", "qty": "Quantidade",
    # Números / códigos
    "nr": "Nº", "num": "Nº", "nro": "Nº", "cod": "Código", "id": "ID",
    "ref": "Referência",
    # Descrições
    "desc": "Descrição", "descricao": "Descrição", "obs": "Observação",
    # Financeiro
    "val": "Valor", "valor": "Valor",
    "prc": "Preço", "preco": "Preço",
    "rec": "Receita", "receita": "Receita",
    "cst": "Custo", "custo": "Custo",
    "fat": "Faturamento", "marg": "Margem",
    # Tempo
    "dt": "Data", "data": "Data", "dat": "Data",
    "mes": "Mês", "ano": "Ano", "per": "Período", "periodo": "Período",
    # SAP / Materiais
    "mat": "Material", "material": "Material", "materiais": "Materiais",
    "grp": "Grupo", "grupo": "Grupo", "lote": "Lote",
    # Unidades
    "un": "Unid.", "unid": "Unid.", "unidade": "Unidade",
    # Estoque
    "est": "Estoque", "estoque": "Estoque",
    "livre": "Livre", "blq": "Bloqueado", "bloqueado": "Bloqueado",
    "reservado": "Reservado",
    # Organização
    "plnt": "Planta", "planta": "Planta",
    "dep": "Depósito", "deposito": "Depósito",
    "centro": "Centro", "dist": "Distribuição",
    "linha": "Linha", "turno": "Turno", "setor": "Setor",
    # Partes
    "forn": "Fornecedor", "fornecedor": "Fornecedor",
    "cli": "Cliente", "cliente": "Cliente",
    # Documentos
    "ped": "Pedido", "pedido": "Pedido", "nf": "NF", "nota": "Nota",
    "ordem": "Ordem",
    # Tipos
    "tp": "Tipo", "tipo": "Tipo",
    "cat": "Categoria", "categoria": "Categoria",
    "status": "Status",
    # Operações
    "prod": "Produção", "producao": "Produção",
    "vnd": "Venda", "venda": "Venda", "vendas": "Vendas",
    # Qualificadores
    "total": "Total", "tot": "Total",
    "medio": "Médio", "media": "Média",
    "unitario": "Unitário", "unitaria": "Unitária",
    "planejado": "Planejado", "realizado": "Realizado",
    "bruto": "Bruto", "liquido": "Líquido",
    # Qualidade / eficiência
    "efic": "Eficiência", "eficiencia": "Eficiência",
    "qual": "Qualidade", "qualidade": "Qualidade",
}

# Tokens que funcionam como adjetivos → sem "de" antes deles
_ADJ_TOKENS = {
    "total", "livre", "bloqueado", "reservado", "unitário", "médio",
    "planejado", "realizado", "ativo", "inativo", "bruto", "líquido",
    "produzido", "vendido", "consumido", "entregue", "faturado",
    "fiscal", "comercial", "financeiro", "nacional", "regional",
}


def _humanize_col(col: str) -> str:
    """Converte nome de coluna snake_case para português legível.

    Exemplos:
        valor_total_vendas → Valor Total de Vendas
        estoque_livre      → Estoque Livre
        qtd_materiais      → Quantidade de Materiais
        tipo_material      → Tipo de Material
    """
    tokens = [
        _WORD_MAP.get(p, p.capitalize())
        for p in col.lower().split("_")
        if p
    ]
    result = tokens[0]
    for token in tokens[1:]:
        if token.lower().rstrip(".") in _ADJ_TOKENS:
            result += f" {token}"
        else:
            result += f" de {token}"
    return result


def _kpi_label(agg_type: str, col: str) -> str:
    """Gera label semântico para um KPI.

    Regras:
    - sum:   se a coluna já implica um total/valor → só o nome humanizado.
             caso contrário → nome + " Total".
    - avg:   "Média de {nome humanizado}"
    - count: "{nome humanizado} Distintos"
    """
    col_lower = col.lower()
    col_human = _humanize_col(col)

    if agg_type == "sum":
        # Colunas que já descrevem um montante não precisam do prefixo "Total"
        if any(kw in col_lower for kw in ("total", "valor", "receita", "faturamento", "custo", "margem")):
            return col_human
        return f"{col_human} Total"

    if agg_type == "avg":
        return f"Média de {col_human}"

    if agg_type == "count":
        return f"{col_human} Distintos"

    return col_human


# ─── Helpers de tipagem ───────────────────────────────────────────────────────

def _is_numeric(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _col_is_numeric(rows: list[dict], col: str) -> bool:
    values = [r[col] for r in rows if r.get(col) is not None]
    return bool(values) and all(_is_numeric(v) for v in values)


def _col_is_temporal(col: str) -> bool:
    col_lower = col.lower()
    return any(kw in col_lower for kw in _TIME_KEYWORDS)


# ─── Função principal ─────────────────────────────────────────────────────────

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
        kpis.append({"label": _kpi_label("sum", col), "value": round(total, 2), "type": "sum"})
        if len(values) > 1:
            kpis.append({"label": _kpi_label("avg", col), "value": round(avg, 2), "type": "avg"})

    for col in text_cols:
        distinct = len({r[col] for r in results if r.get(col) is not None})
        if distinct < len(results):
            kpis.append({"label": _kpi_label("count", col), "value": distinct, "type": "count"})

    # --- chart_type ---
    has_temporal = any(_col_is_temporal(c) for c in columns)
    chart_type = "line" if has_temporal else ("bar" if numeric_cols else None)

    # --- chart_data ---
    chart_data: dict = {}
    if numeric_cols and chart_type:
        label_col = text_cols[0] if text_cols else columns[0]
        labels = [str(r.get(label_col, "")) for r in results]
        series = [
            {"name": _humanize_col(col), "data": [r.get(col) for r in results]}
            for col in numeric_cols
        ]
        chart_data = {"labels": labels, "series": series}

    return {"kpis": kpis, "chart_type": chart_type, "chart_data": chart_data}
