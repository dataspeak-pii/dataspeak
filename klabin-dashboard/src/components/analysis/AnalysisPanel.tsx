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
import { Brain, Code2, BarChart2, Loader2 } from "lucide-react";

interface AnalysisPanelProps {
  status: QueryStatus;
  result: AnalysisResult | null;
}

export function AnalysisPanel({ status, result }: AnalysisPanelProps) {
  if (status === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-5xl mx-auto mt-8"
      >
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
      </motion.div>
    </AnimatePresence>
  );
}
