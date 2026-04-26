"""
Monta o prompt com metadados SAP e chama o OpenRouter para gerar
SQL + explicação em linguagem natural.
"""

import os
import json
import httpx
from typing import Optional
from .retriever import retrieve_relevant_tables

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Modelo padrão — pode ser trocado via parâmetro para comparação de LLMs
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
6. Retorne SOMENTE o objeto JSON puro. Não use blocos de código markdown (```), não escreva texto antes ou depois do JSON.

Formato de resposta OBRIGATÓRIO (JSON):
{
  "sql": "SELECT ... FROM ... WHERE ...",
  "explanation": "Esta consulta busca...",
  "tables_used": ["TABELA1", "TABELA2"],
  "confidence": "high|medium|low",
  "assumptions": ["lista de premissas feitas, se houver"]
}"""


def build_user_prompt(question: str, tables: list[dict]) -> str:
    """
    Monta o prompt dinâmico com o contexto das tabelas SAP
    e a pergunta do usuário.
    """
    context_parts = []

    for table in tables:
        table_section = [f"## Tabela: {table['name']}"]
        table_section.append(f"Descrição: {table.get('description', '')}")

        if table.get("business_context"):
            table_section.append(f"Contexto: {table['business_context']}")

        # Campos da tabela
        if table.get("fields"):
            table_section.append("Campos disponíveis:")
            for field in table["fields"]:
                field_line = f"  - {field['name']} ({field.get('type', '')}): {field.get('description', '')}"
                if field.get("common_values"):
                    vals = ", ".join([f"{k}={v}" for k, v in list(field["common_values"].items())[:4]])
                    field_line += f"\n      Valores comuns: {vals}"
                table_section.append(field_line)

        # Exemplo de SQL se disponível
        if table.get("example_sql"):
            table_section.append(f"Exemplo de uso:\n```sql\n{table['example_sql']}\n```")

        context_parts.append("\n".join(table_section))

    context = "\n\n---\n\n".join(context_parts)

    return f"""# Contexto das Tabelas SAP Disponíveis

{context}

---

# Pergunta do Usuário

{question}

Gere o SQL e a explicação conforme as regras e formato definidos."""


async def call_openrouter(
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_MODEL,
) -> str:
    """
    Faz a chamada HTTP para o OpenRouter.
    Retorna o conteúdo da resposta como string.
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dataspeak.app",  # identificação para o OpenRouter
        "X-Title": "DataSpeak",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,  # baixo = mais determinístico = melhor para SQL
        "response_format": {"type": "json_object"},  # força JSON na resposta
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
    Função principal do motor de IA.

    Pipeline: pergunta → RAG → prompt → LLM → JSON estruturado.
    Inclui fallback robusto para quando o LLM ignora o response_format
    e retorna o JSON envolto em markdown ou com texto adicional.

    Args:
        question: Pergunta em linguagem natural
        model: Modelo do OpenRouter a usar (permite comparação entre LLMs)
        n_tables: Número de tabelas SAP a incluir no contexto

    Returns:
        Dict com sql, explanation, tables_used, confidence, assumptions,
        model_used, question, retrieved_tables
    """
    import re

    # 1. Recupera tabelas relevantes via RAG
    relevant_tables = retrieve_relevant_tables(question, n_results=n_tables)

    # 2. Monta os prompts
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(question, relevant_tables)

    # 3. Chama o OpenRouter
    raw_response = await call_openrouter(system_prompt, user_prompt, model)

    # 4. Parseia o JSON com fallback em cascata
    try:
        result = json.loads(raw_response)
    except json.JSONDecodeError:
        # Fallback 1: extrai JSON de bloco markdown ```json ... ```
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_response, re.DOTALL)
        if match:
            result = json.loads(match.group(1))
        else:
            # Fallback 2: pega tudo entre o primeiro { e o último }
            start = raw_response.find("{")
            end = raw_response.rfind("}")
            if start != -1 and end != -1 and end > start:
                result = json.loads(raw_response[start:end + 1])
            else:
                raise

    # 5. Adiciona metadados úteis
    result["model_used"] = model
    result["question"] = question
    result["retrieved_tables"] = [t["name"] for t in relevant_tables]

    return result