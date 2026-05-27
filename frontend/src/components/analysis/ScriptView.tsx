"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { GeneratedScript } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CodeBlock,
  CodeBlockCode,
  CodeBlockGroup,
} from "@/components/ui/code-block";
import { Code2, Copy, CheckCheck, Info, Rows } from "lucide-react";

interface ScriptViewProps {
  script: GeneratedScript;
}

function TrafficLights() {
  return (
    <div className="flex gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
      <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
    </div>
  );
}

export function ScriptView({ script }: ScriptViewProps) {
  const [sqlCopied, setSqlCopied] = useState(false);
  const [pbiCopied, setPbiCopied] = useState(false);

  if (!script.code) {
    return (
      <Card className="border border-border shadow-sm bg-[var(--color-bg-a1)] rounded-2xl">
        <CardContent className="p-8 flex flex-col items-center gap-2 text-center">
          <Code2 className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Nenhum script SQL foi gerado para esta consulta.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleCopySQL = async () => {
    await navigator.clipboard.writeText(script.code);
    setSqlCopied(true);
    toast.success("SQL copiado para a área de transferência", { duration: 2000 });
    setTimeout(() => setSqlCopied(false), 2000);
  };

  const handleCopyPBI = async () => {
    if (!script.powerbiScript) return;
    await navigator.clipboard.writeText(script.powerbiScript);
    setPbiCopied(true);
    toast.success("Script Power BI copiado", { duration: 2000 });
    setTimeout(() => setPbiCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Metadata bar */}
      <Card className="border border-border shadow-sm bg-[var(--color-bg-a1)] rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground/70">Linguagem:</span>
              <Badge variant="secondary" className="font-mono uppercase rounded-md">
                {script.language}
              </Badge>
            </div>
            {script.estimatedRows > 0 && (
              <div className="flex items-center gap-1.5">
                <Rows className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground/70">Linhas estimadas:</span>
                <span className="text-sm font-semibold text-foreground">
                  ~{script.estimatedRows.toLocaleString("pt-BR")}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start gap-2 bg-accent-50 border border-accent-100 rounded-xl px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-accent-600 mt-0.5 shrink-0" />
            <p className="text-xs text-accent-800 leading-relaxed">{script.explanation}</p>
          </div>
        </CardContent>
      </Card>

      {/* SQL code block */}
      <CodeBlock className="shadow-sm">
        <CodeBlockGroup>
          <div className="flex items-center gap-3">
            <TrafficLights />
            <span className="font-mono text-xs text-neutral-400">query_gerada.sql</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopySQL}
            className="h-7 px-3 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 gap-1.5"
          >
            {sqlCopied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-brand-600" />
                <span className="text-brand-600 text-xs">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-xs">Copiar</span>
              </>
            )}
          </Button>
        </CodeBlockGroup>
        <CodeBlockCode code={script.code} language="sql" theme="github-light" />
      </CodeBlock>

      {/* Power BI M script block */}
      {script.powerbiScript && (
        <CodeBlock className="shadow-sm">
          <CodeBlockGroup>
            <div className="flex items-center gap-3">
              <TrafficLights />
              <span className="font-mono text-xs text-neutral-400">power_query.m</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPBI}
              className="h-7 px-3 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 gap-1.5"
            >
              {pbiCopied ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-brand-600 text-xs">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-xs">Copiar</span>
                </>
              )}
            </Button>
          </CodeBlockGroup>

          {/* Amber warning banner */}
          <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200/60">
            <Info size={13} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Substitua{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">[CAMINHO_DO_BANCO]</code>{" "}
              pelo caminho do arquivo{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">.db</code>{" "}
              antes de usar.
            </p>
          </div>

          <CodeBlockCode
            code={script.powerbiScript}
            language="powerquery"
            theme="github-light"
          />
        </CodeBlock>
      )}
    </div>
  );
}
