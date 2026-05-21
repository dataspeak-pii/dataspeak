/**
 * Translates raw DB column names to natural-sounding Portuguese labels.
 * Used by DataTable column headers.
 *
 * KPI card labels come pre-formatted from the backend (analytics.py)
 * and are displayed as-is — this formatter is for table column headers only.
 *
 * Strategy:
 *   1. Exact match in COLUMN_MAP (highest priority)
 *   2. Split by "_", map each token via WORD_MAP, then join with smart
 *      preposition insertion: adjective tokens attach directly (no "de"),
 *      nouns/unknown tokens get "de" before them.
 */

// ─── Exact-match overrides ────────────────────────────────────────────────────
// Use for patterns where token-level join would produce wrong results.
const COLUMN_MAP: Record<string, string> = {
  nota_fiscal: "Nota Fiscal",
  centro_custo: "Centro de Custo",
  centro_distribuicao: "Centro de Distribuição",
  preco_medio: "Preço Médio",
  preco_unitario: "Preço Unitário",
  valor_unitario: "Valor Unitário",
  data_lancamento: "Data de Lançamento",
  data_entrega: "Data de Entrega",
  data_criacao: "Data de Criação",
  data_modificacao: "Data de Modificação",
};

// ─── Word-level token dictionary ──────────────────────────────────────────────
const WORD_MAP: Record<string, string> = {
  // Quantities
  qtd: "Quantidade",
  qnt: "Quantidade",
  qty: "Quantidade",

  // Numbers / codes
  nr: "Nº",
  num: "Nº",
  nro: "Nº",
  no: "Nº",
  cod: "Código",
  id: "ID",
  ref: "Referência",

  // Descriptions
  desc: "Descrição",
  descricao: "Descrição",
  obs: "Observação",

  // Financial
  val: "Valor",
  valor: "Valor",
  prc: "Preço",
  preco: "Preço",
  rec: "Receita",
  receita: "Receita",
  cst: "Custo",
  custo: "Custo",
  fat: "Faturamento",
  marg: "Margem",

  // Time
  dt: "Data",
  data: "Data",
  dat: "Data",
  mes: "Mês",
  ano: "Ano",
  per: "Período",
  periodo: "Período",

  // SAP / Materials
  mat: "Material",
  material: "Material",
  materiais: "Materiais",
  grp: "Grupo",
  grupo: "Grupo",
  lote: "Lote",

  // Units
  un: "Unid.",
  unid: "Unid.",
  unidade: "Unidade",

  // Inventory
  est: "Estoque",
  estoque: "Estoque",
  livre: "Livre",
  blq: "Bloqueado",
  bloqueado: "Bloqueado",
  reservado: "Reservado",

  // Organization
  plnt: "Planta",
  planta: "Planta",
  dep: "Depósito",
  deposito: "Depósito",
  centro: "Centro",
  dist: "Distribuição",
  linha: "Linha",
  turno: "Turno",
  setor: "Setor",

  // Parties
  forn: "Fornecedor",
  fornecedor: "Fornecedor",
  cli: "Cliente",
  cliente: "Cliente",

  // Documents
  ped: "Pedido",
  pedido: "Pedido",
  nf: "NF",
  nota: "Nota",
  ordem: "Ordem",

  // Types
  tp: "Tipo",
  tipo: "Tipo",
  cat: "Categoria",
  categoria: "Categoria",
  status: "Status",
  classe: "Classe",

  // Operations
  prod: "Produção",
  producao: "Produção",
  vnd: "Venda",
  venda: "Venda",
  vendas: "Vendas",
  compra: "Compra",

  // Stats
  tot: "Total",
  total: "Total",
  med: "Média",
  media: "Média",
  avg: "Média",
  max: "Máximo",
  min: "Mínimo",
  cnt: "Contagem",
  pct: "Percentual",
  perc: "Percentual",
  efic: "Eficiência",
  eficiencia: "Eficiência",
  qual: "Qualidade",
  qualidade: "Qualidade",

  // Misc
  info: "Info",
  medio: "Médio",
  unitario: "Unitário",
  planejado: "Planejado",
  realizado: "Realizado",
};

// ─── Adjective tokens ─────────────────────────────────────────────────────────
// These attach to the preceding word WITHOUT "de" (e.g. "Estoque Livre",
// not "Estoque de Livre"). Covers: states, qualifiers, past participles.
const ADJECTIVE_TOKENS = new Set([
  // Amounts / qualifiers
  "total", "parcial", "bruto", "líquido", "liquido",
  // Past participles & states
  "livre", "bloqueado", "bloqueada", "reservado", "reservada",
  "ativo", "ativa", "inativo", "inativa",
  "aprovado", "aprovada", "cancelado", "cancelada",
  "produzido", "produzida", "vendido", "vendida",
  "consumido", "consumida", "entregue", "faturado", "faturada",
  "planejado", "planejada", "realizado", "realizada",
  // Descriptive adjectives
  "unitário", "unitária", "médio", "média",
  "mínimo", "máximo",
  "fiscal", "social", "nacional", "regional", "local",
  "anual", "mensal", "semanal",
  "comercial", "industrial", "financeiro", "financeira",
]);

// ─── Natural join ─────────────────────────────────────────────────────────────
// Joins translated tokens inserting "de" before nouns and nothing before adj.
function joinNaturally(tokens: string[]): string {
  return tokens.reduce((acc, token, i) => {
    if (i === 0) return token;
    // Strip trailing punctuation (e.g. "Nº", "Unid.") before set lookup
    const bare = token.toLowerCase().replace(/[.\-#º]/g, "").trim();
    return ADJECTIVE_TOKENS.has(bare) ? `${acc} ${token}` : `${acc} de ${token}`;
  }, "");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Translates a raw DB column name (snake_case) to a human-readable label. */
export function formatColumnLabel(col: string): string {
  const key = col.toLowerCase().replace(/\s+/g, "_");

  if (COLUMN_MAP[key]) return COLUMN_MAP[key];

  const tokens = key
    .split("_")
    .filter(Boolean)
    .map((word) => WORD_MAP[word] ?? word.charAt(0).toUpperCase() + word.slice(1));

  return joinNaturally(tokens);
}

