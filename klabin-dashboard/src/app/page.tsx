"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { QueryInput } from "@/components/dashboard/QueryInput";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { useAnalysis } from "@/hooks/useAnalysis";
import { suggestionPrompts } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import type { QueryHistoryItem } from "@/types";

export default function HomePage() {
  const { status, result, history, runAnalysis } = useAnalysis();

  const handleHistorySelect = (item: QueryHistoryItem) => {
    runAnalysis(item.question);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        history={history}
        onSelectHistory={handleHistorySelect}
        activeId={result?.id}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Hero header — only shown on idle */}
          {status === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
                <Leaf className="w-3.5 h-3.5" />
                Powered by IA • Dados SAP simulados
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                O que você quer analisar hoje?
              </h1>
              <p className="text-gray-500 text-sm max-w-xl mx-auto">
                Descreva sua necessidade em linguagem natural. O sistema vai
                interpretar a pergunta, gerar o script de extração e visualizar
                os dados automaticamente.
              </p>
            </motion.div>
          )}

          {/* Query input */}
          <div className={status !== "idle" ? "mb-8" : ""}>
            <QueryInput
              onSubmit={runAnalysis}
              isLoading={status === "loading"}
              suggestions={suggestionPrompts}
            />
          </div>

          {/* Results panel */}
          <AnalysisPanel status={status} result={result} />
        </div>
      </main>
    </div>
  );
}
