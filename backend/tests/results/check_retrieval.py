# backend/tests/results/check_retrieval.py
"""
Roda o retriever atual (estado pre-curadoria) nos 5 casos do
diagnostico de pares pai-filho. Output vira a linha de base
"antes" para comparacao posterior, apos a curadoria do YAML.
"""
import sys
from pathlib import Path

# tests/results -> tests -> backend
BACKEND_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_DIR))

from app.ai_engine.retriever import retrieve_relevant_tables

CASES = [
    ("Q004", "Liste todos os pedidos de compra cadastrados"),
    ("Q016", "Quantas notas fiscais foram emitidas por mes em 2025?"),
    ("Q022", "Qual o volume total produzido por material em ordens de producao concluidas?"),
    ("Q024", "Qual o faturamento total por organizacao de vendas em 2025?"),
    ("Q026", "Quais materiais foram movimentados e qual o volume total por planta em 2025?"),
]

# Gabarito ja com Q024 corrigido (VBRK em vez de VBAK)
EXPECTED = {
    "Q004": "EKKO",
    "Q016": "VBRK",
    "Q022": "AFPO",
    "Q024": "VBRK",
    "Q026": "MSEG",
}

# Tabelas "perigosamente proximas" que o RAG pode confundir
SIBLINGS = {
    "Q004": "EKPO",   # par pai-filho
    "Q016": "MKPF",   # confusao de dominio (NF vs doc material)
    "Q022": "AFKO",   # par pai-filho
    "Q024": "VBAK",   # confusao pedido vs faturamento
    "Q026": "MARD",   # confusao movimentacao vs estoque
}

def extract_table_name(item: dict) -> str:
    """Tenta varias chaves comuns para nome da tabela."""
    for key in ("table_name", "name", "tabela", "id", "table"):
        if key in item:
            return str(item[key])
    return str(item)[:40]

print(f"\n{'CASO':<6} {'GABARITO':<10} {'IRMA':<8} {'TOP-3 RETRIEVED':<35} {'GAB?':<6} {'IRMA?'}")
print("-" * 80)

for case_id, question in CASES:
    try:
        retrieved = retrieve_relevant_tables(question, n_results=5)
    except Exception as e:
        print(f"{case_id:<6} ERRO: {e}")
        continue

    tables = [extract_table_name(r) for r in retrieved]
    expected = EXPECTED[case_id]
    sibling = SIBLINGS[case_id]

    hit_expected = "SIM" if expected in tables else "NAO"
    hit_sibling = "SIM" if sibling in tables else "nao"
    tables_str = ", ".join(tables)

    print(f"{case_id:<6} {expected:<10} {sibling:<8} {tables_str:<35} {hit_expected:<6} {hit_sibling}")

print()