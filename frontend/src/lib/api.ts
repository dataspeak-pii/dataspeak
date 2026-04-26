// =============================================================================
// API client — single source of truth para chamadas HTTP ao backend.
// Espelha o contrato registrado no Notion: "Contrato da API — /query".
// Toda mudança aqui exige atualizar o Notion antes.
// =============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Tipos do contrato ─────────────────────────────────────────────────────

export interface QueryRequest {
  question: string;
  model?: string; // opcional — comparação de LLMs no artigo
}

export type ApiConfidence = "low" | "medium" | "high";

export interface ApiField {
  name: string;
  sap_table: string;
  sap_field: string;
  type: "dimension" | "measure" | "date";
}

export interface ApiKpi {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  trend: number;
  trend_direction: "up" | "down" | "neutral";
}

export interface ApiChartPoint {
  label: string;
  [series: string]: string | number;
}

export interface QueryResponse {
  // Bloco A — sempre presente
  sql: string;
  explanation: string;
  assumptions: string[];
  confidence: ApiConfidence;
  tables_used: string[];
  retrieved_tables: string[];
  model_used: string;
  duration_ms: number;

  // Bloco B — interpretação enriquecida (Chat 04)
  intent?: string;
  category?: string;
  period?: string;

  // Bloco C — derivado do catálogo (Chat 05)
  fields?: ApiField[];

  // Bloco D — execução SQL (Chat 07)
  results?: Record<string, string | number | null>[];
  columns?: string[];
  total_rows?: number;
  estimated_rows?: number;

  // Bloco E — KPIs e chart (Chat 07)
  kpis?: ApiKpi[];
  chart_data?: ApiChartPoint[];
  chart_type?: "line" | "bar" | "pie" | "composed";
}

// ─── Erro tipado ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── POST /query ───────────────────────────────────────────────────────────

export async function postQuery(
  payload: QueryRequest,
): Promise<QueryResponse> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      "Não consegui conectar ao backend. Verifique se o servidor está rodando em " +
        API_URL,
    );
  }

  if (!res.ok) {
    let detail = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // resposta não era JSON — segue com a mensagem genérica
    }
    throw new ApiError(detail, res.status);
  }

  try {
    return (await res.json()) as QueryResponse;
  } catch {
    throw new ApiError("Resposta do backend não é um JSON válido.");
  }
}
