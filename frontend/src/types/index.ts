// ─── Core domain types ───────────────────────────────────────────────────────

export type QueryStatus = "idle" | "loading" | "done" | "error";

export interface QueryHistoryItem {
  id: string;
  question: string;
  timestamp: Date;
  status: QueryStatus;
  category: string;
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
  confidence: number; // 0-100
  category?: string;
  period?: string;
  fields: InterpretedField[];
  sapTables: string[];
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
}

export interface KPI {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  trend: number; // % change vs previous period
  trendDirection: "up" | "down" | "neutral";
}

export interface ChartDataPoint {
  label: string;
  [key: string]: string | number;
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
