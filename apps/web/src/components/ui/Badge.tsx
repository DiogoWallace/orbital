import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Etiqueta curta: tipo de conteúdo, dificuldade, estado de rascunho.
 *
 * As três primeiras tonalidades são preenchidas e as de sinal são contornadas —
 * a diferença é intencional. Categoria é rótulo e some no fundo da leitura;
 * aviso é exceção e precisa do contorno para se destacar de uma fila de
 * etiquetas todas iguais.
 */
type BadgeTone = "neutral" | "accent" | "accent-2" | "outline" | "warn" | "ok";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "tag-neutral",
  accent: "tag-accent",
  "accent-2": "tag-accent-2",
  outline: "tag-outline",
  warn: "border border-[var(--color-signal-warn)] text-[var(--color-signal-warn)]",
  ok: "border border-[var(--color-signal-ok)] text-[var(--color-signal-ok)]",
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
  return <span className={cn("tag", toneClasses[tone], className)}>{children}</span>;
}
