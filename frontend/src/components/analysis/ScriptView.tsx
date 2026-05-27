"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
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
  const { resolvedTheme } = useTheme();
  const codeTheme = resolvedTheme === "dark" ? "github-dark" : "github-light";

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

          <div className="mt-3 flex items-start gap-2 bg-accent-50 dark:bg-accent-950/40 border border-accent-100 dark:border-accent-800/50 rounded-xl px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-accent-600 dark:text-accent-300 mt-0.5 shrink-0" />
            <p className="text-xs text-accent-800 dark:text-accent-200 leading-relaxed">{script.explanation}</p>
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
            className="h-7 px-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 gap-1.5"
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
        <CodeBlockCode code={script.code} language="sql" theme={codeTheme} />
      </CodeBlock>

    </div>
  );
}
