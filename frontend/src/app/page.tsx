"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryInput } from "@/components/dashboard/QueryInput";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { useAnalysis } from "@/hooks/useAnalysis";
import { suggestionPrompts } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { QueryHistoryItem } from "@/types";

export default function HomePage() {
  const { status, result, errorMessage, history, runAnalysis } = useAnalysis();
  const [lastQuestion, setLastQuestion] = useState<string>("");

  const handleSubmit = (q: string) => {
    setLastQuestion(q);
    runAnalysis(q);
  };

  const handleHistorySelect = (item: QueryHistoryItem) => {
    setLastQuestion(item.question);
    runAnalysis(item.question);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        history={history}
        onSelectHistory={handleHistorySelect}
        activeId={result?.id}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {status === "idle" ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-0px)] px-8">
            <div className="w-full max-w-5xl">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-10"
              >
                <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
                  </span>
                  <Sparkles className="w-3.5 h-3.5" />
                  Powered by IA • Dados SAP simulados
                </div>
                <h1 className="text-3xl font-semibold text-foreground mb-2 tracking-tight">
                  O que você quer analisar hoje?
                </h1>
                <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
                  Descreva sua necessidade em linguagem natural. O sistema interpreta a intenção,
                  identifica as tabelas SAP relevantes e gera o SQL automaticamente.
                </p>
              </motion.div>
              <QueryInput
                onSubmit={handleSubmit}
                isLoading={status === "loading"}
                suggestions={suggestionPrompts}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-10">
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
          </div>
        )}
      </main>
    </div>
  );
}
