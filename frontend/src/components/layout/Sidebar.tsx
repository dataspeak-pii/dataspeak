"use client";

import { cn } from "@/lib/utils";
import type { QueryHistoryItem } from "@/types";
import { Clock, PanelLeftClose, PanelLeftOpen, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  history: QueryHistoryItem[];
  onSelectHistory: (item: QueryHistoryItem) => void;
  activeId?: string;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
}

const categoryColor: Record<string, string> = {
  Produção: "bg-cat-2-bg text-cat-2",
  Vendas:   "bg-cat-1-bg text-cat-1",
  Estoque:  "bg-cat-5-bg text-cat-5",
  Qualidade:"bg-cat-4-bg text-cat-4",
  Análise:  "bg-cat-3-bg text-cat-3",
};

export function Sidebar({
  history,
  onSelectHistory,
  activeId,
  collapsed: collapsedProp,
  onCollapsedChange,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const setCollapsed = (v: boolean) => {
    setInternalCollapsed(v);
    onCollapsedChange?.(v);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 300 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-sidebar border-r border-border overflow-hidden shrink-0"
    >
      {/* Header — toggle button only, aligned with TopBar h-14 */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-border shrink-0",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        <AnimatePresence>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-widest"
            >
              Histórico
            </motion.p>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-[var(--color-bg-a2)] transition-colors shrink-0"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* History list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-y-auto px-3 py-3"
          >
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10 px-3">
                Nenhuma consulta realizada ainda.
              </p>
            )}

            <div className="flex flex-col gap-1.5">
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
                      "w-full text-left px-4 py-3.5 rounded-xl transition-all relative",
                      isActive
                        ? "bg-brand-50 dark:bg-brand-900/25 border border-brand-100 dark:border-brand-800/40"
                        : isHovered
                          ? "bg-[var(--color-bg-a1)] border border-border"
                          : "border border-transparent hover:bg-[var(--color-bg-a1)]"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-sidebar-bar"
                        className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-brand-500"
                      />
                    )}

                    <p
                      className={cn(
                        "text-sm text-foreground font-medium leading-snug mb-2 transition-all",
                        !isHovered && "line-clamp-2"
                      )}
                    >
                      {item.question}
                    </p>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-md font-medium",
                          categoryColor[item.category] ?? categoryColor["Análise"]
                        )}
                      >
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground dark:text-fg-2 ml-auto">
                        <Clock className="w-3.5 h-3.5" />
                        {item.timestamp.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>

                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border/40 text-xs text-brand-600 dark:text-brand-400 font-semibold">
                            <ChevronRight className="w-3.5 h-3.5" />
                            Ver análise
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
