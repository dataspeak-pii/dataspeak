"""
build_gold_standard.py — Constrói o gold standard final do DataSpeak (v2).

Lê eval_dataset.template.json, executa cada sql_referencia no SQLite simulado,
extrai os valores das colunas-chave e grava eval_dataset.json.

Mudança v2: além do hash, extrai chave_valores_esperados a partir das
colunas indicadas em chave_primaria_resultado. Isso habilita semantic_match
no eval_runner.

Uso:
    python backend/tests/build_gold_standard.py
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("backend/data/dataspeak.db")
DEFAULT_TEMPLATE = Path("backend/tests/eval_dataset.template.json")
DEFAULT_OUTPUT = Path("backend/tests/eval_dataset.json")


def execute_sql(conn: sqlite3.Connection, sql: str) -> tuple[list[str], list[tuple]]:
    """Executa SQL e retorna (nomes_colunas, linhas)."""
    cursor = conn.execute(sql)
    columns = [desc[0] for desc in cursor.description] if cursor.description else []
    rows = cursor.fetchall()
    return columns, rows


def compute_result_hash(rows: list[tuple]) -> str:
    """
    Hash determinístico apenas dos dados (sem nomes de colunas).
    Linhas são ordenadas para neutralizar diferenças de ORDER BY.
    """
    payload = {"rows": sorted([list(row) for row in rows], key=lambda x: str(x))}
    serialized = json.dumps(payload, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def extract_chave_valores(
    columns: list[str],
    rows: list[tuple],
    chave_primaria: list[str],
) -> list[list]:
    """
    Extrai os valores das colunas-chave do resultado.

    Forma C: tenta achar cada coluna pelo nome. Se não achar, falha (gold standard
    é nosso, controlamos os nomes — fallback por posição é só pro eval_runner).

    Retorna lista de tuplas serializadas como string para serem JSON-friendly.
    """
    if not chave_primaria:
        return []

    # Mapeia nome → índice (case-insensitive)
    col_index = {c.upper(): i for i, c in enumerate(columns)}
    indices = []
    for chave in chave_primaria:
        idx = col_index.get(chave.upper())
        if idx is None:
            raise ValueError(
                f"Coluna-chave '{chave}' não encontrada nas colunas {columns} "
                f"do sql_referencia. Corrija chave_primaria_resultado no template."
            )
        indices.append(idx)

    # Extrai valores das colunas-chave de cada linha
    return [[str(row[i]) for i in indices] for row in rows]


def enrich_caso(conn: sqlite3.Connection, caso: dict[str, Any]) -> dict[str, Any]:
    """Executa o SQL de referência e adiciona campos de gold standard."""
    enriched = dict(caso)
    try:
        columns, rows = execute_sql(conn, caso["sql_referencia"])
        chave_primaria = caso.get("chave_primaria_resultado", [])
        chave_valores = extract_chave_valores(columns, rows, chave_primaria)

        enriched["resultado_esperado_hash"] = compute_result_hash(rows)
        enriched["resultado_esperado_rows"] = len(rows)
        enriched["resultado_esperado_cols"] = columns
        enriched["chave_valores_esperados"] = chave_valores
        enriched["build_status"] = "ok"
    except (sqlite3.Error, ValueError) as exc:
        enriched["resultado_esperado_hash"] = None
        enriched["resultado_esperado_rows"] = None
        enriched["resultado_esperado_cols"] = None
        enriched["chave_valores_esperados"] = None
        enriched["build_status"] = "erro"
        enriched["build_error"] = f"{type(exc).__name__}: {exc}"
    return enriched


def main() -> int:
    parser = argparse.ArgumentParser(description="Constrói gold standard do DataSpeak.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.db.exists():
        print(f"❌ Banco não encontrado: {args.db}", file=sys.stderr)
        return 1
    if not args.template.exists():
        print(f"❌ Template não encontrado: {args.template}", file=sys.stderr)
        return 1

    with args.template.open(encoding="utf-8") as f:
        template = json.load(f)

    casos_template = template.get("casos", [])
    print(f"📖 Lendo template: {args.template}")
    print(f"🗄️  Banco: {args.db}")
    print(f"🔢 Casos a processar: {len(casos_template)}\n")

    conn = sqlite3.connect(args.db)
    try:
        casos_enriquecidos = []
        ok_count = 0
        erro_count = 0
        for caso in casos_template:
            enriched = enrich_caso(conn, caso)
            casos_enriquecidos.append(enriched)
            if enriched["build_status"] == "ok":
                ok_count += 1
                print(
                    f"  ✅ {enriched['id']}: {enriched['resultado_esperado_rows']} linhas, "
                    f"chave={enriched.get('chave_primaria_resultado', [])}, "
                    f"hash {enriched['resultado_esperado_hash'][:12]}..."
                )
            else:
                erro_count += 1
                print(f"  ❌ {enriched['id']}: {enriched['build_error']}")
    finally:
        conn.close()

    output = {
        "version": template.get("version", "2.0"),
        "description": template.get("description", ""),
        "build_summary": {
            "total": len(casos_enriquecidos),
            "ok": ok_count,
            "erro": erro_count,
        },
        "casos": casos_enriquecidos,
    }

    with args.output.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n📊 Resumo: {ok_count} OK, {erro_count} erro")
    print(f"💾 Gold standard salvo em: {args.output}")
    return 0 if erro_count == 0 else 2


if __name__ == "__main__":
    sys.exit(main())