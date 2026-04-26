"use client";

import { useState } from "react";
import type { GeneratedScript } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, Copy, CheckCheck, Info, Rows } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScriptViewProps {
  script: GeneratedScript;
}

// Minimal keyword-based syntax highlight for SQL
function highlightSQL(code: string) {
  const keywords = [
    "SELECT","FROM","WHERE","JOIN","INNER","LEFT","ON","AND","OR","NOT",
    "GROUP BY","ORDER BY","HAVING","AS","IN","BETWEEN","TOP","DISTINCT",
    "SUM","COUNT","AVG","MAX","MIN","TO_CHAR","ADD_MONTHS","SYSDATE",
    "ASC","DESC","BY","INTO","SET","UPDATE","INSERT","DELETE","WITH",
  ];

  // Escape HTML
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Comments
  html = html.replace(/(--[^\n]*)/g, '<span class="text-gray-400 italic">$1</span>');

  // String literals
  html = html.replace(/'([^']*)'/g, '<span class="text-amber-400">\'$1\'</span>');

  // Keywords (only outside of already-tagged spans — simple approach)
  keywords.forEach((kw) => {
    const re = new RegExp(`\\b(${kw})\\b`, "g");
    html = html.replace(re, '<span class="text-blue-400 font-semibold">$1</span>');
  });

  // Table/field names in ALL_CAPS (SAP naming)
  html = html.replace(
    /\b([A-Z]{2,}[A-Z0-9_]*\.[A-Z_]+)\b/g,
    '<span class="text-green-400">$&</span>'
  );

  return html;
}

export function ScriptView({ script }: ScriptViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Linguagem:</span>
              <Badge variant="secondary" className="font-mono uppercase">
                {script.language}
              </Badge>
            </div>
            {script.estimatedRows > 0 && (
              <div className="flex items-center gap-1.5">
                <Rows className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Linhas estimadas:</span>
                <span className="text-sm font-semibold text-gray-800">
                  ~{script.estimatedRows.toLocaleString("pt-BR")}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">{script.explanation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Code block */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-gray-100 bg-gray-900 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-gray-400 font-mono ml-2">
              query_gerada.sql
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-3 text-gray-400 hover:text-white hover:bg-gray-700 gap-1.5"
          >
            {copied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 text-xs">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-xs">Copiar</span>
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-gray-950 overflow-x-auto">
            <pre className="p-5 text-xs leading-relaxed font-mono text-gray-300">
              <code
                dangerouslySetInnerHTML={{ __html: highlightSQL(script.code) }}
              />
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
