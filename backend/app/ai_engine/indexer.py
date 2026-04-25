"""
Lê o sap_catalog_completo.yaml e indexa todas as tabelas no ChromaDB.
Execute este script uma vez para popular o banco vetorial.
Execute novamente sempre que o catálogo for atualizado.
"""

import yaml
import chromadb
from pathlib import Path

# Caminho para o catálogo SAP
CATALOG_PATH = Path(__file__).parent.parent.parent / "catalog" / "sap_catalog.yaml"

# ChromaDB persistente — salva em disco, não perde ao reiniciar
CHROMA_PATH = Path(__file__).parent.parent.parent / "data" / "chroma_db"


def build_document_text(table: dict) -> str:
    """
    Monta o texto que será vetorizado para cada tabela.
    Quanto mais rico e descritivo, melhor a busca semântica.
    """
    parts = []

    parts.append(f"Tabela SAP: {table['name']}")
    parts.append(f"Módulo: {table.get('module', '')}")
    parts.append(f"Descrição: {table.get('description', '')}")

    if table.get("business_context"):
        parts.append(f"Contexto de negócio: {table['business_context']}")

    # Adiciona todos os campos com suas descrições
    if table.get("fields"):
        field_texts = []
        for field in table["fields"]:
            field_text = f"{field['name']}: {field.get('description', '')}"
            if field.get("common_values"):
                vals = ", ".join(
                    [f"{k}={v}" for k, v in list(field["common_values"].items())[:5]]
                )
                field_text += f" (valores: {vals})"
            field_texts.append(field_text)
        parts.append("Campos: " + " | ".join(field_texts))

    # Perguntas de exemplo — ouro para a busca semântica
    if table.get("example_questions"):
        parts.append("Perguntas típicas: " + " | ".join(table["example_questions"]))

    # Relacionamentos com outras tabelas
    if table.get("common_joins"):
        joins = [j.get("table", "") for j in table["common_joins"]]
        parts.append(f"Tabelas relacionadas: {', '.join(joins)}")

    return "\n".join(parts)


def index_catalog():
    """
    Função principal: lê o YAML e indexa tudo no ChromaDB.
    """
    # Carrega o catálogo
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = yaml.safe_load(f)

    tables = catalog.get("tables", [])
    print(f"📂 {len(tables)} tabelas encontradas no catálogo.")

    # Inicializa o ChromaDB persistente
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))

    # Apaga a coleção antiga se existir (garante re-indexação limpa)
    try:
        client.delete_collection("sap_tables")
        print("🗑️  Coleção anterior removida.")
    except Exception:
        pass

    collection = client.create_collection(
        name="sap_tables",
        metadata={"hnsw:space": "cosine"},  # distância cosseno — padrão para texto
    )

    # Prepara os dados para inserção em lote
    ids = []
    documents = []
    metadatas = []

    for table in tables:
        table_name = table["name"]
        doc_text = build_document_text(table)

        ids.append(table_name)
        documents.append(doc_text)
        metadatas.append({
            "name": table_name,
            "module": table.get("module", ""),
            "description": table.get("description", ""),
        })

    # Inserção em lote no ChromaDB
    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
    )

    print(f"✅ {len(ids)} tabelas indexadas com sucesso no ChromaDB.")
    print(f"📁 Banco vetorial salvo em: {CHROMA_PATH}")


if __name__ == "__main__":
    index_catalog()