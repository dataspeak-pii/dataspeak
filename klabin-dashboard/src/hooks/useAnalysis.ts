"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult, QueryHistoryItem, QueryStatus } from "@/types";
import { mockResults, buildGenericResult, mockHistory } from "@/lib/mock-data";

// Simple slug helper – maps a question to a predefined result key
function resolveResultKey(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("produção") || q.includes("producao")) return "production";
  if (q.includes("vendas") || q.includes("materiais")) return "sales";
  return "generic";
}

export function useAnalysis() {
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>(mockHistory);

  const runAnalysis = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setStatus("loading");
    setResult(null);

    // Simulate network + AI latency
    await new Promise((r) => setTimeout(r, 2200));

    const key = resolveResultKey(question);
    const id = `q-${Date.now()}`;

    const analysisResult: AnalysisResult =
      key !== "generic"
        ? { ...mockResults[key], id }
        : buildGenericResult(id, question);

    // Prepend to history
    setHistory((prev) => [
      {
        id,
        question,
        timestamp: new Date(),
        status: "done",
        category: analysisResult.interpretation.category,
      },
      ...prev,
    ]);

    setResult(analysisResult);
    setStatus("done");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
  }, []);

  return { status, result, history, runAnalysis, reset };
}
