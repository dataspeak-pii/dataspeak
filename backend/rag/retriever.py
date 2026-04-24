"""Dado uma pergunta, retorna metadados das tabelas SAP mais relevantes."""
import os, yaml, chromadb

CHROMA_DIR  = os.path.join(os.path.dirname(__file__), "chroma_store")
CATALOG_DIR = os.path.join(os.path.dirname(__file__), "..", "catalog")

def retrieve_tables(question: str, n_results: int = 3) -> list[dict]:
    client     = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = client.get_collection("sap_tables")
    results    = collection.query(query_texts=[question], n_results=n_results)
    tables     = []
    for name in [m["name"] for m in results["metadatas"][0]]:
        path = os.path.join(CATALOG_DIR, f"{name}.yaml")
        if os.path.exists(path):
            with open(path) as f:
                tables.append(yaml.safe_load(f))
    return tables