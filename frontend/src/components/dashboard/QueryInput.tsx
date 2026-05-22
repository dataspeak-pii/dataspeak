"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverButton } from "@/components/ui/hover-button";

interface QueryInputProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
  suggestions: string[];
  isIdle?: boolean;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: {
  minHeight: number;
  maxHeight?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

export function QueryInput({
  onSubmit,
  isLoading,
  suggestions,
}: QueryInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 88,
    maxHeight: 280,
  });

  const canSubmit = value.trim() !== "" && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(value.trim());
    setValue("");
    adjustHeight(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (s: string) => {
    setValue(s);
    // Let the next frame measure the new content before adjusting
    requestAnimationFrame(() => adjustHeight());
    textareaRef.current?.focus();
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* ── Main card ── */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={cn(
          "relative bg-[var(--color-bg-a1)] rounded-2xl border overflow-hidden",
          "transition-[border-color] duration-200",
          focused ? "border-brand-300" : "border-border"
        )}
        style={{
          boxShadow: focused
            ? "0 0 0 3px oklch(0.64 0.19 42 / 0.12), 0 6px 28px rgba(0,0,0,0.07)"
            : "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        {/* Textarea */}
        <div className="px-5 pt-5 pb-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Descreva o que você quer analisar... (ex: volume de produção dos últimos 3 meses)"
            disabled={isLoading}
            className={cn(
              "w-full resize-none bg-transparent outline-none",
              "text-foreground placeholder:text-muted-foreground",
              "text-base leading-relaxed tracking-[-0.01em]",
              "disabled:opacity-50",
            )}
            style={{ overflow: "hidden", minHeight: 88 }}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-[var(--color-bg-a2)]/60">
          <p className="text-xs text-muted-foreground select-none">
            Enter para enviar · Shift+Enter para nova linha
          </p>

          <HoverButton
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            variant={canSubmit ? "primary" : "secondary"}
            size="md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <ArrowUpIcon className="w-4 h-4" />
                Gerar análise
              </>
            )}
          </HoverButton>
        </div>
      </motion.div>

      {/* ── Quick suggestions ── */}
      <AnimatePresence>
        {!isLoading && !value && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22, delay: 0.08 }}
            className="mt-5"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <kbd className="px-1.5 py-0.5 text-xs border border-border rounded font-mono bg-muted leading-none">
                ↵
              </kbd>
              <span>Sugestões rápidas — clique para usar</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.04, duration: 0.2 }}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSuggestion(s)}
                  className={cn(
                    "text-sm px-4 py-2 rounded-full border border-border",
                    "bg-[var(--color-bg-a1)] text-muted-foreground font-medium",
                    "hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50",
                    "transition-all duration-150 shadow-sm"
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
