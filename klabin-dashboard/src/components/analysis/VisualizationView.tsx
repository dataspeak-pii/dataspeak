"use client";

import { useState } from "react";
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
  "#16a34a", "#2563eb", "#9333ea", "#ea580c", "#0891b2",
  "#ca8a04", "#dc2626", "#7c3aed",
];

interface VisualizationViewProps {
  result: AnalysisResult;
}

export function VisualizationView({ result }: VisualizationViewProps) {
  const [chartMode, setChartMode] = useState<ChartMode>(
    result.chartType === "line" ? "line" : "bar"
  );

  const seriesKeys = result.chartData.length
    ? Object.keys(result.chartData[0]).filter((k) => k !== "label")
    : [];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {result.kpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Chart card */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Visualização gráfica
          </CardTitle>
          {/* Chart type switcher */}
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
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
                    ? "bg-white shadow-sm text-green-600"
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
              <BarChart data={result.chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {seriesKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            ) : chartMode === "line" ? (
              <LineChart data={result.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {seriesKeys.map((key, i) => (
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
                  data={result.chartData.map((d) => ({
                    name: d.label,
                    value: Number(d[seriesKeys[0]] ?? 0),
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
                  {result.chartData.map((_, i) => (
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

      {/* Data table */}
      <DataTableView table={result.table} />
    </div>
  );
}
