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
          className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs shrink-0">
            {tenant.logo}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-800 truncate">{tenant.name}</p>
            <p className="text-xs text-emerald-600">{tenant.industry}</p>
          </div>
          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5"
        >
          <Building2 size={14} className="text-gray-400 shrink-0" />
          <p className="text-xs text-gray-400">A empresa será identificada pelo seu e-mail</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
