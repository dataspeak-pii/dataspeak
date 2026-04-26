import type { AnalysisInterpretation } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Database, Calendar, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterpretationViewProps {
  data: AnalysisInterpretation;
}

const fieldTypeStyle: Record<string, string> = {
  date: "bg-blue-50 text-blue-700 border-blue-200",
  dimension: "bg-purple-50 text-purple-700 border-purple-200",
  measure: "bg-green-50 text-green-700 border-green-200",
};

const fieldTypeLabel: Record<string, string> = {
  date: "Data",
  dimension: "Dimensão",
  measure: "Medida",
};

export function InterpretationView({ data }: InterpretationViewProps) {
  return (
    <div className="space-y-4">
      {/* Intent card */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-purple-600" />
            </div>
            Interpretação da IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Original question */}
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
              Pergunta original
            </p>
            <p className="text-sm text-gray-800 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
              &ldquo;{data.originalQuestion}&rdquo;
            </p>
          </div>

          {/* Intent */}
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
              Intenção identificada
            </p>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">{data.intent}</p>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Target className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium">{data.category}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{data.period}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400">Confiança</span>
              <div className="flex items-center gap-1">
                <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${data.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-green-600">
                  {data.confidence}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fields table */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-blue-600" />
            </div>
            Campos e tabelas SAP identificados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {data.sapTables.map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-xs">
                {t}
              </Badge>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Campo</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Tabela SAP</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Campo SAP</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {data.fields.map((f, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-gray-700 font-medium">{f.name}</td>
                    <td className="py-2.5 px-3">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {f.sapTable}
                      </code>
                    </td>
                    <td className="py-2.5 px-3">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {f.sapField}
                      </code>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                          fieldTypeStyle[f.type]
                        )}
                      >
                        {fieldTypeLabel[f.type]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
