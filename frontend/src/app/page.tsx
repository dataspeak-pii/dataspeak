"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryInput } from "@/components/dashboard/QueryInput";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { useAnalysis } from "@/hooks/useAnalysis";
import { suggestionPrompts } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Database, TrendingUp, BarChart3 } from "lucide-react";
import type { QueryHistoryItem } from "@/types";

const TYPEWRITER_PHRASES = [
  "volume de produção dos últimos 3 meses",
  "vendas por região e produto",
  "estoque atual por material",
  "ordens de fabricação abertas",
  "qualidade de lotes recentes",
];

function useTypewriter(phrases: string[]) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];

    if (paused) {
      const t = setTimeout(() => { setPaused(false); setDeleting(true); }, 2200);
      return () => clearTimeout(t);
    }

    const speed = deleting ? 28 : 48;
    const t = setTimeout(() => {
      if (!deleting) {
        const next = charIdx + 1;
        setCharIdx(next);
        if (next === current.length) setPaused(true);
      } else {
        const next = charIdx - 1;
        setCharIdx(next);
        if (next === 0) {
          setDeleting(false);
          setPhraseIdx((i) => (i + 1) % phrases.length);
        }
      }
    }, speed);

    return () => clearTimeout(t);
  }, [charIdx, deleting, paused, phraseIdx, phrases]);

  return phrases[phraseIdx].slice(0, charIdx);
}

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.52 0.18 38) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/70" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[480px] bg-brand-500/[0.05] rounded-full blur-3xl" />
      <div className="absolute top-2/3 left-1/4 w-[360px] h-[260px] bg-accent-500/[0.04] rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 w-[280px] h-[200px] bg-brand-300/[0.03] rounded-full blur-2xl" />
    </div>
  );
}

const FEATURE_PILLS = [
  { icon: Database,   label: "150+ Tabelas SAP" },
  { icon: BarChart3,  label: "Visualização automática" },
  { icon: TrendingUp, label: "Análise em segundos" },
] as const;

export default function HomePage() {
  const { status, result, errorMessage, history, runAnalysis, restoreFromHistory } = useAnalysis();
  const [lastQuestion, setLastQuestion] = useState<string>("");
  const typewriter = useTypewriter(TYPEWRITER_PHRASES);
  const isIdle = status === "idle";

  const handleSubmit = (q: string) => {
    setLastQuestion(q);
    runAnalysis(q);
  };

  const handleHistorySelect = (item: QueryHistoryItem) => {
    restoreFromHistory(item);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        history={history}
        onSelectHistory={handleHistorySelect}
        activeId={result?.id}
      />

      <main className="flex-1 overflow-y-auto relative">
        {/* ── IDLE HERO ── */}
        <AnimatePresence initial={false}>
          {isIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.99, y: -12 }}
              transition={{ duration: 0.28 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10"
            >
              <GridBackground />

              <div className="relative w-full max-w-4xl z-10">
                {/* Live badge */}
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="flex justify-center mb-6"
                >
                  <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
                    </span>
                    <Sparkles className="w-3.5 h-3.5" />
                    Powered by IA · Dados SAP simulados
                  </div>
                </motion.div>

                {/* Heading */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="text-center mb-3"
                >
                  <h1 className="text-[2.6rem] leading-tight font-bold tracking-tight mb-4 gradient-heading">
                    O que você quer analisar hoje?
                  </h1>

                  {/* Typewriter subtitle */}
                  <p className="text-sm text-muted-foreground max-w-md mx-auto h-6">
                    Ex:{" "}
                    <span className="text-brand-700 font-medium">
                      {typewriter}
                      <span className="inline-block w-[2px] h-[13px] bg-brand-600 ml-px align-middle animate-[blink_1s_step-end_infinite]" />
                    </span>
                  </p>
                </motion.div>

                {/* Feature pills */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="flex items-center justify-center gap-2 mb-8 flex-wrap"
                >
                  {FEATURE_PILLS.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/80 border border-border/60 px-2.5 py-1 rounded-full"
                    >
                      <Icon className="w-3 h-3 text-brand-500" />
                      {label}
                    </div>
                  ))}
                </motion.div>

                {/* Query input */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <QueryInput
                    onSubmit={handleSubmit}
                    isLoading={false}
                    suggestions={suggestionPrompts}
                    isIdle
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ACTIVE STATE ── */}
        <AnimatePresence initial={false}>
          {!isIdle && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32 }}
              className="max-w-5xl mx-auto px-6 py-8"
            >
              <div className="mb-8">
                <QueryInput
                  onSubmit={handleSubmit}
                  isLoading={status === "loading"}
                  suggestions={suggestionPrompts}
                />
              </div>
              <AnalysisPanel
                status={status}
                result={result}
                errorMessage={errorMessage}
                onRetry={() => lastQuestion && runAnalysis(lastQuestion)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
