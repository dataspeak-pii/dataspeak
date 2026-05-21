"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AnalysisResult, QueryHistoryItem, QueryStatus } from "@/types";
import { postQuery, ApiError } from "@/lib/api";
import { adaptQueryResponse } from "@/lib/adapter";
import { getSession } from "@/lib/auth";

function getHistoryKey(): string {
  if (typeof window === "undefined") return "ds_history_guest";
  const session = getSession();
  return session ? `ds_history_${session.email}` : "ds_history_guest";
}

function loadHistory(): QueryHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getHistoryKey());
    if (!raw) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (JSON.parse(raw) as Array<any>).map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp),
      result: item.result
        ? {
            ...item.result,
            query: {
              ...item.result.query,
              timestamp: new Date(item.result.query.timestamp),
            },
          }
        : undefined,
    }));
  } catch {
    return [];
  }
}

function persistHistory(history: QueryHistoryItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getHistoryKey(), JSON.stringify(history));
}

export function useAnalysis() {
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  // Guard: true while restoring from history so runAnalysis doesn't add a duplicate entry
  const isRestoringRef = useRef(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const runAnalysis = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setStatus("loading");
    setResult(null);
    setErrorMessage(null);

    try {
      const apiResponse = await postQuery({ question });
      const id = `q-${Date.now()}`;
      const analysisResult = adaptQueryResponse(apiResponse, question, id);

      setHistory((prev) => {
        if (isRestoringRef.current) return prev; // não adiciona ao histórico ao restaurar
        const next: QueryHistoryItem[] = [
          {
            id,
            question,
            timestamp: new Date(),
            status: "done",
            category: analysisResult.interpretation.category ?? "Análise",
            result: analysisResult,
          },
          ...prev,
        ].slice(0, 10);
        persistHistory(next);
        return next;
      });

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

  const restoreFromHistory = useCallback(
    (item: QueryHistoryItem) => {
      if (item.result) {
        isRestoringRef.current = true;
        setResult(item.result);
        setStatus("done");
        setErrorMessage(null);
        setTimeout(() => { isRestoringRef.current = false; }, 0);
      } else {
        // Fallback para itens antigos sem resultado salvo — reexecuta no backend
        runAnalysis(item.question);
      }
    },
    [runAnalysis],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  return { status, result, errorMessage, history, runAnalysis, restoreFromHistory, reset };
}
