"use client";

import type { DataTable } from "@/types";
import { formatColumnLabel } from "@/lib/column-labels";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table2, Database, AlertTriangle, Info, Download } from "lucide-react";
import { toast } from "sonner";

interface DataTableViewProps {
  table: DataTable;
}

export function DataTableView({ table }: DataTableViewProps) {
  const exportCSV = () => {
    if (!table?.rows?.length) return;

    const headers = table.columns.map((col) => `"${col}"`).join(",");
    const rows = table.rows.map((row) =>
      table.columns.map((col) => {
        const val = row[col] ?? "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dataspeak_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso", { duration: 2000 });
  };

  if (table.executionError) {
    return (
      <Card className="border border-danger shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-danger">
                Erro ao executar o SQL
              </p>
              <p className="text-sm text-danger mt-1">
                O banco de dados retornou um erro ao processar a consulta.
              </p>
              <code className="mt-2 block text-xs bg-danger-bg border border-danger rounded px-3 py-2 text-danger whitespace-pre-wrap break-all">
                {table.executionError}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border shadow-sm overflow-hidden rounded-2xl bg-[var(--color-bg-a1)]">
      <div className="flex flex-row items-center justify-between py-3 px-4 border-b border-border bg-[var(--color-bg-a2)] rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Dados extraídos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Database className="w-3.5 h-3.5" />
            {table.sapSource}
          </div>
          <Badge variant="secondary" className="text-xs rounded-md">
            {table.totalRows.toLocaleString("pt-BR")} registros
          </Badge>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-brand-400 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Download size={12} />
            Exportar CSV
          </button>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-a2)] border-b border-border">
              <tr>
                {table.columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {formatColumnLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {table.rows.map((row, i) => (
                <tr
                  key={i}
                  className="hover:bg-[var(--color-bg-a2)] transition-colors"
                >
                  {table.columns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-3 text-foreground/80 whitespace-nowrap"
                    >
                      {typeof row[col] === "number"
                        ? Number(row[col]).toLocaleString("pt-BR")
                        : String(row[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.totalRows > table.rows.length && (
          <div className="px-4 py-3 border-t border-border bg-[var(--color-bg-a2)] text-center">
            <p className="text-xs text-muted-foreground">
              Exibindo {table.rows.length} de{" "}
              {table.totalRows.toLocaleString("pt-BR")} registros
            </p>
          </div>
        )}
        {table.truncated && (
          <div className="px-4 py-3 border-t border-warning bg-warning-bg flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-warning shrink-0" />
            <p className="text-xs text-warning">
              Resultados truncados — exibindo as primeiras {table.rows.length}{" "}
              linhas. Execute diretamente no banco para o conjunto completo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
