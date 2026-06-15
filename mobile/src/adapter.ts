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

const SAP_ID_RE = /^0+\d{4,}$/;

const NAME_COL_RE =
  /name|nome|maktx|ktext|stext|bezei|vtext|bezeich|descr|desc|razao|fantasia|empresa|parceiro|social|titular|cliente_n|fornecedor_n|partner_n/i;

const METRIC_COL_RE =
  /count|contagem|sum|soma|avg|media|min|max|total|qty|qtd|qtde|valor|amount|percent|pct|volume|receita|custo|saldo|preco|price|revenue|cost/i;

function buildIdToNameMap(
  results: Record<string, string | number | null>[],
  columns: string[],
): Map<string, string> {
  const map = new Map<string, string>();
  if (!results.length) return map;

  const nameColCandidates = columns.filter((c) => NAME_COL_RE.test(c));
  let nameCol: string | undefined = nameColCandidates[0];

  if (!nameCol && results[0]) {
    const candidates = columns
      .filter((c) => {
        if (METRIC_COL_RE.test(c)) return false;
        const raw = results[0][c];
        if (typeof raw !== "string") return false;
        const v = raw.trim();
        return v.length >= 4 && !/^\d+$/.test(v) && !SAP_ID_RE.test(v);
      })
      .sort((a, b) => {
        const va = String(results[0]![a] ?? "");
        const vb = String(results[0]![b] ?? "");
        const diff = (vb.includes(" ") ? 1 : 0) - (va.includes(" ") ? 1 : 0);
        return diff !== 0 ? diff : vb.length - va.length;
      });
    if (candidates[0]) nameCol = candidates[0];
  }

  if (!nameCol) return map;

  for (const row of results) {
    const name = String(row[nameCol] ?? "").trim();
    if (!name) continue;
    for (const col of columns) {
      if (col === nameCol) continue;
      const raw = row[col];
      let strVal: string | null = null;
      if (typeof raw === "string") {
        strVal = raw.trim();
      } else if (typeof raw === "number" && Number.isInteger(raw) && raw > 0 && !METRIC_COL_RE.test(col)) {
        strVal = String(raw);
      }
      if (!strVal) continue;
      if (SAP_ID_RE.test(strVal)) {
        const stripped = strVal.replace(/^0+/, "") || strVal;
        map.set(strVal, name);
        if (stripped !== strVal) map.set(stripped, name);
      } else if (typeof raw === "number" && strVal.length >= 3) {
        map.set(strVal, name);
      }
    }
  }

  return map;
}

function resolveId(id: string, idToName: Map<string, string>): string | undefined {
  return idToName.get(id) ?? idToName.get(id.replace(/^0+/, "") || id);
}

function resolvePoint(
  labelField: string,
  allFields: Record<string, unknown>,
  idToName: Map<string, string>,
): { display: string; original?: string } {
  const direct = resolveId(labelField, idToName);
  if (direct) return { display: direct, original: labelField };

  if (idToName.size > 0) {
    for (const [key, val] of Object.entries(allFields)) {
      if (key === "label" || key === "originalLabel") continue;
      if (typeof val !== "string") continue;
      const trimmed = val.trim();
      if (!SAP_ID_RE.test(trimmed)) continue;
      const name = resolveId(trimmed, idToName);
      if (name) return { display: name, original: trimmed };
    }
  }

  return { display: labelField };
}

function mapChartData(
  raw: QueryResponse["chart_data"],
  results: Record<string, string | number | null>[],
  columns: string[],
): ChartDataPoint[] {
  if (!raw) return [];

  const idToName = buildIdToNameMap(results, columns);

  if (Array.isArray(raw)) {
    return raw.map((point) => {
      const r = resolvePoint(String(point.label), point as Record<string, unknown>, idToName);
      return { ...point, label: r.display, ...(r.original ? { originalLabel: r.original } : {}) };
    });
  }

  const chart = raw as ApiChartDataRaw;
  if (!chart.labels || !chart.series) return [];

  return chart.labels.map((label, index) => {
    const name = resolveId(label, idToName);
    const point: ChartDataPoint = { label: name ?? label };
    if (name) point.originalLabel = label;
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
    chartData: mapChartData(response.chart_data, response.results ?? [], response.columns ?? []),
    chartType: response.chart_type ?? "bar",
  };

  return result;
}
