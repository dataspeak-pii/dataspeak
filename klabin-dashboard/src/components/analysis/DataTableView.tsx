import type { DataTable } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table2, Database } from "lucide-react";

interface DataTableViewProps {
  table: DataTable;
}

export function DataTableView({ table }: DataTableViewProps) {
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
      </CardContent>
    </Card>
  );
}
