"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import { HoverButton } from "@/components/ui/hover-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { User } from "lucide-react";

export function TopBar() {
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setSession(getSession());

    const onStorage = (e: StorageEvent) => {
      if (e.key === "mt_session") {
        try { setSession(e.newValue ? JSON.parse(e.newValue) : null); }
        catch { setSession(null); }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0 z-20">
      <Link href="/" className="flex items-center">
        <Logo width={128} height={26} />
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {mounted && (
          session ? (
            <HoverButton
              variant="secondary"
              size="sm"
              onClick={() => router.push("/account")}
            >
              <User className="w-3.5 h-3.5" />
              Minha Conta
            </HoverButton>
          ) : (
            <>
              <HoverButton variant="ghost" size="sm" onClick={() => router.push("/login")}>
                Entrar
              </HoverButton>
              <HoverButton variant="primary" size="sm" onClick={() => router.push("/login?view=register")}>
                Criar conta
              </HoverButton>
            </>
          )
        )}
      </div>
    </header>
  );
}
