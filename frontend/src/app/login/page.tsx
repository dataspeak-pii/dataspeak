"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

type View = "login" | "register" | "forgot";

function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.52 0.18 38) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/60" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[420px] bg-brand-500/[0.06] rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-[320px] h-[240px] bg-accent-500/[0.04] rounded-full blur-3xl" />
    </div>
  );
}

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (window.location.search.includes("view=register")) {
      setView("register");
    }
  }, []);

  function handleRegisterSuccess(tenantName: string) {
    setSuccessMsg(`Conta criada com sucesso em ${tenantName}! Faça login para continuar.`);
    setView("login");
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <GridBackground />

      {/* Top bar with logo + back to home */}
      <header className="relative z-10 flex items-center justify-between h-14 px-6 border-b border-border">
        <Link href="/">
          <Logo width={120} height={24} />
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar ao início
        </Link>
      </header>

      {/* Centered form */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <motion.div
          layout
          className="w-full max-w-[420px] bg-[var(--color-bg-a1)] rounded-2xl border border-border shadow-xl shadow-black/[0.06] p-8"
        >
          <AnimatePresence mode="wait">
            {view === "login" && (
              <LoginForm
                key="login"
                onRegister={() => { setSuccessMsg(""); setView("register"); }}
                onForgot={() => setView("forgot")}
                successMessage={successMsg}
              />
            )}
            {view === "register" && (
              <RegisterForm
                key="register"
                onBack={() => setView("login")}
                onSuccess={handleRegisterSuccess}
              />
            )}
            {view === "forgot" && (
              <ForgotPasswordForm
                key="forgot"
                onBack={() => setView("login")}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
