import type {
  AnalysisResult,
  ApiChartDataRaw,
  ApiConfidence,
  ApiField,
  ApiKpi,
  ChartDataPoint,
  DataTable,
  InterpretedField,
  KPI,
  QueryResponse,
} from "./types";

function confidenceToNumber(confidence: ApiConfidence): number {
  if (confidence === "high") return 90;
  if (confidence === "medium") return 70;
  return 50;
}

function mapApiField(field: ApiField): InterpretedField {
  return {
    name: field.name,
    sapTable: field.sap_table,
    sapField: field.sap_field,
    type: field.type,
  };
}

function mapApiKpi(kpi: ApiKpi, index: number): KPI {
  return {
    id: kpi.id ?? `kpi-${index}`,
    label: kpi.label,
    value: kpi.value,
    unit: kpi.unit,
    trend: kpi.trend,
    trendDirection: kpi.trend_direction,
  };
}

function mapTable(response: QueryResponse): DataTable {
  const rows = response.results ?? [];
  const columns = response.columns ?? (rows[0] ? Object.keys(rows[0]) : []);

  return {
    columns,
    rows,
    totalRows: response.total_rows ?? rows.length,
    sapSource: response.tables_used?.length
      ? `SAP — Tabelas: ${response.tables_used.join(", ")}`
      : "SAP",
    truncated: response.truncated ?? false,
    executionError: response.execution_error ?? null,
    queryId: response.query_id,
  };
}

function mapChartData(response: QueryResponse): ChartDataPoint[] {
  const raw = response.chart_data;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((point) => ({ ...point }));
  }

  const chart = raw as ApiChartDataRaw;

  if (!chart.labels || !chart.series) return [];

  return chart.labels.map((label, index) => {
    const point: ChartDataPoint = { label };
    chart.series.forEach((serie) => {
      point[serie.name] = serie.data[index] ?? 0;
    });
    return point;
  });
}

export function adaptQueryResponse(
  response: QueryResponse,
  question: string,
  id: string
): AnalysisResult {
  const timestamp = new Date().toISOString();

  const category = response.category ?? "Análise";

  const result: AnalysisResult = {
    id,
    query: {
      id,
      question,
      timestamp,
      status: "done",
      category,
    },
    interpretation: {
      originalQuestion: question,
      intent: response.intent,
      confidence: confidenceToNumber(response.confidence),
      category,
      period: response.period,
      fields: (response.fields ?? []).map(mapApiField),
      sapTables: response.tables_used ?? [],
      assumptions: response.assumptions ?? [],
      modelUsed: response.model_used,
      durationMs: response.duration_ms,
    },
    script: {
      language: "sql",
      code: response.sql ?? "",
      explanation: response.explanation ?? "",
      estimatedRows:
        response.estimated_rows ?? response.total_rows ?? response.results?.length ?? 0,
    },
    table: mapTable(response),
    kpis: (response.kpis ?? []).map(mapApiKpi),
    chartData: mapChartData(response),
    chartType: response.chart_type ?? "bar",
  };

  result.query.result = result;

  return result;
}
