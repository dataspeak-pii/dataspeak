"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2, AlertCircle, Send } from "lucide-react";
import { TenantBadge } from "./TenantBadge";
import { getTenantFromEmail } from "@/lib/tenants";
import { mockForgotPassword } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const tenant = getTenantFromEmail(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) { setError("Informe seu e-mail."); return; }
    setLoading(true);
    try {
      await mockForgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
          <Send size={22} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">E-mail enviado!</h2>
        <p className="text-sm text-gray-500 mb-1">Enviamos as instruções para:</p>
        <p className="text-sm font-semibold text-gray-800 mb-5">{email}</p>
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-xs text-left mb-6">
          Em um sistema real, você receberia o link de redefinição por e-mail.
        </div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 mx-auto transition-colors">
          <ArrowLeft size={14} /> Voltar ao login
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6">
        <ArrowLeft size={14} /> Voltar ao login
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Esqueci minha senha</h1>
        <p className="text-sm text-gray-500">Informe seu e-mail corporativo.</p>
      </div>

      <TenantBadge tenant={tenant} />

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail corporativo</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" placeholder="voce@suaempresa.com" value={email} autoComplete="email"
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className={cn("w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none py-2.5 pl-9 pr-4 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all")} />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3 transition-colors active:scale-[0.98]">
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? "Enviando..." : "Enviar instruções"}
        </button>
      </form>
    </motion.div>
  );
}
