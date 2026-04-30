"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { TenantBadge } from "./TenantBadge";
import { getTenantFromEmail } from "@/lib/tenants";
import { mockRegister } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Props {
  onBack: () => void;
  onSuccess: (tenantName: string) => void;
}

export function RegisterForm({ onBack, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const tenant = getTenantFromEmail(email);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório";
    if (!email) e.email = "E-mail obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "E-mail inválido";
    if (!password) e.password = "Senha obrigatória";
    else if (password.length < 6) e.password = "Mínimo 6 caracteres";
    if (confirm !== password) e.confirm = "As senhas não conferem";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await mockRegister(name, email, password);
      onSuccess(result.tenant.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  function clearError(key: string) {
    setFieldErrors((p) => ({ ...p, [key]: "" }));
    setError("");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6">
        <ArrowLeft size={14} /> Voltar ao login
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Criar conta</h1>
        <p className="text-sm text-gray-500">Use seu e-mail corporativo</p>
      </div>

      <TenantBadge tenant={tenant} />

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <Field label="Nome completo" error={fieldErrors.name}>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="João da Silva" value={name} autoComplete="name"
              onChange={(e) => { setName(e.target.value); clearError("name"); }}
              className={inputCls(!!fieldErrors.name, "pl-9")} />
          </div>
        </Field>

        <Field label="E-mail corporativo" error={fieldErrors.email}>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" placeholder="voce@suaempresa.com" value={email} autoComplete="email"
              onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
              className={inputCls(!!fieldErrors.email, "pl-9")} />
          </div>
        </Field>

        <Field label="Senha" error={fieldErrors.password}>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPw ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password}
              onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
              className={inputCls(!!fieldErrors.password, "pl-9 pr-10")} />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <Field label="Confirmar senha" error={fieldErrors.confirm}>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPw ? "text" : "password"} placeholder="Repita a senha" value={confirm}
              onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
              className={inputCls(!!fieldErrors.confirm, "pl-9")} />
          </div>
        </Field>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3 transition-colors shadow-sm shadow-green-200 active:scale-[0.98]">
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>
    </motion.div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean, extra = "") {
  return cn(
    "w-full rounded-xl border bg-white text-sm text-gray-900 placeholder-gray-400 outline-none transition-all py-2.5 pr-4",
    "focus:ring-2 focus:ring-green-500/20 focus:border-green-500",
    hasError ? "border-red-300 focus:border-red-400 focus:ring-red-500/20" : "border-gray-200",
    extra
  );
}
