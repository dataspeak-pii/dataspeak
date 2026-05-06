import type { DataTable } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table2, Database, AlertTriangle, Info } from "lucide-react";

interface DataTableViewProps {
  table: DataTable;
}

export function DataTableView({ table }: DataTableViewProps) {
  if (table.executionError) {
    return (
      <Card className="border border-red-200 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700">
                Erro ao executar o SQL
              </p>
              <p className="text-sm text-red-600 mt-1">
                O banco de dados retornou um erro ao processar a consulta.
              </p>
              <code className="mt-2 block text-xs bg-red-50 border border-red-100 rounded px-3 py-2 text-red-700 whitespace-pre-wrap break-all">
                {table.executionError}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100 shadow-sm overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-gray-100 bg-gray-50 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">
            Dados extraídos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Database className="w-3.5 h-3.5" />
            {table.sapSource}
          </div>
          <Badge variant="secondary" className="text-xs">
            {table.totalRows.toLocaleString("pt-BR")} registros
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {table.columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {table.rows.map((row, i) => (
                <tr
                  key={i}
                  className="hover:bg-gray-50/70 transition-colors group"
                >
                  {table.columns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-3 text-gray-700 whitespace-nowrap"
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
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-center">
            <p className="text-xs text-gray-400">
              Exibindo {table.rows.length} de{" "}
              {table.totalRows.toLocaleString("pt-BR")} registros
            </p>
          </div>
        )}
        {table.truncated && (
          <div className="px-4 py-3 border-t border-amber-100 bg-amber-50 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              Resultados truncados — exibindo as primeiras {table.rows.length}{" "}
              linhas. Execute diretamente no banco para o conjunto completo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
