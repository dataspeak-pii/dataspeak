import type { KPI } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  kpi: KPI;
}

export function KPICard({ kpi }: KPICardProps) {
  const isUp = kpi.trendDirection === "up";
  const isDown = kpi.trendDirection === "down";

  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
          {kpi.label}
        </p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
            {kpi.unit && (
              <span className="text-sm text-gray-500 ml-1">{kpi.unit}</span>
            )}
          </div>

          {kpi.trend !== 0 && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-sm font-medium px-2 py-1 rounded-lg",
                isUp && "text-green-700 bg-green-50",
                isDown && "text-red-600 bg-red-50"
              )}
            >
              {isUp && <TrendingUp className="w-3.5 h-3.5" />}
              {isDown && <TrendingDown className="w-3.5 h-3.5" />}
              {!isUp && !isDown && <Minus className="w-3.5 h-3.5 text-gray-400" />}
              <span>{Math.abs(kpi.trend)}%</span>
            </div>
          )}
        </div>
        {kpi.trend !== 0 && (
          <p className="text-[11px] text-gray-400 mt-1">vs. período anterior</p>
        )}
      </CardContent>
    </Card>
  );
}
