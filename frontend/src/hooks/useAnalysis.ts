"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult, QueryHistoryItem, QueryStatus } from "@/types";
import { mockHistory } from "@/lib/mock-data";
import { postQuery, ApiError } from "@/lib/api";
import { adaptQueryResponse } from "@/lib/adapter";

export function useAnalysis() {
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>(mockHistory);

  const runAnalysis = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setStatus("loading");
    setResult(null);
    setErrorMessage(null);

    try {
      const apiResponse = await postQuery({ question });
      const id = `q-${Date.now()}`;
      const analysisResult = adaptQueryResponse(apiResponse, question, id);

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
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Erro inesperado ao processar a pergunta.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  return { status, result, errorMessage, history, runAnalysis, reset };
}