"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Building2, CheckCircle2 } from "lucide-react";
import type { Tenant } from "@/lib/tenants";

export function TenantBadge({ tenant }: { tenant: Tenant | null }) {
  return (
    <AnimatePresence mode="wait">
      {tenant ? (
        <motion.div
          key="found"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800/50 px-3.5 py-2.5"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-800/40 text-brand-700 dark:text-brand-300 font-bold text-xs shrink-0">
            {tenant.logo}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-brand-800 dark:text-brand-200 truncate">{tenant.name}</p>
            <p className="text-xs text-brand-600 dark:text-brand-400">{tenant.industry}</p>
          </div>
          <CheckCircle2 size={15} className="text-brand-500 dark:text-brand-400 shrink-0" />
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 rounded-xl bg-muted border border-border px-3.5 py-2.5"
        >
          <Building2 size={14} className="text-muted-foreground/60 shrink-0" />
          <p className="text-xs text-muted-foreground/60">A empresa será identificada pelo seu e-mail</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
