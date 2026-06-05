"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AnalysisResult, QueryHistoryItem, QueryStatus } from "@/types";
import { postQuery, ApiError } from "@/lib/api";
import { adaptQueryResponse } from "@/lib/adapter";
import { getSession } from "@/lib/auth";

function getHistoryKey(): string {
  if (typeof window === "undefined") return "ds_history_guest";
  const session = getSession();
  return session ? `ds_history_${session.email.toLowerCase()}` : "ds_history_guest";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeItem(item: any): QueryHistoryItem {
  return {
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
  };
}

function loadHistoryForKey(key: string): QueryHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (JSON.parse(raw) as Array<any>).map(deserializeItem);
  } catch {
    return [];
  }
}

function persistHistoryForKey(key: string, history: QueryHistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // localStorage full — ignore
  }
}

export function useAnalysis() {
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  // Stable key captured on first load — avoids key drift during a session
  const historyKeyRef = useRef<string>("");

  // Guard: true while restoring from history so runAnalysis doesn't add a duplicate entry
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const key = getHistoryKey();
    historyKeyRef.current = key;
    setHistory(loadHistoryForKey(key));

    // Re-sync when another tab writes to localStorage (e.g., login in another tab)
    function onStorage(e: StorageEvent) {
      if (e.key === key && e.newValue) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setHistory((JSON.parse(e.newValue) as Array<any>).map(deserializeItem));
        } catch { /* ignore */ }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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
        if (isRestoringRef.current) return prev;
        const newItem: QueryHistoryItem = {
          id,
          question,
          timestamp: new Date(),
          status: "done" as QueryStatus,
          category: analysisResult.interpretation.category ?? "Análise",
          result: analysisResult,
        };
        const next = [newItem, ...prev].slice(0, 20);
        persistHistoryForKey(historyKeyRef.current || getHistoryKey(), next);
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
