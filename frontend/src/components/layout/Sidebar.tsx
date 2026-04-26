"use client";

import { cn } from "@/lib/utils";
import type { QueryHistoryItem } from "@/types";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Clock,
  Leaf,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  history: QueryHistoryItem[];
  onSelectHistory: (item: QueryHistoryItem) => void;
  activeId?: string;
}

const categoryColor: Record<string, string> = {
  Produção: "bg-blue-100 text-blue-700",
  Vendas: "bg-green-100 text-green-700",
  Estoque: "bg-orange-100 text-orange-700",
  Qualidade: "bg-purple-100 text-purple-700",
  Análise: "bg-gray-100 text-gray-600",
};

export function Sidebar({ history, onSelectHistory, activeId }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-white border-r border-gray-100 shadow-sm overflow-hidden shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-gray-100">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">
                Klabin Insights
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-auto"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav item – Dashboard */}
      <div className="p-3">
        <button
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            "bg-green-50 text-green-700 hover:bg-green-100"
          )}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Dashboard
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <Separator />

      {/* History */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
            Histórico
          </p>

          <div className="space-y-1">
            {history.map((item) => (
              <motion.button
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onSelectHistory(item)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg transition-colors group",
                  activeId === item.id
                    ? "bg-green-50 border border-green-200"
                    : "hover:bg-gray-50"
                )}
              >
                <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-snug mb-1.5">
                  {item.question}
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      categoryColor[item.category] ?? categoryColor["Análise"]
                    )}
                  >
                    {item.category}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400 ml-auto">
                    <Clock className="w-3 h-3" />
                    {item.timestamp.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">
            Klabin Dashboard • PI 2026
          </p>
        </div>
      )}
    </motion.aside>
  );
}
