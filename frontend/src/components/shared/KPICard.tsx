import type { KPI } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  kpi: KPI;
}

const formatLabel = (label: string) =>
  label
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b(total|média|distintos)\b/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());

const formatValue = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(num);
  if (Number.isInteger(num)) return new Intl.NumberFormat("pt-BR").format(num);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(num);
};

export function KPICard({ kpi }: KPICardProps) {
  const isUp = kpi.trendDirection === "up";
  const isDown = kpi.trendDirection === "down";
  const hasTrend =
    typeof kpi.trend === "number" && !isNaN(kpi.trend) && kpi.trend !== 0;

  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
          {formatLabel(kpi.label)}
        </p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-2xl font-bold text-foreground">{formatValue(kpi.value)}</span>
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
      </CardContent>
    </Card>
  );
}
