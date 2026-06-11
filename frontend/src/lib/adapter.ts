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
  ApiChartDataRaw,
  ApiConfidence,
  ApiRefusal,
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

function mapApiKpiToKpi(k: ApiKpi, index: number): KPI {
  return {
    id: k.id ?? `kpi-${index}`,
    label: k.label,
    value: k.value,
    unit: k.unit,
    trend: k.trend,
    trendDirection: k.trend_direction,
  };
}

// SAP zero-padded IDs: start with one or more 0s followed by at least 4 digits
const SAP_ID_RE = /^0+\d{4,}$/;

// Column name patterns that indicate a human-readable name/description in SAP.
// Covers: SAP standard fields (NAME1, MAKTX, KTEXT…), German terms (BEZEI, BEZEICH…),
// English (name, desc, descr), Portuguese business terms (razao, fantasia, empresa…).
const NAME_COL_RE =
  /name|nome|maktx|ktext|stext|bezei|vtext|bezeich|descr|desc|razao|fantasia|empresa|parceiro|social|titular|cliente_n|fornecedor_n|partner_n/i;

// Column name tokens that indicate a metric/measure — used to exclude these
// columns from the heuristic name-column fallback.
const METRIC_COL_RE =
  /count|contagem|sum|soma|avg|media|min|max|total|qty|qtd|qtde|valor|amount|percent|pct|volume|receita|custo|saldo|preco|price|revenue|cost/i;

/**
 * Builds a lookup map from SAP technical IDs to human-readable names.
 *
 * Stores BOTH the full zero-padded key ("000000000000000009") AND the
 * stripped key ("9") so the resolve step handles padding mismatches
 * between the results table and the chart_data labels.
 */
function buildIdToNameMap(
  results: Record<string, string | number | null>[],
  columns: string[],
): Map<string, string> {
  const map = new Map<string, string>();
  if (!results.length) return map;

  const nameColCandidates = columns.filter((c) => NAME_COL_RE.test(c));
  let nameCol: string | undefined = nameColCandidates[0];

  if (!nameCol) {
    // ── Fallback heurístico ────────────────────────────────────────────────
    // Procura a primeira coluna cujo valor na linha 0 parece um nome legível:
    //   • é string
    //   • comprimento ≥ 4 (descarta siglas/códigos curtos)
    //   • não é puramente numérico
    //   • não é um SAP ID zero-padded
    //   • a coluna não é uma métrica
    // Prefere colunas com valores que contêm espaços (nomes compostos) e
    // valores mais longos — heurísticas fortes para nomes de entidades.
    if (results[0]) {
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
          // Prefer values with spaces (multi-word names like "Empresa XYZ Ltda")
          const diff = (vb.includes(" ") ? 1 : 0) - (va.includes(" ") ? 1 : 0);
          // Then prefer longer values
          return diff !== 0 ? diff : vb.length - va.length;
        });

      if (candidates[0]) {
        nameCol = candidates[0];
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    if (!nameCol) {
      return map;
    }
  }

  for (const row of results) {
    const name = String(row[nameCol] ?? "").trim();
    if (!name) continue;
    for (const col of columns) {
      if (col === nameCol) continue;
      const raw = row[col];

      // Accept both string and integer values as potential SAP IDs.
      // Integers without leading zeros (e.g. KUNNR stored as number) are also
      // stored in the map so the stripped-key lookup in resolveId can find them.
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
        // Non-zero-padded numeric ID (e.g. customer number stored as integer 1001)
        map.set(strVal, name);
      }
    }
  }

  return map;
}

/**
 * Attempts to resolve a string to a human-readable name using the idToName map.
 * Tries: exact match → stripped match (remove leading zeros).
 */
function resolveId(
  id: string,
  idToName: Map<string, string>,
): string | undefined {
  return (
    idToName.get(id) ??
    idToName.get(id.replace(/^0+/, "") || id)
  );
}

/**
 * Resolves the best display label for a chart data point.
 *
 * Strategy:
 *   1. Try `labelField` directly (exact + stripped match)
 *   2. If unresolved, scan ALL other string fields of the point that look
 *      like SAP IDs — covers cases where the backend used the wrong column
 *      as the chart label dimension
 */
function resolvePoint(
  labelField: string,
  allFields: Record<string, unknown>,
  idToName: Map<string, string>,
): { display: string; original?: string; strategy: string } {
  // 1. Direct label resolution
  const direct = resolveId(labelField, idToName);
  if (direct) return { display: direct, original: labelField, strategy: "direct" };

  // 2. Scan other string fields for any SAP ID that resolves
  if (idToName.size > 0) {
    for (const [key, val] of Object.entries(allFields)) {
      if (key === "label" || key === "originalLabel") continue;
      if (typeof val !== "string") continue;
      const trimmed = val.trim();
      if (!SAP_ID_RE.test(trimmed)) continue;
      const name = resolveId(trimmed, idToName);
      if (name) {
        return { display: name, original: trimmed, strategy: `field:${key}` };
      }
    }
  }

  return { display: labelField, strategy: "unresolved" };
}

function mapChartData(
  raw: QueryResponse["chart_data"],
  results: Record<string, string | number | null>[],
  columns: string[],
): ChartDataPoint[] {
  if (!raw) return [];

  const idToName = buildIdToNameMap(results, columns);

  if ("labels" in (raw as object) && "series" in (raw as object)) {
    const { labels, series } = raw as ApiChartDataRaw;

    return labels.map((label, i) => {
      // For the ApiChartDataRaw format the point doesn't carry other fields
      // yet, so we resolve using the label alone (direct + stripped).
      const name = resolveId(label, idToName);
      const point: ChartDataPoint = { label: name ?? label };
      if (name) point.originalLabel = label;
      series.forEach((s) => {
        point[s.name] = s.data[i] ?? 0;
      });
      return point;
    });
  }

  if (Array.isArray(raw)) {
    const points = raw as ChartDataPoint[];

    return points.map((p) => {
      const r = resolvePoint(
        String(p.label),
        p as Record<string, unknown>,
        idToName,
      );
      return {
        ...p,
        label: r.display,
        ...(r.original ? { originalLabel: r.original } : {}),
      };
    });
  }

  return [];
}

function mapApiResultsToTable(res: QueryResponse): DataTable {
  const rows = res.results ?? [];
  const columns = res.columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  return {
    columns,
    rows,
    totalRows: res.total_rows ?? rows.length,
    sapSource: (res.tables_used ?? []).length
      ? `SAP — Tabelas: ${res.tables_used!.join(", ")}`
      : "SAP",
    truncated: res.truncated ?? false,
    executionError: res.execution_error ?? null,
    queryId: res.query_id,
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
    sapTables: res.tables_used ?? [],
  };

  const script: GeneratedScript = {
    language: "sql",
    code: res.sql ?? "",
    explanation: res.explanation ?? "",
    estimatedRows: res.estimated_rows ?? res.total_rows ?? 0,
  };

  const table = mapApiResultsToTable(res);
  const kpis: KPI[] = (res.kpis ?? []).map(mapApiKpiToKpi);
  const chartData: ChartDataPoint[] = mapChartData(
    res.chart_data,
    res.results ?? [],
    res.columns ?? [],
  );

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
    refusal: (res.refusal as ApiRefusal | null | undefined)?.message ?? null,
  };
}
