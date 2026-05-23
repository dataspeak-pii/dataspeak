"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { QueryInput } from "@/components/dashboard/QueryInput";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { useAnalysis } from "@/hooks/useAnalysis";
import { suggestionPrompts } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Database, TrendingUp, BarChart3 } from "lucide-react";
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
  const router = useRouter();
  const { status, result, errorMessage, history, runAnalysis, restoreFromHistory } = useAnalysis();
  const [lastQuestion, setLastQuestion] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const typewriter = useTypewriter(TYPEWRITER_PHRASES);
  const isIdle = status === "idle";

  const handleSubmit = useCallback((q: string) => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    setLastQuestion(q);
    runAnalysis(q);
  }, [runAnalysis, router]);

  const handleHistorySelect = useCallback((item: QueryHistoryItem) => {
    restoreFromHistory(item);
  }, [restoreFromHistory]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          history={history}
          onSelectHistory={handleHistorySelect}
          activeId={result?.id}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
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
                className="absolute inset-0 flex flex-col items-center px-8 z-10 overflow-y-auto"
              >
                <GridBackground />

                <div className="relative w-full max-w-3xl z-10 flex flex-col gap-8 py-12 my-auto">
                  {/* Heading + subtitle + typewriter */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08 }}
                    className="text-center flex flex-col gap-3"
                  >
                    <h1 className="text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] leading-[2.0] font-bold tracking-[-0.04em] text-foreground">
                      O que você quer analisar hoje?
                    </h1>

                    {/* Subtitle */}
                    <p className="text-md text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Traduza perguntas em linguagem natural para análises visuais
                      dos seus dados SAP — sem SQL, sem esperas.
                    </p>

                    {/* Typewriter */}
                    <p className="text-base text-muted-foreground max-w-lg mx-auto h-7">
                      Ex:{" "}
                      <span className="text-brand-700 font-medium">
                        {typewriter}
                        <span className="inline-block w-[2px] h-[14px] bg-brand-600 ml-px align-middle animate-[blink_1s_step-end_infinite]" />
                      </span>
                    </p>
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

                  {/* Feature pills */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="flex items-center justify-center gap-2.5 flex-wrap"
                  >
                    {FEATURE_PILLS.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-[var(--color-bg-a1)] border border-border px-4 py-2 rounded-full shadow-sm"
                      >
                        <Icon className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        {label}
                      </div>
                    ))}
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
    </div>
  );
}
