"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import type { AnalysisResult, ChartDataPoint } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/shared/KPICard";
import { DataTableView } from "./DataTableView";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart2, LineChart as LineIcon, PieChart as PieIcon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type ChartMode = "bar" | "line" | "pie";

// ─── X-Axis tick customizado ─────────────────────────────────────────────────
// Renderiza sempre o label (interval={0}), trunca se necessário e expõe o
// texto completo via <title> do SVG (tooltip nativo on-hover, sem lib extra).
// Quando `angled=true`, rotaciona -40° para evitar sobreposição em séries longas.
function XAxisTick({
  x = 0,
  y = 0,
  payload,
  angled = false,
  maxLen = 20,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  angled?: boolean;
  maxLen?: number;
}) {
  if (!payload?.value) return null;
  const full = String(payload.value);
  const display = full.length > maxLen ? full.slice(0, maxLen - 1) + "…" : full;

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{full}</title>
      <text
        transform={angled ? "rotate(-40)" : undefined}
        textAnchor={angled ? "end" : "middle"}
        dx={angled ? -4 : 0}
        dy={angled ? 4 : 16}
        fill="#888"
        fontSize={11}
      >
        {display}
      </text>
    </g>
  );
}

const COLORS = [
  "#C25A14",  // laranja brand
  "#0F4E5C",  // teal escuro (accent)
  "#D4940A",  // âmbar
  "#4E8A18",  // verde-oliva
  "#2C64AA",  // azul ardósia
  "#6244AA",  // púrpura
  "#AA3C7A",  // rosa-ameixa
  "#9A3020",  // tijolo escuro
  "#7A8A14",  // oliva-amarelado
  "#1C8A52",  // esmeralda
  "#1A7472",  // teal-seafoam
  "#245C9E",  // azul-cerúleo
  "#3C3CAA",  // índigo
  "#7632AA",  // uva
  "#9C3C8A",  // orquídea
  "#2A7A4C",  // verde-floresta
  "#C03C34",  // vermelho-tomate
  "#C47C14",  // dourado-âmbar
  "#1C4A82",  // azul-marinho
  "#6C3EAA",  // violeta
];

// ─── Pie tooltip ──────────────────────────────────────────────────────────────

interface PieTooltipEntry {
  name: string;
  value: number;
  payload: { name: string; value: number; originalLabel?: string };
}

interface PieTooltipProps {
  active?: boolean;
  payload?: PieTooltipEntry[];
  total?: number;
}

function PieTooltip({ active, payload, total = 0 }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: data } = payload[0];
  const originalLabel = data?.originalLabel;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";

  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-3.5 py-3 text-xs max-w-[240px] space-y-1.5">
      <p className="font-semibold text-foreground text-sm truncate" title={name}>
        {name}
      </p>
      {originalLabel && (
        <p className="text-muted-foreground">
          Código SAP:{" "}
          <span className="font-mono text-foreground/70">{originalLabel}</span>
        </p>
      )}
      <div className="border-t border-border pt-1.5 space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Valor</span>
          <span className="font-medium text-foreground tabular-nums">
            {Number(value).toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Participação</span>
          <span className="font-medium text-foreground">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Pie label ────────────────────────────────────────────────────────────────

// Definido fora do componente: referência estável entre renders, sem flickering
const RADIAN = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  if ((percent ?? 0) < 0.01) return null;
  const radius = (outerRadius as number) + 22;
  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN);
  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN);
  const pct = (percent as number) * 100;
  const label = pct < 5 ? pct.toFixed(1) + "%" : Math.round(pct) + "%";
  return (
    <text
      x={x}
      y={y}
      fill="#888"
      textAnchor={x > (cx as number) ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
    >
      {label}
    </text>
  );
}

interface VisualizationViewProps {
  result: AnalysisResult;
}

export function VisualizationView({ result }: VisualizationViewProps) {
  const [chartMode, setChartMode] = useState<ChartMode>(
    result.chartType === "line" ? "line" : "bar"
  );
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const kpis = result.kpis ?? [];

  const rawChartData = Array.isArray(result.chartData) ? result.chartData : [];

  // Fallback: se o backend não enviou chart_data, deriva da tabela
  const chartData: ChartDataPoint[] = rawChartData.length > 0
    ? rawChartData
    : (() => {
        const { columns, rows } = result.table;
        if (!rows.length) return [];
        const numericCols = columns.filter((col) =>
          rows.some((r) => typeof r[col] === "number")
        );
        const labelCol = columns.find((col) => !numericCols.includes(col));
        if (!labelCol || !numericCols.length) return [];
        return rows.map((row) => {
          const point: ChartDataPoint = { label: String(row[labelCol] ?? "") };
          numericCols.forEach((col) => { point[col] = Number(row[col] ?? 0); });
          return point;
        });
      })();

  // "originalLabel" guarda o ID SAP original — não é série numérica
  const seriesKeys = chartData.length
    ? Object.keys(chartData[0]).filter(
        (k) => k !== "label" && k !== "originalLabel"
      )
    : [];

  const seriesSum = (key: string) =>
    chartData.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);

  const sums = seriesKeys.map((k) => seriesSum(k));
  const maxSum = sums.length ? Math.max(...sums) : 0;
  const minSum = sums.length ? Math.min(...sums) : 0;
  const incompatible = sums.length > 1 && minSum > 0 && maxSum / minSum > 100;

  const visibleKeys = incompatible
    ? [seriesKeys[sums.indexOf(maxSum)]]
    : seriesKeys;
  const omittedKeys = incompatible
    ? seriesKeys.filter((k) => k !== visibleKeys[0])
    : [];

  const pieData = chartData.map((d) => ({
    name: String(d.label ?? ""),
    value: Number(d[visibleKeys[0]] ?? 0),
    originalLabel: d.originalLabel, // SAP ID when label was resolved to a name
  }));
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // ── Computed X-axis settings ───────────────────────────────────────────────
  // Heurística: soma de (n_itens × comprimento_médio × px_por_char) vs. largura
  // estimada do container. Se ultrapassar 500 px, labels são inclinados para
  // evitar sobreposição. Todos os ticks são forçados via interval={0}.
  const avgLabelLen = chartData.length
    ? chartData.reduce((s, d) => s + String(d.label ?? "").length, 0) / chartData.length
    : 0;
  const needsAngle = chartData.length * avgLabelLen * 7 > 500;
  const xMaxLen = needsAngle ? 20 : Math.max(8, Math.floor(80 / Math.max(chartData.length, 1)));
  const xHeight = needsAngle ? 88 : 30;

  return (
    <div className="space-y-5 relative">
      {/* Gradient mesh for glassmorphism depth */}
      <div
        className="absolute -inset-6 -z-10 rounded-3xl pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 80% 50% at 20% 30%, oklch(0.52 0.10 42 / 0.12) 0%, transparent 60%), " +
              "radial-gradient(ellipse 60% 40% at 80% 70%, oklch(0.45 0.08 200 / 0.10) 0%, transparent 60%)"
            : "radial-gradient(ellipse 80% 50% at 20% 30%, oklch(0.93 0.05 50 / 0.35) 0%, transparent 60%), " +
              "radial-gradient(ellipse 60% 40% at 80% 70%, oklch(0.86 0.07 200 / 0.18) 0%, transparent 60%)",
        }}
      />

      {/* KPI grid — staggered entrance */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi, index) => (
            <KPICard key={`${kpi.id}-${index}`} kpi={kpi} delay={index * 80} />
          ))}
        </div>
      )}

      {/* Chart card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card className="border border-border shadow-sm bg-[var(--color-bg-a1)] rounded-2xl">
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">
              Visualização gráfica
            </CardTitle>
            {/* Chart type switcher */}
            <div className="flex gap-1 p-0.5 bg-[var(--color-bg-a3)] rounded-xl border border-border">
              {(
                [
                  { mode: "bar" as ChartMode, Icon: BarChart2 },
                  { mode: "line" as ChartMode, Icon: LineIcon },
                  { mode: "pie" as ChartMode, Icon: PieIcon },
                ] as const
              ).map(({ mode, Icon }) => (
                <motion.button
                  key={mode}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setChartMode(mode)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    chartMode === mode
                      ? "bg-background shadow-sm text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-4 pb-3">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 h-[280px] text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Sem dados para visualização gráfica.
                </p>
              </div>
            ) : chartMode === "pie" ? (
              <>
                {/* SVG do donut sem Legend interna — evita sobreposição */}
                <ResponsiveContainer width="100%" height={268}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {chartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          stroke={isDark ? "#1a1a1a" : "#fff"}
                          strokeWidth={0.5}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip total={pieTotal} />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend JSX externo — separado do SVG, sem risco de overlap */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center px-4 pt-3 pb-1 border-t border-border mt-1">
                  {pieData.map((entry, i) => (
                    <div
                      key={`pie-legend-${i}`}
                      className="flex items-center gap-1.5 min-w-0"
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span
                        className="text-xs text-muted-foreground truncate max-w-[110px]"
                        title={entry.name}
                      >
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                {chartMode === "bar" ? (
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#2d2d2d" : "#f0f0f0"} />
                    <XAxis
                      dataKey="label"
                      interval={0}
                      height={xHeight}
                      tick={(p) => (
                        <XAxisTick
                          x={Number(p.x)} y={Number(p.y)} payload={p.payload}
                          angled={needsAngle} maxLen={xMaxLen}
                        />
                      )}
                    />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 10,
                        boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.40)" : "0 4px 24px rgba(0,0,0,0.10)",
                        background: isDark ? "#1e1e1e" : "#fff",
                        border: isDark ? "1px solid #2d2d2d" : "1px solid #e5e7eb",
                        color: isDark ? "#ededed" : "#111",
                      }}
                      formatter={(v) =>
                        v != null ? Number(v).toLocaleString("pt-BR") : ""
                      }
                    />
                    <Legend
                      verticalAlign={needsAngle ? "top" : "bottom"}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    {visibleKeys.map((key, i) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={COLORS[i % COLORS.length]}
                        radius={[5, 5, 0, 0]}
                        animationDuration={1100}
                        animationBegin={i * 120}
                        animationEasing="ease-out"
                      />
                    ))}
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#2d2d2d" : "#f0f0f0"} />
                    <XAxis
                      dataKey="label"
                      interval={0}
                      height={xHeight}
                      tick={(p) => (
                        <XAxisTick
                          x={Number(p.x)} y={Number(p.y)} payload={p.payload}
                          angled={needsAngle} maxLen={xMaxLen}
                        />
                      )}
                    />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 10,
                        boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.40)" : "0 4px 24px rgba(0,0,0,0.10)",
                        background: isDark ? "#1e1e1e" : "#fff",
                        border: isDark ? "1px solid #2d2d2d" : "1px solid #e5e7eb",
                        color: isDark ? "#ededed" : "#111",
                      }}
                      formatter={(v) =>
                        v != null ? Number(v).toLocaleString("pt-BR") : ""
                      }
                    />
                    <Legend
                      verticalAlign={needsAngle ? "top" : "bottom"}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    {visibleKeys.map((key, i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          fill: COLORS[i % COLORS.length],
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 6 }}
                        animationDuration={1400}
                        animationBegin={i * 100}
                        animationEasing="ease-out"
                      />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {omittedKeys.length > 0 && (
        <p className="text-xs text-muted-foreground -mt-2 px-1">
          Exibindo apenas{" "}
          <span className="font-medium text-gray-500">{visibleKeys[0]}</span> —{" "}
          séries com escalas muito diferentes foram omitidas para melhor
          visualização.
        </p>
      )}

      {/* Data table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <DataTableView table={result.table} />
      </motion.div>
    </div>
  );
}
