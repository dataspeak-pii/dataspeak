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

const formatLabel = (label: string) =>
  label
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b(total|média|distintos)\b/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());

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
      className="relative rounded-xl overflow-hidden cursor-default"
    >
      {/* Glassmorphism base */}
      <div className="glass-card rounded-xl shadow-sm hover:shadow-lg hover:shadow-brand-500/10 transition-shadow duration-300">
        {/* Subtle inner gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-brand-50/20 pointer-events-none rounded-xl" />

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
