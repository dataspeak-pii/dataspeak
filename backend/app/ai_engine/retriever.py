"""
Recebe uma pergunta em linguagem natural e retorna os metadados
das tabelas SAP mais relevantes, buscando semanticamente no ChromaDB.
"""

import yaml
import chromadb
from pathlib import Path

CATALOG_PATH = Path(__file__).parent.parent.parent / "catalog" / "sap_catalog.yaml"
CHROMA_PATH = Path(__file__).parent.parent.parent / "data" / "chroma_db"


def load_full_catalog() -> dict:
    """Carrega o catálogo completo em memória para enriquecer os resultados."""
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = yaml.safe_load(f)
    return {table["name"]: table for table in catalog.get("tables", [])}


def retrieve_relevant_tables(question: str, n_results: int = 3) -> list[dict]:
    """
    Busca semanticamente no ChromaDB as tabelas SAP mais relevantes
    para a pergunta recebida.

    Args:
        question: Pergunta em linguagem natural do usuário
        n_results: Número de tabelas a retornar (padrão: 3)

    Returns:
        Lista de dicts com metadados completos das tabelas encontradas
    """
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    collection = client.get_collection("sap_tables")

    # Busca semântica — ChromaDB vetoriza a pergunta e calcula similaridade
    results = collection.query(
        query_texts=[question],
        n_results=n_results,
        include=["metadatas", "distances", "documents"],
    )

    # Carrega o catálogo completo para retornar todos os campos (YAML tem mais que o ChromaDB)
    full_catalog = load_full_catalog()

    tables_found = []
    for i, table_name in enumerate(results["ids"][0]):
        full_table = full_catalog.get(table_name, {})
        full_table["_similarity_score"] = 1 - results["distances"][0][i]  # converte distância em score
        tables_found.append(full_table)

    return tables_found


if __name__ == "__main__":
    # Teste rápido
    question = "Quais foram as notas fiscais emitidas acima de R$ 50.000 em março?"
    tables = retrieve_relevant_tables(question)
    for t in tables:
        print(f"→ {t['name']} | score: {t['_similarity_score']:.3f} | {t['description']}")