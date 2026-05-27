"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import type { AnalysisInterpretation } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Database, Calendar, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterpretationViewProps {
  data: AnalysisInterpretation;
}

const fieldTypeStyle: Record<string, string> = {
  date:      "bg-cat-date-bg text-cat-date border-accent-200",
  dimension: "bg-cat-dimension-bg text-cat-dimension border-neutral-300",
  measure:   "bg-cat-measure-bg text-cat-measure border-brand-200",
};

const fieldTypeLabel: Record<string, string> = {
  date:      "Data",
  dimension: "Dimensão",
  measure:   "Medida",
};

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function InterpretationView({ data }: InterpretationViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="space-y-4 relative">
      {/* Gradient mesh for depth */}
      <div
        className="absolute -inset-6 -z-10 rounded-3xl pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 70% 50% at 15% 40%, oklch(0.52 0.10 42 / 0.10) 0%, transparent 55%), " +
              "radial-gradient(ellipse 55% 45% at 85% 60%, oklch(0.45 0.08 200 / 0.08) 0%, transparent 55%)"
            : "radial-gradient(ellipse 70% 50% at 15% 40%, oklch(0.93 0.05 50 / 0.30) 0%, transparent 55%), " +
              "radial-gradient(ellipse 55% 45% at 85% 60%, oklch(0.97 0.02 200 / 0.22) 0%, transparent 55%)",
        }}
      />

      {/* Intent card */}
      <motion.div
        variants={CARD_VARIANTS}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <Card className="border border-border shadow-sm bg-[var(--color-bg-a1)] rounded-2xl">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-accent-50 dark:bg-accent-950/50 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-accent-700 dark:text-accent-300" />
              </div>
              Interpretação da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Original question */}
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                Pergunta original
              </p>
              <p className="text-sm text-foreground font-medium bg-[var(--color-bg-a2)] px-3 py-2 rounded-xl border border-border">
                &ldquo;{data.originalQuestion}&rdquo;
              </p>
            </div>

            {/* Intent */}
            {data.intent && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                  Intenção identificada
                </p>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80">{data.intent}</p>
                </div>
              </div>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap gap-3">
              {data.category && (
                <div className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <Target className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{data.category}</span>
                </div>
              )}
              {data.period && (
                <div className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{data.period}</span>
                </div>
              )}

              {/* Confidence bar */}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Confiança</span>
                <div className="flex items-center gap-1">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                      initial={{ width: 0 }}
                      animate={{ width: `${data.confidence}%` }}
                      transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-brand-600">
                    {data.confidence}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fields table */}
      <motion.div
        variants={CARD_VARIANTS}
        initial="hidden"
        animate="visible"
        custom={0.12}
      >
        <Card className="border border-border shadow-sm bg-[var(--color-bg-a1)] rounded-2xl">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-accent-50 dark:bg-accent-950/50 flex items-center justify-center">
                <Database className="w-3.5 h-3.5 text-accent-700 dark:text-accent-300" />
              </div>
              Campos e tabelas SAP identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {data.sapTables.map((t) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge variant="secondary" className="font-mono text-xs rounded-md">
                    {t}
                  </Badge>
                </motion.span>
              ))}
            </div>

            {data.fields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Campo</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Tabela SAP</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Campo SAP</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fields.map((f, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: 0.18 + i * 0.05 }}
                        className="border-b border-border/50 hover:bg-brand-50/30 dark:hover:bg-brand-900/20 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-foreground font-medium">{f.name}</td>
                        <td className="py-2.5 px-3">
                          <code className="bg-[var(--color-bg-a3)] px-1.5 py-0.5 rounded-md text-foreground/70">
                            {f.sapTable}
                          </code>
                        </td>
                        <td className="py-2.5 px-3">
                          <code className="bg-[var(--color-bg-a3)] px-1.5 py-0.5 rounded-md text-foreground/70">
                            {f.sapField}
                          </code>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-medium border",
                              fieldTypeStyle[f.type]
                            )}
                          >
                            {fieldTypeLabel[f.type]}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : data.sapTables.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-3">
                Nenhum campo ou tabela SAP identificado.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
