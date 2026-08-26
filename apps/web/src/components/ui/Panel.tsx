import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Superfície base da interface.
 *
 * Um só componente para painel, cartão e módulo de dados: a plataforma inteira
 * usa a mesma linguagem de superfície, e é isso que faz um catálogo de dezenas
 * de módulos parecer um instrumento só.
 *
 * O contorno vem de `box-shadow` (`.elev-sm`), não de `border`: assim ele não
 * entra no cálculo da caixa, e um painel numa grade nunca fica dois pixels
 * menor que o vizinho sem contorno.
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
        "rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]",
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
    <div className="rule-bottom flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <h6 className="text-[var(--color-neutral-500)]">{title}</h6>
        {description ? (
          <p className="mt-1.5 text-xs text-[var(--color-neutral-500)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
