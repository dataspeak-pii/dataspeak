"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { HoverButton } from "@/components/ui/hover-button";
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
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft size={14} /> Voltar ao login
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Criar conta</h1>
        <p className="text-sm text-muted-foreground">Use seu e-mail corporativo</p>
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
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="João da Silva" value={name} autoComplete="name"
              onChange={(e) => { setName(e.target.value); clearError("name"); }}
              className={inputCls(!!fieldErrors.name, "pl-9")} />
          </div>
        </Field>

        <Field label="E-mail corporativo" error={fieldErrors.email}>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" placeholder="voce@suaempresa.com" value={email} autoComplete="email"
              onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
              className={inputCls(!!fieldErrors.email, "pl-9")} />
          </div>
        </Field>

        <Field label="Senha" error={fieldErrors.password}>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type={showPw ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password}
              onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
              className={inputCls(!!fieldErrors.password, "pl-9 pr-10")} />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <Field label="Confirmar senha" error={fieldErrors.confirm}>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type={showPw ? "text" : "password"} placeholder="Repita a senha" value={confirm}
              onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
              className={inputCls(!!fieldErrors.confirm, "pl-9")} />
          </div>
        </Field>

        <HoverButton type="submit" disabled={loading} fullWidth size="lg" className="rounded-2xl">
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? "Criando conta..." : "Criar conta"}
        </HoverButton>
      </form>
    </motion.div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean, extra = "") {
  return cn(
    "w-full rounded-xl border bg-background text-sm text-foreground placeholder-gray-400 outline-none transition-all py-2.5 pr-4",
    "focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
    hasError ? "border-red-300 focus:border-red-400 focus:ring-red-500/20" : "border-input",
    extra
  );
}
