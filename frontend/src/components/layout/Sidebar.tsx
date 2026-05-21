"use client";

import { cn } from "@/lib/utils";
import type { QueryHistoryItem } from "@/types";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface SidebarProps {
  history: QueryHistoryItem[];
  onSelectHistory: (item: QueryHistoryItem) => void;
  activeId?: string;
}

const categoryColor: Record<string, string> = {
  Produção: "bg-cat-2-bg text-cat-2",
  Vendas:   "bg-cat-1-bg text-cat-1",
  Estoque:  "bg-cat-5-bg text-cat-5",
  Qualidade:"bg-cat-4-bg text-cat-4",
  Análise:  "bg-cat-3-bg text-cat-3",
};

export function Sidebar({ history, onSelectHistory, activeId }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-border shadow-sm overflow-hidden shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          {!collapsed ? (
            <Image src="/logo.svg" alt="DataSpeak" width={140} height={28} priority />
          ) : (
            <Image src="/logo-mark.svg" alt="DataSpeak" width={28} height={28} priority />
          )}
        </div>

        <div className="flex items-center gap-0.5 ml-auto">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Nav — Dashboard */}
      <div className="p-3 shrink-0">
        <button
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            "bg-brand-50 text-brand-700 hover:bg-brand-100"
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 pb-2 border-b border-border">
            Histórico
          </p>

          <div className="space-y-0">
            {history.map((item) => {
              const isHovered = hoveredId === item.id;
              const isActive = activeId === item.id;

              return (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => onSelectHistory(item)}
                  onHoverStart={() => setHoveredId(item.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 transition-colors group border-b border-border/40 last:border-0 relative",
                    isActive
                      ? "bg-brand-50"
                      : isHovered
                        ? "bg-muted/80"
                        : "hover:bg-muted/50"
                  )}
                >
                  {/* Active left bar */}
                  {isActive && (
                    <motion.div
                      layoutId="active-sidebar-bar"
                      className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-brand-500"
                    />
                  )}

                  <p
                    className={cn(
                      "text-xs text-foreground font-medium leading-snug mb-1.5 transition-all",
                      !isHovered && "line-clamp-2"
                    )}
                  >
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
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                      <Clock className="w-3 h-3" />
                      {item.timestamp.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>

                  {/* Hover expand — "Ver análise" hint */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40 text-[10px] text-brand-600 font-medium">
                          <ChevronRight className="w-3 h-3" />
                          Ver análise
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border shrink-0">
          <p className="text-[10px] text-muted-foreground text-center">
            DataSpeak · PI 2026
          </p>
        </div>
      )}
    </motion.aside>
  );
}
