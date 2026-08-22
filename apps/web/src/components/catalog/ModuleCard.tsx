import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { accentVariable } from "@/lib/utils";
import type { ModuleSummary } from "@/lib/api/types";

/**
 * Cartão de módulo no catálogo.
 *
 * O acento vem da disciplina: a cor é orientação, não decoração — o usuário
 * reconhece a área antes de ler o título.
 */
export function ModuleCard({ module }: { module: ModuleSummary }) {
  return (
    <Link
      href={`/modulos/${module.slug}`}
      className="group flex flex-col rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 transition-[border-color,transform] duration-200 ease-[var(--ease-out-instrument)] hover:-translate-y-0.5 hover:border-[var(--accent)]"
      style={{ ["--accent" as string]: accentVariable(module.discipline?.accent) }}
    >
      <div className="flex items-center gap-2">
        {module.discipline ? (
          <span className="text-[11px] tracking-wide text-[var(--accent)] uppercase">
            {module.discipline.name}
          </span>
        ) : null}
        <span className="text-[11px] text-[var(--color-ink-faint)]">
          · {module.kindLabel}
        </span>
      </div>

      <h3 className="mt-2 text-base leading-snug font-medium text-[var(--color-ink)]">
        {module.title}
      </h3>

      {module.subtitle ? (
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{module.subtitle}</p>
      ) : null}

      {module.summary ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--color-ink-faint)]">
          {module.summary}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
        <Badge>{module.difficultyLabel}</Badge>
        {module.estimatedMinutes ? (
          <span className="tabular text-[11px] text-[var(--color-ink-faint)]">
            {module.estimatedMinutes} min
          </span>
        ) : null}
        {module.status !== "published" ? (
          <Badge tone="warn" className="ml-auto">
            Rascunho
          </Badge>
        ) : null}
      </div>
    </Link>
  );
}
