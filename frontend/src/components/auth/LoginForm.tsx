"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { HoverButton } from "@/components/ui/hover-button";
import { TenantBadge } from "./TenantBadge";
import { getTenantFromEmail } from "@/lib/tenants";
import { mockLogin } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Props {
  onRegister: () => void;
  onForgot: () => void;
  successMessage?: string;
}

export function LoginForm({ onRegister, onForgot, successMessage }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const tenant = getTenantFromEmail(email);

  function validate() {
    const e: Record<string, string> = {};
    if (!email) e.email = "E-mail obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "E-mail inválido";
    if (!password) e.password = "Senha obrigatória";
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
      await mockLogin(email, password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-foreground mb-1">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta corporativa</p>
      </div>

      {successMessage && (
        <div className="mb-4 flex items-start gap-2 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800/50 text-brand-700 dark:text-brand-300 rounded-xl px-4 py-3 text-sm">
          {successMessage}
        </div>
      )}

      <TenantBadge tenant={tenant} />

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2 bg-danger-bg border border-danger/30 text-danger rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Field label="E-mail corporativo" error={fieldErrors.email}>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="email" placeholder="voce@suaempresa.com" value={email} autoComplete="email"
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); setError(""); }}
              className={inputCls(!!fieldErrors.email, "pl-9")}
            />
          </div>
        </Field>

        <Field label="Senha" error={fieldErrors.password}>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type={showPw ? "text" : "password"} placeholder="••••••••" value={password} autoComplete="current-password"
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); setError(""); }}
              className={inputCls(!!fieldErrors.password, "pl-9 pr-10")}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <button type="button" onClick={onForgot} className="text-xs text-brand-600 hover:text-brand-700 transition-colors">
            Esqueci minha senha
          </button>
        </div>

        <HoverButton type="submit" disabled={loading} fullWidth size="lg" className="rounded-2xl">
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? "Entrando..." : "Entrar"}
        </HoverButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <button onClick={onRegister} className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
          Criar conta
        </button>
      </p>

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-center text-xs text-muted-foreground/60">
          Domínios para teste: <span className="text-muted-foreground">dataspeak.com.br · demo.com · empresaa.com</span>
        </p>
      </div>
    </motion.div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean, extra = "") {
  return cn(
    "w-full rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all py-2.5 pr-4",
    "focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
    hasError ? "border-danger/50 focus:border-danger focus:ring-danger/20" : "border-input",
    extra
  );
}
