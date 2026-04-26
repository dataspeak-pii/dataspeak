// =============================================================================
// Adapter — traduz QueryResponse (backend) para AnalysisResult (frontend).
//
// Por que existe:
// 1. Backend usa snake_case, frontend usa camelCase.
// 2. Frontend modela um produto rico (KPIs, charts, fields). Enquanto backend
//    não retorna todos os campos, adapter preenche com fallbacks elegantes
//    ("graceful degradation"). À medida que cada chat (04/05/07) entrega seu
//    bloco, os fallbacks somem e dados reais aparecem sem mudar o front.
// =============================================================================

import type {
  AnalysisResult,
  AnalysisInterpretation,
  DataTable,
  GeneratedScript,
  InterpretedField,
  KPI,
  ChartDataPoint,
} from "@/types";
import type {
  QueryResponse,
  ApiField,
  ApiKpi,
  ApiConfidence,
} from "./api";

// ─── Helpers ───────────────────────────────────────────────────────────────

// Backend retorna confidence qualitativa. Frontend espera 0-100.
// Mapeamento: low=50, medium=70, high=90.
function confidenceToNumber(c: ApiConfidence): number {
  switch (c) {
    case "high":
      return 90;
    case "medium":
      return 70;
    case "low":
      return 50;
  }
}

function mapApiFieldToInterpretedField(f: ApiField): InterpretedField {
  return {
    name: f.name,
    sapTable: f.sap_table,
    sapField: f.sap_field,
    type: f.type,
  };
}

function mapApiKpiToKpi(k: ApiKpi): KPI {
  return {
    id: k.id,
    label: k.label,
    value: k.value,
    unit: k.unit,
    trend: k.trend,
    trendDirection: k.trend_direction,
  };
}

function mapApiResultsToTable(res: QueryResponse): DataTable {
  const rows = res.results ?? [];
  const columns = res.columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  return {
    columns,
    rows,
    totalRows: res.total_rows ?? rows.length,
    sapSource: res.tables_used.length
      ? `SAP — Tabelas: ${res.tables_used.join(", ")}`
      : "SAP",
  };
}

// ─── Adapter principal ─────────────────────────────────────────────────────

export function adaptQueryResponse(
  res: QueryResponse,
  question: string,
  id: string,
): AnalysisResult {
  const interpretation: AnalysisInterpretation = {
    originalQuestion: question,
    intent: res.intent,
    confidence: confidenceToNumber(res.confidence),
    category: res.category,
    period: res.period,
    fields: (res.fields ?? []).map(mapApiFieldToInterpretedField),
    sapTables: res.tables_used,
  };

  const script: GeneratedScript = {
    language: "sql",
    code: res.sql,
    explanation: res.explanation,
    estimatedRows: res.estimated_rows ?? res.total_rows ?? 0,
  };

  const table = mapApiResultsToTable(res);
  const kpis: KPI[] = (res.kpis ?? []).map(mapApiKpiToKpi);
  const chartData: ChartDataPoint[] = res.chart_data ?? [];

  return {
    id,
    query: {
      id,
      question,
      timestamp: new Date(),
      status: "done",
      category: interpretation.category ?? "Análise",
    },
    interpretation,
    script,
    table,
    kpis,
    chartData,
    chartType: res.chart_type ?? "bar",
  };
}
