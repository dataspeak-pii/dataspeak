"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisResult, QueryStatus } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterpretationView } from "./InterpretationView";
import { ScriptView } from "./ScriptView";
import { VisualizationView } from "./VisualizationView";
import { cn } from "@/lib/utils";
import { Brain, Code2, BarChart2, Loader2, AlertTriangle } from "lucide-react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-muted", className)} />
);

const InterpretationSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="rounded-xl border border-border p-4 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
    <div className="rounded-xl border border-border p-4 space-y-3">
      <Skeleton className="h-4 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
      </div>
    </div>
  </div>
);

const ScriptSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="rounded-xl border border-border p-4 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
    <div className="rounded-xl bg-neutral-900 p-4 space-y-2">
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-3 w-3 rounded-full bg-neutral-700" />
        <Skeleton className="h-3 w-3 rounded-full bg-neutral-700" />
        <Skeleton className="h-3 w-3 rounded-full bg-neutral-700" />
      </div>
      <Skeleton className="h-3 w-3/4 bg-neutral-800" />
      <Skeleton className="h-3 w-1/2 bg-neutral-800" />
      <Skeleton className="h-3 w-2/3 bg-neutral-800" />
      <Skeleton className="h-3 w-3/5 bg-neutral-800" />
      <Skeleton className="h-3 w-1/2 bg-neutral-800" />
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="grid grid-cols-4 gap-3">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
    <div className="rounded-xl border border-border p-4">
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  </div>
);

interface AnalysisPanelProps {
  status: QueryStatus;
  result: AnalysisResult | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function AnalysisPanel({
  status,
  result,
  errorMessage,
  onRetry,
}: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState("interpretation");

  if (status === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-5xl mx-auto mt-8"
      >
        {/* Error state */}
        {status === "error" && (
          <div className="rounded-xl border border-danger bg-danger-bg p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-danger-bg">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="font-semibold text-danger text-sm">
                Não foi possível processar sua pergunta
              </p>
              {errorMessage && (
                <p className="mt-1 text-xs text-danger">{errorMessage}</p>
              )}
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs font-medium text-danger border border-danger rounded-lg px-4 py-1.5 hover:bg-danger-bg transition-colors"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {/* Loading + Done states */}
        {(status === "loading" || status === "done") && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {status === "loading" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Processando sua pergunta...</span>
              </div>
            )}

            <TabsList variant="line" className="w-full mb-6">
              <TabsTrigger value="interpretation" className="flex items-center gap-1.5 text-xs flex-1">
                <Brain className="w-3.5 h-3.5" />
                Interpretação
              </TabsTrigger>
              <TabsTrigger value="script" className="flex items-center gap-1.5 text-xs flex-1">
                <Code2 className="w-3.5 h-3.5" />
                Script SQL
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center gap-1.5 text-xs flex-1">
                <BarChart2 className="w-3.5 h-3.5" />
                Dashboard
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <TabsContent value="interpretation">
                  {status === "loading"
                    ? <InterpretationSkeleton />
                    : result && <InterpretationView data={result.interpretation} />}
                </TabsContent>
                <TabsContent value="script">
                  {status === "loading"
                    ? <ScriptSkeleton />
                    : result && <ScriptView script={result.script} />}
                </TabsContent>
                <TabsContent value="visualization">
                  {status === "loading"
                    ? <DashboardSkeleton />
                    : result && <VisualizationView result={result} />}
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
