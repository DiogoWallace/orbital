import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Superfície base da interface.
 *
 * Um só componente para painel, cartão e módulo de dados: a plataforma inteira
 * usa a mesma linguagem de superfície, e é isso que faz um catálogo de dezenas
 * de módulos parecer um instrumento só.
 */
export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-panel)] border border-[var(--color-line)]",
        "bg-[var(--color-surface)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-medium tracking-wide text-[var(--color-ink)]">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-[var(--color-ink-faint)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
