"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { KPI } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  kpi: KPI;
  delay?: number;
}

const formatLabel = (label: string): string => {
  const dict: Record<string, string> = {
    // Abreviações SAP comuns
    QTD: "Quantidade", QTDE: "Quantidade", QT: "Quantidade",
    VLR: "Valor", VAL: "Valor",
    TOT: "Total", MED: "Média", AVG: "Média", SUM: "Total",
    CNT: "Contagem", COUNT: "Contagem",
    DIST: "Distintos", DISTINTOS: "Distintos",
    MIN: "Mínimo", MAX: "Máximo",
    PCT: "Percentual", PERC: "Percentual",
    NUM: "Número", NR: "Número",
    DT: "Data", DAT: "Data",
    MAT: "Material", MATNR: "Material", MAKTX: "Descrição do Material",
    WERKS: "Planta", BUKRS: "Empresa", KUNNR: "Cliente",
    LIFNR: "Fornecedor", VBELN: "Pedido", AUFNR: "Ordem",
    NET: "Líquido", NETWR: "Valor Líquido",
    MENGE: "Quantidade", DMBTR: "Valor", WAERS: "Moeda",
    LAND: "País", ORT: "Cidade", NAME: "Nome",
    // Palavras completas (para labels já parcialmente humanizados)
    MEDIA: "Média", TOTAL: "Total", VALOR: "Valor",
    QUANTIDADE: "Quantidade", VENDAS: "Vendas", VENDA: "Venda",
    COMPRAS: "Compras", COMPRA: "Compra",
    PRODUCAO: "Produção", ESTOQUE: "Estoque",
    PEDIDOS: "Pedidos", PEDIDO: "Pedido",
    ORDENS: "Ordens", ORDEM: "Ordem",
    MATERIAIS: "Materiais", MATERIAL: "Material",
    CLIENTES: "Clientes", CLIENTE: "Cliente",
    FORNECEDORES: "Fornecedores", FORNECEDOR: "Fornecedor",
    PLANTAS: "Plantas", PLANTA: "Planta",
    PERCENTUAL: "Percentual", REALIZADO: "Realizado",
    PLANEJADO: "Planejado", LIVRE: "Livre",
    BLOQUEADO: "Bloqueado", TRANSFERENCIA: "Transferência",
    DEPOSITO: "Depósito", CENTRO: "Centro",
    DISTRIBUICAO: "Distribuição", REGIAO: "Região",
    LIQUIDO: "Líquido", BRUTO: "Bruto",
    MINIMO: "Mínimo", MAXIMO: "Máximo", MEDIO: "Médio",
  };

  const prepositions = new Set([
    "de", "do", "da", "dos", "das",
    "por", "para", "em", "no", "na", "nos", "nas", "e", "a", "o",
  ]);

  // [palavraAnterior, palavraSeguinte, conectivo]
  // conectivo "" → sem separador (ex: "Valor Total")
  // conectivo "do" → artigo já contraído (ex: "Média do Valor")
  const connectives: Array<[string, string, string]> = [
    ["média",      "valor",      "do"],
    ["média",      "quantidade", "de"],
    ["média",      "percentual", "de"],
    ["média",      "total",      "do"],
    ["média",      "contagem",   "de"],
    ["média",      "número",     "de"],
    ["média",      "mínimo",     "do"],
    ["média",      "máximo",     "do"],
    ["total",      "valor",      "de"],
    ["total",      "quantidade", "de"],
    ["total",      "pedidos",    "de"],
    ["total",      "ordens",     "de"],
    ["total",      "vendas",     "de"],
    ["total",      "compras",    "de"],
    ["total",      "materiais",  "de"],
    ["total",      "produção",   "de"],
    ["total",      "estoque",    "de"],
    ["contagem",   "pedidos",    "de"],
    ["contagem",   "ordens",     "de"],
    ["contagem",   "clientes",   "de"],
    ["contagem",   "materiais",  "de"],
    ["número",     "pedidos",    "de"],
    ["número",     "ordens",     "de"],
    ["valor",      "total",      ""],
    ["valor",      "líquido",    ""],
    ["valor",      "bruto",      ""],
    ["valor",      "vendas",     "de"],
    ["valor",      "compras",    "de"],
    ["valor",      "pedidos",    "de"],
    ["quantidade", "vendida",    ""],
    ["quantidade", "produzida",  ""],
    ["quantidade", "planejada",  ""],
    ["quantidade", "vendas",     "de"],
    ["quantidade", "materiais",  "de"],
    ["percentual", "realizado",  ""],
    ["percentual", "planejado",  ""],
    ["vendas",     "total",      ""],
    ["vendas",     "líquido",    ""],
    ["estoque",    "livre",      ""],
    ["estoque",    "bloqueado",  ""],
    ["estoque",    "transferência", "em"],
    ["distintos",  "cliente",    "de"],
    ["distintos",  "clientes",   "de"],
    ["distintos",  "material",   "de"],
    ["distintos",  "materiais",  "de"],
    ["distintos",  "planta",     "de"],
    ["distintos",  "plantas",    "de"],
    ["distintos",  "país",       "de"],
    ["distintos",  "moeda",      "de"],
    ["distintos",  "depósito",   "de"],
    ["distintos",  "região",     "de"],
    ["distintos",  "unidade",    "de"],
  ];

  // Usada APENAS no fallback genérico — contrai "de"/"em" com artigo por gênero/número
  const feminine = new Set([
    "quantidade", "média", "ordem", "ordens", "venda", "vendas",
    "compra", "compras", "produção", "transferência", "região",
    "distribuição", "unidade", "moeda", "planta", "plantas",
  ]);
  const pluralWords = new Set([
    "vendas", "compras", "ordens", "pedidos", "materiais",
    "clientes", "fornecedores", "plantas", "unidades",
  ]);
  const contractPrep = (prep: string, nextWord: string): string => {
    if (prep !== "de" && prep !== "em") return prep;
    const nw = nextWord.toLowerCase();
    const isFem = feminine.has(nw);
    const isPlur = pluralWords.has(nw);
    if (prep === "de") {
      if (isPlur && isFem) return "das";
      if (isPlur) return "dos";
      if (isFem) return "da";
      return "do";
    }
    if (isPlur && isFem) return "nas";
    if (isPlur) return "nos";
    if (isFem) return "na";
    return "no";
  };

  // 1. Separar por underscore e espaços
  const parts = label.split(/[_\s]+/).filter(Boolean);

  // 2. Expandir via dicionário (lookup em UPPERCASE)
  const expanded = parts.map((part) => {
    const up = part.toUpperCase();
    return dict[up] ?? (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
  });

  // 3. Remover todas as preposições do label original — serão reinseridas pelas regras
  const words = expanded.filter((w) => !prepositions.has(w.toLowerCase()));

  // 4. Inserir conectivos entre pares de palavras adjacentes
  const METRICS = new Set(["total","média","contagem","número","mínimo","máximo","distintos","percentual"]);
  const MODIFIERS = new Set(["total","média","mínimo","máximo","médio","líquido","bruto","livre","bloqueado","realizado","planejado","distintos"]);

  const result: string[] = [];
  for (let i = 0; i < words.length; i++) {
    result.push(words[i]);
    if (i < words.length - 1) {
      const curr = words[i].toLowerCase();
      const next = words[i + 1].toLowerCase();
      const rule = connectives.find(([a, b]) => a === curr && b === next);
      if (rule) {
        // Bug fix: usa o prep da regra DIRETAMENTE, sem contractPrep
        // (contractPrep só para fallback genérico abaixo)
        if (rule[2]) result.push(rule[2]);
      } else if (METRICS.has(curr) && !MODIFIERS.has(next)) {
        // Fallback genérico: métrica + substantivo → "de" contraído por gênero
        result.push(contractPrep("de", next));
      }
    }
  }

  // 5. Capitalizar — preposições em minúsculo exceto na posição 0
  const prepsLc = new Set(["de","do","da","dos","das","por","em","no","na","nos","nas","e","a","o"]);
  return result
    .map((w, i) => {
      const lc = w.toLowerCase();
      if (i > 0 && prepsLc.has(lc)) return lc;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
};

const formatValue = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return value;
  if (num >= 1_000_000)
    return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(num);
  if (Number.isInteger(num)) return new Intl.NumberFormat("pt-BR").format(num);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(num);
};

function useCountUp(target: number, duration = 900, delay = 0) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let rafId: number;
    let startTime: number | null = null;

    const delayTimer = setTimeout(() => {
      const tick = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(target * eased);
        if (progress < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      cancelAnimationFrame(rafId);
    };
  }, [target, duration, delay]);

  return current;
}

export function KPICard({ kpi, delay = 0 }: KPICardProps) {
  const isUp = kpi.trendDirection === "up";
  const isDown = kpi.trendDirection === "down";
  const hasTrend =
    typeof kpi.trend === "number" && !isNaN(kpi.trend) && kpi.trend !== 0;

  const numericTarget =
    typeof kpi.value === "number"
      ? kpi.value
      : parseFloat(String(kpi.value));
  const isNumeric = !isNaN(numericTarget);

  const animated = useCountUp(isNumeric ? numericTarget : 0, 1000, delay);

  const displayValue = isNumeric
    ? Number.isInteger(numericTarget)
      ? formatValue(Math.round(animated))
      : formatValue(animated)
    : formatValue(kpi.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: delay / 1000, ease: "easeOut" }}
      whileHover={{ scale: 1.025, y: -3 }}
      whileTap={{ scale: 0.98 }}
      style={{ willChange: "transform" }}
      className="relative rounded-2xl overflow-hidden cursor-default"
    >
      <div className="bg-[var(--color-bg-a1)] border border-border rounded-2xl shadow-sm hover:shadow-md hover:shadow-brand-500/8 transition-all duration-300">
        <div className="relative p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
            {formatLabel(kpi.label)}
          </p>
          <div className="flex items-end justify-between gap-2">
            <div>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {displayValue}
              </span>
              {kpi.unit && (
                <span className="text-sm text-muted-foreground ml-1">{kpi.unit}</span>
              )}
            </div>

            {hasTrend ? (
              <div
                className={cn(
                  "flex items-center gap-0.5 text-sm font-medium px-2 py-1 rounded-lg",
                  isUp && "text-success bg-success-bg",
                  isDown && "text-danger bg-danger-bg"
                )}
              >
                {isUp && <TrendingUp className="w-3.5 h-3.5" />}
                {isDown && <TrendingDown className="w-3.5 h-3.5" />}
                {!isUp && !isDown && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                <span>{Math.abs(kpi.trend)}%</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground font-medium">—</span>
            )}
          </div>
          {hasTrend && (
            <p className="text-[11px] text-muted-foreground mt-1">vs. período anterior</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
