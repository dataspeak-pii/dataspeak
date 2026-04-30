"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Leaf } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { APP_NAME, APP_FOOTER } from "@/lib/constants";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

type View = "login" | "register" | "forgot";

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [successMsg, setSuccessMsg] = useState("");

  function handleRegisterSuccess(tenantName: string) {
    setSuccessMsg(`Conta criada com sucesso em ${tenantName}! Faça login para continuar.`);
    setView("login");
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-green-50/30 px-4 py-10">
      {/* Subtle background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-green-100/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-200">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-800 font-bold text-lg">{APP_NAME}</span>
          </div>
          <p className="text-xs text-gray-400">Sistema corporativo multi-tenant</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/80 p-7">
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
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {APP_FOOTER}
        </p>
      </div>
    </div>
  );
}
