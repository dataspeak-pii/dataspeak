"""
Monta o prompt com metadados SAP e chama o OpenRouter para gerar
SQL + explicação + interpretação analítica (intent, category, period).
"""

import os
import re
import json
import httpx
from .retriever import retrieve_relevant_tables

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"


def build_system_prompt() -> str:
    return """Você é um especialista em SAP e SQL, responsável por transformar
perguntas de negócio em linguagem natural em queries SQL precisas.

Regras obrigatórias:
1. Gere APENAS SQL compatível com SQLite (sem funções exclusivas de SAP HANA ou Oracle).
2. Use SOMENTE as tabelas e campos fornecidos no contexto. Nunca invente tabelas.
3. Inclua comentários no SQL explicando cada cláusula principal.
4. Se a pergunta for ambígua, escolha a interpretação mais conservadora.
5. Após o SQL, forneça uma explicação em português simples do que a query faz.

Formato de resposta OBRIGATÓRIO (JSON puro, sem blocos markdown):
{
  "intent": "Frase curta descrevendo o objetivo analítico da pergunta. Ex: Analisar volume de entradas de estoque por material.",
  "category": "Uma das opções: Produção | Vendas | Estoque | Financeiro | Compras | Cadastro",
  "period": "Período extraído ou inferido da pergunta. Ex: Março 2026 | Últimos 90 dias | 1º trimestre 2026 | Não especificado",
  "sql": "SELECT ... FROM ... WHERE ...",
  "explanation": "Esta consulta busca...",
  "tables_used": ["TABELA1", "TABELA2"],
  "confidence": "high | medium | low",
  "assumptions": ["lista de premissas feitas, se houver"]
}"""


def build_user_prompt(question: str, tables: list[dict]) -> str:
    context_parts = []

    for table in tables:
        table_section = [f"## Tabela: {table['name']}"]
        table_section.append(f"Descrição: {table.get('description', '')}")

        if table.get("business_context"):
            table_section.append(f"Contexto: {table['business_context']}")

        if table.get("fields"):
            table_section.append("Campos disponíveis:")
            for field in table["fields"]:
                field_line = f"  - {field['name']} ({field.get('type', '')}): {field.get('description', '')}"
                if field.get("common_values"):
                    vals = ", ".join(
                        [f"{k}={v}" for k, v in list(field["common_values"].items())[:4]]
                    )
                    field_line += f"\n      Valores comuns: {vals}"
                table_section.append(field_line)

        if table.get("example_sql"):
            table_section.append(f"Exemplo de uso:\n```sql\n{table['example_sql']}\n```")

        context_parts.append("\n".join(table_section))

    context = "\n\n---\n\n".join(context_parts)

    return f"""# Contexto das Tabelas SAP Disponíveis

{context}

---

# Pergunta do Usuário

{question}

Gere o JSON completo conforme as regras e formato definidos. Responda APENAS com o JSON, sem texto adicional."""


def extract_json(raw: str) -> dict:
    """
    Extrai JSON da resposta do LLM com 3 estratégias em cascata:
    1. Bloco markdown ```json ... ```
    2. Primeiro { ao último }
    3. Re-raise se nenhuma funcionar
    """
    # Estratégia 1: bloco markdown
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    # Estratégia 2: primeiro { ao último }
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        return json.loads(raw[start:end])

    raise ValueError(f"Não foi possível extrair JSON da resposta: {raw[:200]}")


async def call_openrouter(
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_MODEL,
) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dataspeak.app",
        "X-Title": "DataSpeak",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    return data["choices"][0]["message"]["content"]


async def generate_sql(
    question: str,
    model: str = DEFAULT_MODEL,
    n_tables: int = 3,
) -> dict:
    """
    Recebe pergunta → recupera tabelas → monta prompt → chama LLM → retorna resultado.
    Retorna todos os campos do Bloco A (sql, explanation, tables_used, confidence, assumptions)
    e Bloco B (intent, category, period).
    """
    # 1. RAG — recupera tabelas relevantes
    relevant_tables = retrieve_relevant_tables(question, n_results=n_tables)

    # 2. Monta prompts
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(question, relevant_tables)

    # 3. Chama OpenRouter
    raw_response = await call_openrouter(system_prompt, user_prompt, model)

    # 4. Extrai JSON com fallback
    result = extract_json(raw_response)

    # 5. Metadados adicionais
    result["model_used"] = model
    result["question"] = question
    result["retrieved_tables"] = [t["name"] for t in relevant_tables]

    # 6. Garante que os campos do Bloco B existem (defensivo)
    result.setdefault("intent", None)
    result.setdefault("category", None)
    result.setdefault("period", None)

    return result