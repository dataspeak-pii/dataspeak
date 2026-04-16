import type {
  AnalysisResult,
  QueryHistoryItem,
  ChartDataPoint,
} from "@/types";

// ─── Query history (sidebar) ─────────────────────────────────────────────────

export const mockHistory: QueryHistoryItem[] = [
  {
    id: "q1",
    question: "Volume de produção dos últimos 3 meses",
    timestamp: new Date("2026-04-15T10:30:00"),
    status: "done",
    category: "Produção",
  },
  {
    id: "q2",
    question: "Top 10 materiais por volume de vendas",
    timestamp: new Date("2026-04-14T14:20:00"),
    status: "done",
    category: "Vendas",
  },
  {
    id: "q3",
    question: "Estoque atual por centro de distribuição",
    timestamp: new Date("2026-04-13T09:15:00"),
    status: "done",
    category: "Estoque",
  },
  {
    id: "q4",
    question: "Comparativo de produção vs planejado",
    timestamp: new Date("2026-04-12T16:45:00"),
    status: "done",
    category: "Produção",
  },
  {
    id: "q5",
    question: "Índice de qualidade por linha",
    timestamp: new Date("2026-04-10T11:00:00"),
    status: "done",
    category: "Qualidade",
  },
];

// ─── Suggestion prompts ──────────────────────────────────────────────────────

export const suggestionPrompts = [
  "Qual foi o volume de produção nos últimos 3 meses?",
  "Quais os 10 materiais com maior volume de vendas?",
  "Como está o estoque por centro de distribuição?",
  "Comparativo de produção realizada vs planejada",
  "Qual a eficiência das linhas de produção por turno?",
  "Pedidos em aberto por cliente e região",
];

// ─── Full analysis results (keyed by question slug) ─────────────────────────

export const mockResults: Record<string, AnalysisResult> = {
  production: {
    id: "q1",
    query: mockHistory[0],
    interpretation: {
      originalQuestion: "Volume de produção dos últimos 3 meses",
      intent: "Análise temporal de volume de produção agregado por mês",
      confidence: 94,
      category: "Produção",
      period: "Janeiro – Março 2026",
      fields: [
        {
          name: "Data de Produção",
          sapTable: "AUFK",
          sapField: "ERDAT",
          type: "date",
        },
        {
          name: "Centro de Trabalho",
          sapTable: "CRHD",
          sapField: "ARBPL",
          type: "dimension",
        },
        {
          name: "Material",
          sapTable: "MARA",
          sapField: "MATNR",
          type: "dimension",
        },
        {
          name: "Quantidade Produzida",
          sapTable: "AFKO",
          sapField: "GAMNG",
          type: "measure",
        },
        {
          name: "Unidade de Medida",
          sapTable: "AFKO",
          sapField: "GMEIN",
          type: "dimension",
        },
      ],
      sapTables: ["AUFK", "AFKO", "CRHD", "MARA"],
    },
    script: {
      language: "sql",
      estimatedRows: 1842,
      explanation:
        "Query que agrega o volume de produção por mês e linha, juntando as ordens de produção (AUFK/AFKO) com os centros de trabalho (CRHD) e materiais (MARA). O filtro de data cobre os últimos 90 dias.",
      code: `-- =====================================================
-- Script Gerado Automaticamente – Klabin Dashboard
-- Análise: Volume de Produção | Últimos 3 meses
-- Gerado em: 16/04/2026 14:32
-- =====================================================

SELECT
    TO_CHAR(AUFK.ERDAT, 'YYYY-MM') AS mes,
    CRHD.ARBPL                     AS linha_producao,
    MARA.MATNR                     AS material,
    SUM(AFKO.GAMNG)                AS qtd_produzida,
    AFKO.GMEIN                     AS unidade
FROM
    AUFK
    INNER JOIN AFKO ON AUFK.AUFNR = AFKO.AUFNR
    INNER JOIN CRHD ON AUFK.ARBPL = CRHD.ARBPL
    INNER JOIN MARA ON AFKO.MATNR = MARA.MATNR
WHERE
    AUFK.ERDAT >= ADD_MONTHS(SYSDATE, -3)
    AND AUFK.AUART IN ('PP01', 'PP02')   -- Ordens de produção
    AND AUFK.TECO  = 'X'                 -- Confirmadas
GROUP BY
    TO_CHAR(AUFK.ERDAT, 'YYYY-MM'),
    CRHD.ARBPL,
    MARA.MATNR,
    AFKO.GMEIN
ORDER BY
    mes ASC,
    qtd_produzida DESC;`,
    },
    table: {
      sapSource: "SAP ECC – Módulo PP",
      totalRows: 1842,
      columns: ["Mês", "Linha", "Material", "Qtd. Produzida", "Unidade"],
      rows: [
        {
          Mês: "Jan/2026",
          Linha: "Linha A",
          Material: "KLB-1032",
          "Qtd. Produzida": 48200,
          Unidade: "TON",
        },
        {
          Mês: "Jan/2026",
          Linha: "Linha B",
          Material: "KLB-2018",
          "Qtd. Produzida": 35600,
          Unidade: "TON",
        },
        {
          Mês: "Jan/2026",
          Linha: "Linha C",
          Material: "KLB-3045",
          "Qtd. Produzida": 22100,
          Unidade: "TON",
        },
        {
          Mês: "Fev/2026",
          Linha: "Linha A",
          Material: "KLB-1032",
          "Qtd. Produzida": 51300,
          Unidade: "TON",
        },
        {
          Mês: "Fev/2026",
          Linha: "Linha B",
          Material: "KLB-2018",
          "Qtd. Produzida": 33800,
          Unidade: "TON",
        },
        {
          Mês: "Fev/2026",
          Linha: "Linha C",
          Material: "KLB-3045",
          "Qtd. Produzida": 24700,
          Unidade: "TON",
        },
        {
          Mês: "Mar/2026",
          Linha: "Linha A",
          Material: "KLB-1032",
          "Qtd. Produzida": 55900,
          Unidade: "TON",
        },
        {
          Mês: "Mar/2026",
          Linha: "Linha B",
          Material: "KLB-2018",
          "Qtd. Produzida": 38200,
          Unidade: "TON",
        },
        {
          Mês: "Mar/2026",
          Linha: "Linha C",
          Material: "KLB-3045",
          "Qtd. Produzida": 27400,
          Unidade: "TON",
        },
      ],
    },
    kpis: [
      {
        id: "k1",
        label: "Total Produzido",
        value: "337.200",
        unit: "TON",
        trend: 8.4,
        trendDirection: "up",
      },
      {
        id: "k2",
        label: "Média Mensal",
        value: "112.400",
        unit: "TON",
        trend: 5.2,
        trendDirection: "up",
      },
      {
        id: "k3",
        label: "Eficiência",
        value: "94,3",
        unit: "%",
        trend: -1.1,
        trendDirection: "down",
      },
      {
        id: "k4",
        label: "Linhas Ativas",
        value: "3",
        unit: "",
        trend: 0,
        trendDirection: "neutral",
      },
    ],
    chartType: "bar",
    chartData: [
      { label: "Jan/2026", "Linha A": 48200, "Linha B": 35600, "Linha C": 22100 },
      { label: "Fev/2026", "Linha A": 51300, "Linha B": 33800, "Linha C": 24700 },
      { label: "Mar/2026", "Linha A": 55900, "Linha B": 38200, "Linha C": 27400 },
    ],
  },

  sales: {
    id: "q2",
    query: mockHistory[1],
    interpretation: {
      originalQuestion: "Top 10 materiais por volume de vendas",
      intent: "Ranking de materiais com maior volume acumulado de vendas",
      confidence: 91,
      category: "Vendas",
      period: "Ano corrente (2026)",
      fields: [
        { name: "Material", sapTable: "VBAP", sapField: "MATNR", type: "dimension" },
        { name: "Descrição", sapTable: "MAKT", sapField: "MAKTX", type: "dimension" },
        { name: "Qtd Vendida", sapTable: "VBAP", sapField: "KWMENG", type: "measure" },
        { name: "Receita", sapTable: "VBAP", sapField: "NETWR", type: "measure" },
      ],
      sapTables: ["VBAK", "VBAP", "MARA", "MAKT"],
    },
    script: {
      language: "sql",
      estimatedRows: 10,
      explanation:
        "Ranking dos 10 materiais com maior volume de vendas no ano, com receita total associada.",
      code: `-- =====================================================
-- Script Gerado Automaticamente – Klabin Dashboard
-- Análise: Top 10 Materiais | Volume de Vendas 2026
-- Gerado em: 16/04/2026 14:32
-- =====================================================

SELECT TOP 10
    VBAP.MATNR          AS material,
    MAKT.MAKTX          AS descricao,
    SUM(VBAP.KWMENG)    AS qtd_vendida,
    SUM(VBAP.NETWR)     AS receita_total,
    VBAP.VRKME          AS unidade
FROM
    VBAK
    INNER JOIN VBAP ON VBAK.VBELN = VBAP.VBELN
    INNER JOIN MAKT ON VBAP.MATNR = MAKT.MATNR
              AND MAKT.SPRAS = 'PT'
WHERE
    VBAK.AUDAT BETWEEN '20260101' AND '20261231'
    AND VBAK.AUART IN ('ZOR', 'OR')    -- Ordens de venda standard
    AND VBAK.GBSTK <> 'C'              -- Não canceladas
GROUP BY
    VBAP.MATNR,
    MAKT.MAKTX,
    VBAP.VRKME
ORDER BY
    qtd_vendida DESC;`,
    },
    table: {
      sapSource: "SAP ECC – Módulo SD",
      totalRows: 10,
      columns: ["#", "Material", "Descrição", "Qtd Vendida", "Receita (R$)"],
      rows: [
        { "#": 1, Material: "KLB-1032", Descrição: "Papelão Ondulado Kraft", "Qtd Vendida": 182400, "Receita (R$)": "R$ 9.120.000" },
        { "#": 2, Material: "KLB-2018", Descrição: "Papel Tissue Premium", "Qtd Vendida": 145600, "Receita (R$)": "R$ 7.280.000" },
        { "#": 3, Material: "KLB-3045", Descrição: "Embalagem Industrial", "Qtd Vendida": 98300, "Receita (R$)": "R$ 4.915.000" },
        { "#": 4, Material: "KLB-0812", Descrição: "Cartão SBS", "Qtd Vendida": 87200, "Receita (R$)": "R$ 4.360.000" },
        { "#": 5, Material: "KLB-4210", Descrição: "Papel Kraft Natural", "Qtd Vendida": 76500, "Receita (R$)": "R$ 3.825.000" },
      ],
    },
    kpis: [
      { id: "k1", label: "Receita Total (Top 10)", value: "R$ 29,5M", unit: "", trend: 12.3, trendDirection: "up" },
      { id: "k2", label: "Volume Total", value: "590.000", unit: "TON", trend: 9.1, trendDirection: "up" },
      { id: "k3", label: "Ticket Médio", value: "R$ 50,00", unit: "/TON", trend: 2.8, trendDirection: "up" },
      { id: "k4", label: "Materiais Únicos", value: "10", unit: "", trend: 0, trendDirection: "neutral" },
    ],
    chartType: "bar",
    chartData: [
      { label: "KLB-1032", Vendas: 182400 },
      { label: "KLB-2018", Vendas: 145600 },
      { label: "KLB-3045", Vendas: 98300 },
      { label: "KLB-0812", Vendas: 87200 },
      { label: "KLB-4210", Vendas: 76500 },
    ],
  },
};

// ─── Helper: build a fresh result for an arbitrary question ──────────────────

export function buildGenericResult(id: string, question: string): AnalysisResult {
  const monthlyData: ChartDataPoint[] = [
    { label: "Jan", Realizado: 42000, Planejado: 45000 },
    { label: "Fev", Realizado: 47500, Planejado: 45000 },
    { label: "Mar", Realizado: 51200, Planejado: 48000 },
    { label: "Abr", Realizado: 49800, Planejado: 50000 },
  ];

  return {
    id,
    query: {
      id,
      question,
      timestamp: new Date(),
      status: "done",
      category: "Análise",
    },
    interpretation: {
      originalQuestion: question,
      intent: `Extração e análise de dados relacionados a: ${question}`,
      confidence: 87,
      category: "Análise",
      period: "Últimos 90 dias",
      fields: [
        { name: "Data", sapTable: "MKPF", sapField: "BUDAT", type: "date" },
        { name: "Código", sapTable: "MSEG", sapField: "MATNR", type: "dimension" },
        { name: "Quantidade", sapTable: "MSEG", sapField: "MENGE", type: "measure" },
      ],
      sapTables: ["MKPF", "MSEG", "MARA"],
    },
    script: {
      language: "sql",
      estimatedRows: 524,
      explanation: "Script gerado com base na interpretação semântica da pergunta.",
      code: `-- =====================================================
-- Script Gerado Automaticamente – Klabin Dashboard
-- Análise: ${question}
-- Gerado em: ${new Date().toLocaleDateString("pt-BR")}
-- =====================================================

SELECT
    MKPF.BUDAT   AS data_movimento,
    MSEG.MATNR   AS material,
    MARA.MATKL   AS grupo_material,
    SUM(MSEG.MENGE) AS quantidade,
    MSEG.MEINS      AS unidade
FROM
    MKPF
    INNER JOIN MSEG ON MKPF.MBLNR = MSEG.MBLNR
               AND MKPF.MJAHR = MSEG.MJAHR
    INNER JOIN MARA ON MSEG.MATNR = MARA.MATNR
WHERE
    MKPF.BUDAT >= ADD_MONTHS(SYSDATE, -3)
GROUP BY
    MKPF.BUDAT,
    MSEG.MATNR,
    MARA.MATKL,
    MSEG.MEINS
ORDER BY
    data_movimento DESC;`,
    },
    table: {
      sapSource: "SAP ECC – Módulo MM",
      totalRows: 524,
      columns: ["Data", "Material", "Grupo", "Quantidade", "Unidade"],
      rows: [
        { Data: "01/04/2026", Material: "KLB-1032", Grupo: "ROL", Quantidade: 12400, Unidade: "TON" },
        { Data: "02/04/2026", Material: "KLB-2018", Grupo: "EMB", Quantidade: 8600, Unidade: "TON" },
        { Data: "03/04/2026", Material: "KLB-3045", Grupo: "CRT", Quantidade: 6200, Unidade: "TON" },
        { Data: "04/04/2026", Material: "KLB-0812", Grupo: "ROL", Quantidade: 5900, Unidade: "TON" },
        { Data: "05/04/2026", Material: "KLB-4210", Grupo: "EMB", Quantidade: 4300, Unidade: "TON" },
      ],
    },
    kpis: [
      { id: "k1", label: "Total Registros", value: "524", unit: "", trend: 3.2, trendDirection: "up" },
      { id: "k2", label: "Período Analisado", value: "90", unit: "dias", trend: 0, trendDirection: "neutral" },
      { id: "k3", label: "Confiança IA", value: "87", unit: "%", trend: 0, trendDirection: "neutral" },
      { id: "k4", label: "Tabelas SAP", value: "3", unit: "", trend: 0, trendDirection: "neutral" },
    ],
    chartType: "line",
    chartData: monthlyData,
  };
}
