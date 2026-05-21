"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryInputProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
  suggestions: string[];
  isIdle?: boolean;
}

export function QueryInput({ onSubmit, isLoading, suggestions, isIdle }: QueryInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (s: string) => {
    setValue(s);
    textareaRef.current?.focus();
  };

  const shouldPulse = !focused && !isLoading;
  const glowShadow = focused
    ? "0 0 0 2.5px oklch(0.58 0.19 40), 0 8px 32px rgba(0,0,0,0.10)"
    : "0 2px 16px rgba(0,0,0,0.06)";

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        animate={{
          boxShadow: focused
            ? glowShadow
            : shouldPulse
              ? [
                  "0 0 0 0px rgba(194,65,12,0), 0 2px 16px rgba(0,0,0,0.06)",
                  "0 0 0 3.5px rgba(194,65,12,0.11), 0 6px 24px rgba(194,65,12,0.07)",
                  "0 0 0 0px rgba(194,65,12,0), 0 2px 16px rgba(0,0,0,0.06)",
                ]
              : "0 2px 16px rgba(0,0,0,0.06)",
        }}
        transition={
          shouldPulse && !focused
            ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.18 }
        }
        className={cn(
          "relative bg-card rounded-2xl border overflow-hidden",
          focused ? "border-brand-300" : "border-gray-200"
        )}
      >
        {/* Top accent bar on focus */}
        <motion.div
          animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
          initial={{ scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-brand-500 via-brand-600 to-brand-400 origin-left"
        />

        <div className="flex items-start gap-3 p-4">
          <motion.div
            animate={{ backgroundColor: focused ? "oklch(0.93 0.05 50)" : "oklch(0.97 0.02 50)" }}
            transition={{ duration: 0.2 }}
            className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          >
            <Sparkles className="w-4 h-4 text-brand-600" />
          </motion.div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva o que você quer analisar... (ex: volume de produção dos últimos 3 meses)"
            rows={3}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-gray-800 placeholder-gray-400 text-sm leading-relaxed outline-none disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/60">
          <p className="text-[11px] text-gray-400">
            Enter para enviar · Shift+Enter para nova linha
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            size="sm"
            className="bg-brand-700 hover:bg-brand-800 text-white gap-1.5 h-8 px-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                Gerar análise
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Suggestions */}
      <AnimatePresence>
        {!isLoading && !value && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="mt-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2.5">
              <kbd className="px-1.5 py-0.5 text-xs border border-border rounded font-mono bg-muted">↵</kbd>
              <span>Sugestões rápidas — clique para usar</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => handleSuggestion(s)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white",
                    "text-gray-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50",
                    "transition-colors duration-150 shadow-sm"
                  )}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
