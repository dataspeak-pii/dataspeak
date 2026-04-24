"""Carrega YAMLs do catálogo SAP e indexa no ChromaDB."""
import os, yaml, chromadb

CATALOG_DIR = os.path.join(os.path.dirname(__file__), "..", "catalog")
CHROMA_DIR  = os.path.join(os.path.dirname(__file__), "chroma_store")

def load_catalog() -> list[dict]:
    tables = []
    for fname in os.listdir(CATALOG_DIR):
        if fname.endswith(".yaml"):
            with open(os.path.join(CATALOG_DIR, fname)) as f:
                tables.append(yaml.safe_load(f))
    return tables

def index_catalog():
    client     = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = client.get_or_create_collection("sap_tables")
    for table in load_catalog():
        doc = f"{table['name']}: {table['description']}. Campos: {', '.join(f['name'] for f in table['fields'])}"
        collection.upsert(ids=[table["name"]], documents=[doc],
                          metadatas=[{"name": table["name"], "module": table.get("module", "")}])
    print(f"Indexadas {len(load_catalog())} tabelas.")

if __name__ == "__main__":
    index_catalog()