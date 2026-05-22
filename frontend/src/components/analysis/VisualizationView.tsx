"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { AnalysisResult } from "@/types";
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
import { BarChart2, LineChart as LineIcon, PieChart as PieIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ChartMode = "bar" | "line" | "pie";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

interface VisualizationViewProps {
  result: AnalysisResult;
}

export function VisualizationView({ result }: VisualizationViewProps) {
  const [chartMode, setChartMode] = useState<ChartMode>(
    result.chartType === "line" ? "line" : "bar"
  );

  const chartData = Array.isArray(result.chartData) ? result.chartData : [];

  const seriesKeys = chartData.length
    ? Object.keys(chartData[0]).filter((k) => k !== "label")
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

  return (
    <div className="space-y-5 relative">
      {/* Gradient mesh for glassmorphism depth */}
      <div
        className="absolute -inset-6 -z-10 rounded-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 30%, oklch(0.93 0.05 50 / 0.35) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 40% at 80% 70%, oklch(0.86 0.07 200 / 0.18) 0%, transparent 60%)",
        }}
      />

      {/* KPI grid — staggered entrance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {result.kpis.map((kpi, index) => (
          <KPICard key={kpi.id} kpi={kpi} delay={index * 80} />
        ))}
      </div>

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
                      ? "bg-background shadow-sm text-brand-700"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <ResponsiveContainer width="100%" height={280}>
              {chartMode === "bar" ? (
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
                    formatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
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
              ) : chartMode === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
                    formatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {visibleKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: COLORS[i % COLORS.length], strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6 }}
                      animationDuration={1400}
                      animationBegin={i * 100}
                      animationEasing="ease-out"
                    />
                  ))}
                </LineChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData.map((d) => ({
                      name: d.label,
                      value: Number(d[visibleKeys[0]] ?? 0),
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={105}
                    innerRadius={42}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
                    formatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {omittedKeys.length > 0 && (
        <p className="text-xs text-muted-foreground -mt-2 px-1">
          Exibindo apenas{" "}
          <span className="font-medium text-gray-500">{visibleKeys[0]}</span> —{" "}
          séries com escalas muito diferentes foram omitidas para melhor visualização.
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
