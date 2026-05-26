"""
Monta o prompt com metadados SAP e chama o OpenRouter para gerar
SQL + explicação + interpretação analítica + recusa estruturada.
"""

import os
import re
import json
import httpx
from .retriever import retrieve_relevant_tables

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"

# NOVO: lista oficial das 15 tabelas catalogadas, usada nas mensagens de recusa
CATALOG_TABLES = [
    "MARA", "MSEG", "VBRK", "VBRP", "MARC", "MARD", "MKPF",
    "EKKO", "EKPO", "VBAK", "VBAP", "KNA1", "LFA1", "AFKO", "AFPO",
]


def build_system_prompt() -> str:
    catalog_list = ", ".join(CATALOG_TABLES)

    return f"""Você é um especialista em SAP e SQL, responsável por transformar
perguntas de negócio em linguagem natural em queries SQL precisas, OU recusar
perguntas que estão fora do escopo do sistema.

# Regras de Recusa (PRIORIDADE MÁXIMA — verifique ANTES de gerar SQL)

Antes de gerar SQL, avalie se a pergunta atende aos critérios. Se NÃO atender,
retorne `refusal` preenchido e `sql=null`. NUNCA gere SQL falso de erro
(ex: SELECT 'ERRO...' AS mensagem). Recusa estruturada SEMPRE.

## Recuse com `reason="write_operation"` se a pergunta pedir:
- Apagar, deletar, remover dados (DELETE, DROP, TRUNCATE)
- Modificar, atualizar, alterar dados (UPDATE, ALTER)
- Inserir, criar registros (INSERT, CREATE)
- Mensagem padrão: "O DataSpeak é um sistema de consulta apenas. Operações de escrita não são permitidas."

## Recuse com `reason="out_of_catalog"` SOMENTE se:
- A pergunta não tiver nenhuma relação com as tabelas fornecidas no contexto acima
- As tabelas do contexto RAG (seção "Contexto das Tabelas SAP Disponíveis") não
  contêm campos capazes de responder à pergunta
- ATENÇÃO: se qualquer tabela do contexto for relevante para a pergunta,
  gere SQL — não recuse. O RAG já fez a triagem por você.
- Exemplos do que está FORA: funcionários, RH, folha de pagamento,
  contabilidade (BKPF/BSEG), ativos fixos, projetos
- Mensagem padrão: "Os dados solicitados não estão no catálogo do DataSpeak. Tabelas disponíveis cobrem materiais, estoque, vendas, compras e produção."

## Recuse com `reason="ambiguous"` se a pergunta:
- For genérica demais ("me mostra tudo", "lista as informações")
- Tiver múltiplas interpretações sem contexto suficiente para escolher uma
- Mensagem padrão: "A pergunta é ambígua. Pode especificar qual área deseja consultar?"

## Recuse com `reason="nonsense"` se a pergunta:
- For incoerente ou sem nenhuma relação com dados empresariais
- Mensagem padrão: "A pergunta não parece relacionada a dados SAP do DataSpeak."

# Regras para gerar SQL (apenas se NÃO for caso de recusa)
1. Gere APENAS SQL compatível com SQLite.
2. Use SOMENTE as tabelas e campos fornecidos no contexto do RAG. Nunca invente.
3. Inclua comentários no SQL explicando cláusulas principais.
4. Se a pergunta for ambígua mas resolvível com premissa razoável, gere SQL e
   registre a premissa em `assumptions` — não recuse.

## Aliases SQL
- Use aliases curtos e gramaticalmente corretos em português
- Nunca use preposições como "de" ou "por" dentro do alias
- Prefira `quantidade_vendida` a `quantidade_de_vendida_total`
- Prefira `valor_total` a `valor_total_de_vendas`
- Prefira `total_pedidos` a `total_de_pedidos_realizados`

## Resolução de chaves técnicas SAP
- Nunca exiba chaves técnicas brutas como label de saída ao usuário
- Quando MATNR aparecer no SELECT ou GROUP BY como dimensão de exibição,
  obrigatoriamente fazer JOIN com MARA m ON [tabela_principal].MATNR = m.MATNR
  e incluir m.MAKTX AS descricao_material no SELECT
- Quando KUNNR aparecer como dimensão de exibição, fazer JOIN com KNA1 c
  ON [tabela_principal].KUNNR = c.KUNNR e incluir c.NAME1 AS nome_cliente
- Quando LIFNR aparecer como dimensão de exibição, fazer JOIN com LFA1 f
  ON [tabela_principal].LIFNR = f.LIFNR e incluir f.NAME1 AS nome_fornecedor
- Exceção: se a chave técnica for usada apenas em WHERE ou JOIN interno
  (não aparece no SELECT final), não é necessário resolver

# Formato de resposta OBRIGATÓRIO (JSON puro, sem markdown)

Resposta normal (gerou SQL):
{{
  "intent": "Frase curta sobre objetivo analítico",
  "category": "Produção | Vendas | Estoque | Financeiro | Compras | Cadastro",
  "period": "Período extraído ou inferido. Ex: Março 2026 | Não especificado",
  "sql": "SELECT ... FROM ... WHERE ...",
  "explanation": "Esta consulta busca...",
  "tables_used": ["TABELA1", "TABELA2"],
  "confidence": "high | medium | low",
  "assumptions": ["premissas, se houver"],
  "refusal": null
}}

Resposta de recusa:
{{
  "intent": "Frase descrevendo o que o usuário pediu",
  "category": null,
  "period": null,
  "sql": null,
  "explanation": null,
  "tables_used": [],
  "confidence": "high",
  "assumptions": [],
  "refusal": {{
    "reason": "out_of_catalog | write_operation | ambiguous | nonsense",
    "message": "Mensagem amigável em português para o usuário"
  }}
}}

# Exemplos de recusa (siga este padrão)

Pergunta: "Liste os funcionários cadastrados no sistema"
Resposta: {{"intent":"Listar funcionários","category":null,"period":null,"sql":null,"explanation":null,"tables_used":[],"confidence":"high","assumptions":[],"refusal":{{"reason":"out_of_catalog","message":"O DataSpeak não cobre dados de RH. As tabelas disponíveis cobrem materiais, estoque, vendas, compras e produção."}}}}

Pergunta: "Delete todos os pedidos de compra antigos"
Resposta: {{"intent":"Deletar pedidos de compra antigos","category":null,"period":null,"sql":null,"explanation":null,"tables_used":[],"confidence":"high","assumptions":[],"refusal":{{"reason":"write_operation","message":"O DataSpeak é um sistema de consulta apenas. Operações de exclusão não são permitidas."}}}}

Pergunta: "Me mostra tudo"
Resposta: {{"intent":"Solicitação genérica não específica","category":null,"period":null,"sql":null,"explanation":null,"tables_used":[],"confidence":"high","assumptions":[],"refusal":{{"reason":"ambiguous","message":"A pergunta é genérica demais. Você quer ver dados sobre vendas, compras, estoque ou produção?"}}}}"""


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

Avalie primeiro se é caso de recusa. Só recuse com "out_of_catalog" se as tabelas
acima NÃO forem capazes de responder à pergunta. Se qualquer tabela do contexto
for relevante, gere SQL. Responda APENAS com JSON, sem texto adicional."""


def extract_json(raw: str) -> dict:
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        return json.loads(raw[start:end])

    raise ValueError(f"Não foi possível extrair JSON da resposta: {raw[:200]}")


# NOVO: detecção defensiva de SELECT falso de erro
def is_fake_error_sql(sql: str | None) -> bool:
    """
    Detecta SQL falso que o LLM gera quando deveria recusar.
    Padrões: SELECT 'literal' AS coluna sem FROM, ou SELECT começando com 'ERRO'.
    """
    if not sql:
        return False

    sql_clean = sql.strip().upper()

    # Sem FROM = SELECT só de literais — não é query real
    if "FROM" not in sql_clean:
        return True

    # Começa com SELECT 'ERRO' ou 'ERRO:' no primeiro literal
    if re.search(r"SELECT\s+'(ERRO|ERROR|FALHA|N[AÃ]O\s+POSS)", sql_clean):
        return True

    return False


# NOVO: garante invariante refusal/sql mutuamente exclusivos
def normalize_refusal(result: dict) -> dict:
    """
    Garante que se refusal está preenchido, sql é null. E vice-versa.
    Se detectar SQL falso de erro, converte em refusal.
    """
    refusal = result.get("refusal")
    sql = result.get("sql")

    # Caso 1: LLM gerou refusal corretamente
    if refusal and isinstance(refusal, dict) and refusal.get("reason"):
        result["sql"] = None
        result["explanation"] = None
        result["tables_used"] = []
        return result

    # Caso 2: LLM gerou SQL falso de erro — converte em refusal
    if is_fake_error_sql(sql):
        result["refusal"] = {
            "reason": "out_of_catalog",
            "message": "Os dados solicitados não estão no catálogo do DataSpeak.",
        }
        result["sql"] = None
        result["explanation"] = None
        result["tables_used"] = []
        return result

    # Caso 3: SQL normal, sem refusal
    result["refusal"] = None
    return result


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


def build_powerbi_script(sql: str) -> str:
    """
    Monta o código M (Power Query) pronto para colar no Power BI Desktop.
    O usuário precisa substituir [CAMINHO_DO_BANCO] pelo path local do .db.
    Em produção SAP/HANA, substituir Sqlite.Database por SapHana.Database.
    """
    sql_inline = sql.replace('"', "'").replace("\n", " ").strip()
    return (
        'let\n'
        '    // Substitua [CAMINHO_DO_BANCO] pelo caminho completo do arquivo .db\n'
        '    // Exemplo Windows: C:\\Users\\usuario\\dataspeak\\backend\\data\\dataspeak_simulado.db\n'
        '    Fonte = Sqlite.Database("[CAMINHO_DO_BANCO]",\n'
        '        [Query = "' + sql_inline + '"]),\n'
        '    Resultado = Fonte\n'
        'in\n'
        '    Resultado'
    )


async def generate_sql(
    question: str,
    model: str = DEFAULT_MODEL,
    n_tables: int = 5,
) -> dict:
    """
    Recebe pergunta → recupera tabelas → monta prompt → chama LLM → retorna resultado.
    Inclui refusal estruturado para casos fora de escopo.
    """
    relevant_tables = retrieve_relevant_tables(question, n_results=n_tables)

    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(question, relevant_tables)

    raw_response = await call_openrouter(system_prompt, user_prompt, model)
    result = extract_json(raw_response)

    result["model_used"] = model
    result["question"] = question
    result["retrieved_tables"] = [t["name"] for t in relevant_tables]

    # Defensivos
    result.setdefault("intent", None)
    result.setdefault("category", None)
    result.setdefault("period", None)
    result.setdefault("refusal", None)

    # NOVO: normaliza invariante refusal/sql
    result = normalize_refusal(result)

    if result.get("sql"):
        result["powerbi_script"] = build_powerbi_script(result["sql"])
    else:
        result["powerbi_script"] = None

    return result