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
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {result.kpis.map((kpi, index) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.06 }}
          >
            <KPICard kpi={kpi} />
          </motion.div>
        ))}
      </div>

      {/* Chart card */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Visualização gráfica
          </CardTitle>
          {/* Chart type switcher */}
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            {(
              [
                { mode: "bar" as ChartMode, Icon: BarChart2 },
                { mode: "line" as ChartMode, Icon: LineIcon },
                { mode: "pie" as ChartMode, Icon: PieIcon },
              ] as const
            ).map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  chartMode === mode
                    ? "bg-background shadow-sm text-brand-700"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
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
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {visibleKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            ) : chartMode === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {visibleKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
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
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {omittedKeys.length > 0 && (
        <p className="text-xs text-gray-400 -mt-2 px-1">
          Exibindo apenas <span className="font-medium text-gray-500">{visibleKeys[0]}</span> —{" "}
          séries com escalas muito diferentes foram omitidas para melhor visualização.
        </p>
      )}

      {/* Data table */}
      <DataTableView table={result.table} />
    </div>
  );
}
