"""Executa queries no SQLite simulado."""
import os, sqlite3
from dotenv import load_dotenv
load_dotenv()

DB_PATH = os.getenv("SQLITE_DB_PATH", "db/simulated_sap.db")

def execute_query(sql: str) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute(sql)
        return [dict(row) for row in cursor.fetchall()]
    except sqlite3.Error as e:
        raise ValueError(f"Erro SQL: {e}")
    finally:
        conn.close()