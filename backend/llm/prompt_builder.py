"""Monta o prompt para o LLM com pergunta + metadados RAG."""

SYSTEM_PROMPT = """Você é um especialista em SAP e SQL.
Dado uma pergunta de negócio e metadados de tabelas SAP relevantes, gere:
1. Uma query SQL válida para SQLite que responda à pergunta
2. Uma explicação clara em português do que a query faz

Responda APENAS em JSON: {"sql": "...", "explanation": "..."}

Regras:
- Use apenas as tabelas fornecidas
- Adapte sintaxe SAP para SQLite (sem TO_CHAR, sem ADD_MONTHS)
- Seja conciso na explicação"""

def build_prompt(question: str, tables: list[dict]) -> str:
    ctx = ""
    for t in tables:
        fields = "\n".join(f"  - {f['name']} ({f['type']}): {f['description']}" for f in t["fields"])
        ctx += f"\nTabela: {t['name']}\nDescrição: {t['description']}\nCampos:\n{fields}\n"
    return f"Pergunta: {question}\n\nTabelas SAP disponíveis:\n{ctx}\nGere a query e explicação."