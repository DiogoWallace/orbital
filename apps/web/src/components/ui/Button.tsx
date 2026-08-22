import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--color-void)] hover:brightness-110 font-medium",
  outline:
    "border border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
  ghost: "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
};

export function Button({
  children,
  variant = "outline",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)]",
        "px-3.5 py-2 text-sm transition-[color,background-color,border-color,filter]",
        "duration-150 ease-[var(--ease-out-instrument)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
