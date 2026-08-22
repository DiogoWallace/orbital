import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "warn" | "ok";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-[var(--color-line-strong)] text-[var(--color-ink-muted)]",
  accent: "border-[var(--accent)] text-[var(--accent)]",
  warn: "border-[var(--color-signal-warn)] text-[var(--color-signal-warn)]",
  ok: "border-[var(--color-signal-ok)] text-[var(--color-signal-ok)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5",
        "text-[11px] font-medium tracking-wide uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
