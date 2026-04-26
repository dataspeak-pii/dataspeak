"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryInputProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
  suggestions: string[];
}

export function QueryInput({ onSubmit, isLoading, suggestions }: QueryInputProps) {
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main input card */}
      <motion.div
        animate={{
          boxShadow: focused
            ? "0 0 0 2px #16a34a, 0 8px 32px rgba(0,0,0,0.08)"
            : "0 2px 16px rgba(0,0,0,0.06)",
        }}
        transition={{ duration: 0.15 }}
        className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-green-600" />
          </div>

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
            Enter para enviar • Shift+Enter para nova linha
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8 px-4"
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
            <p className="text-xs text-gray-400 mb-2.5 flex items-center gap-1.5">
              <Search className="w-3 h-3" />
              Sugestões de análises
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white",
                    "text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50",
                    "transition-colors duration-150"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
