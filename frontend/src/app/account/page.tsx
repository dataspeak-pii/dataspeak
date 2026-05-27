"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { getSession, clearSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import type { QueryHistoryItem } from "@/types";
import { HoverButton } from "@/components/ui/hover-button";
import { Clock, LogOut, Building2, Mail, User, MessageSquare } from "lucide-react";

const categoryColor: Record<string, string> = {
  Produção: "bg-cat-2-bg text-cat-2",
  Vendas:   "bg-cat-1-bg text-cat-1",
  Estoque:  "bg-cat-5-bg text-cat-5",
  Qualidade:"bg-cat-4-bg text-cat-4",
  Análise:  "bg-cat-3-bg text-cat-3",
};

function loadHistory(email: string): QueryHistoryItem[] {
  try {
    const raw = localStorage.getItem(`ds_history_${email.toLowerCase()}`);
    if (!raw) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (JSON.parse(raw) as Array<any>).map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch {
    return [];
  }
}

function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.52 0.18 38) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[360px] bg-brand-500/[0.04] rounded-full blur-3xl" />
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    setSession(s);
    setHistory(loadHistory(s.email));
  }, [router]);

  function handleLogout() {
    clearSession();
    window.location.href = "/";
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <GridBackground />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between h-14 px-6 border-b border-border bg-background">
        <Link href="/">
          <Logo width={120} height={24} />
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Voltar ao início
        </Link>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Minha Conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações e histórico de análises.</p>
        </motion.div>

        {/* User info card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="bg-[var(--color-bg-a1)] border border-border rounded-2xl p-6 space-y-4"
        >
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-700 flex items-center justify-center shrink-0 shadow-md shadow-brand-900/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{session.name}</p>
              <p className="text-xs text-muted-foreground">
                Membro desde {new Date(session.loginAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground truncate">{session.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{session.tenant.name}</span>
            </div>
          </div>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Histórico de análises
            </h2>
            <span className="text-xs text-muted-foreground ml-auto">
              {history.length} {history.length === 1 ? "consulta" : "consultas"}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="bg-[var(--color-bg-a1)] border border-border rounded-2xl px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma consulta realizada ainda.</p>
              <Link href="/" className="inline-block mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                Fazer minha primeira análise →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.04, duration: 0.22 }}
                  className="bg-[var(--color-bg-a1)] border border-border rounded-xl px-4 py-3.5 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                      {item.question}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          categoryColor[item.category] ?? categoryColor["Análise"]
                        }`}
                      >
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Clock className="w-3 h-3" />
                        {item.timestamp.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="pt-2 border-t border-border"
        >
          <HoverButton variant="danger" size="md" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Sair da conta
          </HoverButton>
        </motion.div>
      </div>
    </div>
  );
}
