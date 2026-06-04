export type QueryStatus = "idle" | "loading" | "done" | "error";

export type ApiConfidence = "low" | "medium" | "high";

export interface QueryRequest {
  question: string;
  model?: string;
}

export interface ApiField {
  name: string;
  sap_table: string;
  sap_field: string;
  type: "dimension" | "measure" | "date";
}

export interface ApiKpi {
  id?: string;
  label: string;
  value: string | number;
  unit?: string;
  trend: number;
  trend_direction: "up" | "down" | "neutral";
}

export interface ApiChartSeriesItem {
  name: string;
  data: number[];
}

export interface ApiChartDataRaw {
  labels: string[];
  series: ApiChartSeriesItem[];
}

export interface ApiChartPoint {
  label: string;
  [series: string]: string | number;
}

export interface QueryResponse {
  sql: string;
  explanation: string;
  assumptions: string[];
  confidence: ApiConfidence;
  tables_used: string[];
  retrieved_tables: string[];
  model_used: string;
  duration_ms: number;

  intent?: string;
  category?: string;
  period?: string;

  fields?: ApiField[];

  results?: Record<string, string | number | null>[];
  columns?: string[];
  total_rows?: number;
  estimated_rows?: number;
  truncated?: boolean;
  execution_error?: string | null;
  query_id?: string;

  kpis?: ApiKpi[];
  chart_data?: ApiChartDataRaw | ApiChartPoint[];
  chart_type?: "line" | "bar" | "pie" | "composed";
}

export interface QueryHistoryItem {
  id: string;
  question: string;
  timestamp: string;
  status: QueryStatus;
  category: string;
  result?: AnalysisResult;
}

export interface InterpretedField {
  name: string;
  sapTable: string;
  sapField: string;
  type: "dimension" | "measure" | "date";
}

export interface AnalysisInterpretation {
  originalQuestion: string;
  intent?: string;
  confidence: number;
  category?: string;
  period?: string;
  fields: InterpretedField[];
  sapTables: string[];
  assumptions: string[];
  modelUsed?: string;
  durationMs?: number;
}

export interface GeneratedScript {
  language: "sql" | "abap";
  code: string;
  explanation: string;
  estimatedRows: number;
}

export interface DataRow {
  [key: string]: string | number | null;
}

export interface DataTable {
  columns: string[];
  rows: DataRow[];
  totalRows: number;
  sapSource: string;
  truncated?: boolean;
  executionError?: string | null;
  queryId?: string;
}

export interface KPI {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  trend: number;
  trendDirection: "up" | "down" | "neutral";
}

export interface ChartDataPoint {
  label: string;
  originalLabel?: string;
  [key: string]: string | number | undefined;
}

export interface AnalysisResult {
  id: string;
  query: QueryHistoryItem;
  interpretation: AnalysisInterpretation;
  script: GeneratedScript;
  table: DataTable;
  kpis: KPI[];
  chartData: ChartDataPoint[];
  chartType: "line" | "bar" | "pie" | "composed";
}
