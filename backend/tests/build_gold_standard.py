"""
build_gold_standard.py — Constrói o gold standard final do DataSpeak.

Lê eval_dataset.template.json, executa cada sql_referencia no SQLite simulado,
calcula hashes determinísticos dos resultados e grava eval_dataset.json.

Uso:
    python backend/tests/build_gold_standard.py
    python backend/tests/build_gold_standard.py --db backend/data/dataspeak.db
    python backend/tests/build_gold_standard.py --template custom_template.json

O eval_dataset.json gerado é a fonte de verdade para o eval_runner.py (próxima fase).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any


# ──────────────────────────────────────────────────────────────────────────────
# Caminhos default (relativos à raiz do projeto)
# ──────────────────────────────────────────────────────────────────────────────
DEFAULT_DB = Path("backend/data/dataspeak.db")
DEFAULT_TEMPLATE = Path("backend/tests/eval_dataset.template.json")
DEFAULT_OUTPUT = Path("backend/tests/eval_dataset.json")


# ──────────────────────────────────────────────────────────────────────────────
# Núcleo: execução determinística de SQL e cálculo de hash
# ──────────────────────────────────────────────────────────────────────────────
def execute_sql(conn: sqlite3.Connection, sql: str) -> tuple[list[str], list[tuple]]:
    """Executa SQL e retorna (nomes_colunas, linhas)."""
    cursor = conn.execute(sql)
    columns = [desc[0] for desc in cursor.description] if cursor.description else []
    rows = cursor.fetchall()
    return columns, rows


def compute_result_hash(columns: list[str], rows: list[tuple]) -> str:
    """
    Calcula SHA256 determinístico do resultado.

    Por que serializar via json.dumps com sort_keys=True:
    - Ordem de colunas é preservada (vem do SELECT)
    - Conteúdo das linhas é determinístico se o SQL tem ORDER BY
    - default=str trata datas, Decimal e outros tipos não-JSON nativos
    """
    payload = {"rows": sorted([list(row) for row in rows], key=lambda x: str(x))}
    serialized = json.dumps(payload, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


# ──────────────────────────────────────────────────────────────────────────────
# Pipeline: template → caso enriquecido com hash
# ──────────────────────────────────────────────────────────────────────────────
def enrich_caso(conn: sqlite3.Connection, caso: dict[str, Any]) -> dict[str, Any]:
    """
    Executa o SQL de referência do caso e adiciona campos de gold standard.

    Retorna o caso enriquecido com:
      - resultado_esperado_hash
      - resultado_esperado_rows
      - resultado_esperado_cols
      - build_status: 'ok' ou 'erro'
      - build_error: string com erro, se houver
    """
    enriched = dict(caso)
    try:
        columns, rows = execute_sql(conn, caso["sql_referencia"])
        enriched["resultado_esperado_hash"] = compute_result_hash(columns, rows)
        enriched["resultado_esperado_rows"] = len(rows)
        enriched["resultado_esperado_cols"] = columns
        enriched["build_status"] = "ok"
    except sqlite3.Error as exc:
        enriched["resultado_esperado_hash"] = None
        enriched["resultado_esperado_rows"] = None
        enriched["resultado_esperado_cols"] = None
        enriched["build_status"] = "erro"
        enriched["build_error"] = f"{type(exc).__name__}: {exc}"
    return enriched


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Constrói o gold standard do DataSpeak a partir do template."
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="Caminho do SQLite")
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE, help="JSON template")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="JSON de saída")
    args = parser.parse_args()

    # Validações de pré-condição
    if not args.db.exists():
        print(f"❌ Banco não encontrado: {args.db}", file=sys.stderr)
        print("   Rode primeiro: python backend/db/seed.py --reset --seed", file=sys.stderr)
        return 1

    if not args.template.exists():
        print(f"❌ Template não encontrado: {args.template}", file=sys.stderr)
        return 1

    # Carrega template
    with args.template.open(encoding="utf-8") as f:
        template = json.load(f)

    casos_template = template.get("casos", [])
    if not casos_template:
        print("❌ Template não tem casos.", file=sys.stderr)
        return 1

    print(f"📖 Lendo template: {args.template}")
    print(f"🗄️  Banco: {args.db}")
    print(f"🔢 Casos a processar: {len(casos_template)}\n")

    # Processa cada caso
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
                    f"hash {enriched['resultado_esperado_hash'][:12]}..."
                )
            else:
                erro_count += 1
                print(f"  ❌ {enriched['id']}: {enriched['build_error']}")
    finally:
        conn.close()

    # Escreve arquivo final
    output = {
        "version": template.get("version", "1.0"),
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