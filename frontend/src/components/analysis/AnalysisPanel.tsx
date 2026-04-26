"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisResult, QueryStatus } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterpretationView } from "./InterpretationView";
import { ScriptView } from "./ScriptView";
import { VisualizationView } from "./VisualizationView";
import {
  InterpretationSkeleton,
  ChartSkeleton,
  KPISkeletons,
  TableSkeleton,
} from "@/components/shared/SkeletonLoader";
import { Brain, Code2, BarChart2, Loader2, AlertTriangle } from "lucide-react";

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
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-700 text-sm">
                Não foi possível processar sua pergunta
              </p>
              {errorMessage && (
                <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
              )}
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs font-medium text-red-700 border border-red-300 rounded-lg px-4 py-1.5 hover:bg-red-100 transition-colors"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {/* Loading + Done states share the Tabs chrome */}
        {(status === "loading" || status === "done") && (
          <Tabs defaultValue="interpretation" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-10 bg-gray-100">
              <TabsTrigger value="interpretation" className="flex items-center gap-1.5 text-xs">
                <Brain className="w-3.5 h-3.5" />
                Interpretação
              </TabsTrigger>
              <TabsTrigger value="script" className="flex items-center gap-1.5 text-xs">
                <Code2 className="w-3.5 h-3.5" />
                Script SQL
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center gap-1.5 text-xs">
                <BarChart2 className="w-3.5 h-3.5" />
                Dashboard
              </TabsTrigger>
            </TabsList>

            {/* Loading state */}
            {status === "loading" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                  <span>Processando sua pergunta...</span>
                </div>
                <InterpretationSkeleton />
                <KPISkeletons />
                <ChartSkeleton />
                <TableSkeleton />
              </div>
            )}

            {/* Results */}
            {status === "done" && result && (
              <>
                <TabsContent value="interpretation">
                  <InterpretationView data={result.interpretation} />
                </TabsContent>
                <TabsContent value="script">
                  <ScriptView script={result.script} />
                </TabsContent>
                <TabsContent value="visualization">
                  <VisualizationView result={result} />
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
