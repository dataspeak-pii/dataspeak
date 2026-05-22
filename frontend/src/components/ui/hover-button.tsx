"use client";

import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

interface Circle {
  id: number;
  x: number;
  y: number;
  startColor: string;
  endColor: string;
  fadeState: "in" | "out";
}

export interface HoverButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function HoverButton({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  disabled,
  ...props
}: HoverButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastAddedRef = useRef<number>(0);
  const [circles, setCircles] = useState<Circle[]>([]);

  const createCircle = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const btn = buttonRef.current;
      if (!btn) return;
      const now = Date.now();
      if (now - lastAddedRef.current < 60) return;
      lastAddedRef.current = now;

      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const relX = x / rect.width;

      let startColor: string;
      let endColor: string;

      if (variant === "primary") {
        // Dark orange glow — stays close to the button hue, just a touch lighter
        startColor =
          relX < 0.5
            ? "rgba(249,115,22,0.70)"    // orange-500
            : "rgba(234,88,12,0.70)";    // orange-600
        endColor = "rgba(194,65,12,0.0)";
      } else if (variant === "danger") {
        startColor = "rgba(239,68,68,0.50)";
        endColor = "rgba(239,68,68,0.0)";
      } else {
        // secondary / ghost: subtle brand tint
        startColor = "rgba(253,186,116,0.45)";
        endColor = "rgba(194,65,12,0.0)";
      }

      const id = now;
      setCircles((prev) => [
        ...prev,
        { id, x, y, startColor, endColor, fadeState: "in" },
      ]);

      setTimeout(() => {
        setCircles((prev) =>
          prev.map((c) => (c.id === id ? { ...c, fadeState: "out" } : c))
        );
      }, 1000);

      setTimeout(() => {
        setCircles((prev) => prev.filter((c) => c.id !== id));
      }, 2200);
    },
    [variant]
  );

  const sizeClasses: Record<NonNullable<HoverButtonProps["size"]>, string> = {
    sm: "h-7 px-3 text-xs gap-1.5",
    md: "h-9 px-5 text-sm gap-2",
    lg: "h-11 px-6 text-sm gap-2",
  };

  const variantClasses: Record<
    NonNullable<HoverButtonProps["variant"]>,
    string
  > = {
    primary: [
      "bg-brand-700 text-white",
      "shadow-sm shadow-brand-900/20",
      "before:shadow-[inset_0_1px_0_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(0,0,0,0.18)]",
    ].join(" "),
    secondary: [
      "bg-[var(--color-bg-a1)] text-foreground border border-border",
      "hover:border-brand-300 hover:text-brand-700",
      "before:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05)]",
    ].join(" "),
    ghost: [
      "bg-transparent text-muted-foreground",
      "hover:text-foreground hover:bg-[var(--color-bg-a2)]",
    ].join(" "),
    danger: [
      "bg-transparent text-danger border border-danger/40",
      "hover:bg-danger/10",
    ].join(" "),
  };

  return (
    <button
      ref={buttonRef}
      disabled={disabled}
      onPointerMove={disabled ? undefined : createCircle}
      className={cn(
        "relative overflow-hidden rounded-full font-semibold",
        "flex items-center justify-center",
        "transition-[box-shadow,border-color,color,transform,opacity] duration-100",
        "before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none",
        "active:scale-[0.97]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {/* Pointer-tracking glow circles */}
      {circles.map((circle) => (
        <span
          key={circle.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: circle.x - 64,
            top: circle.y - 64,
            width: 128,
            height: 128,
            background: `radial-gradient(circle at center, ${circle.startColor}, ${circle.endColor})`,
            opacity: circle.fadeState === "in" ? 1 : 0,
            transition:
              circle.fadeState === "in"
                ? "opacity 0ms"
                : "opacity 1200ms ease-out",
          }}
        />
      ))}

      <span className="relative z-10 flex items-center gap-[inherit]">
        {children}
      </span>
    </button>
  );
}
