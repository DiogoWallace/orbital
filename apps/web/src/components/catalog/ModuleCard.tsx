import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { accentVariable } from "@/lib/utils";
import type { ModuleSummary } from "@/lib/api/types";

/**
 * Cartão de módulo no catálogo.
 *
 * O acento vem da disciplina: a cor é orientação, não decoração — o usuário
 * reconhece a área antes de ler o título. É a única coisa no cartão que muda
 * de cor, e por isso ela funciona.
 *
 * A barra de 2px ao lado do nome da área repete o gesto que a lista de áreas
 * da landing usa. Mesma marca, mesmo significado, em duas telas diferentes.
 */
export function ModuleCard({ module }: { module: ModuleSummary }) {
  return (
    <Link
      href={`/modulos/${module.slug}`}
      className="card elev-sm group gap-0 p-5 transition-[box-shadow,transform] duration-200 ease-[var(--ease-out-instrument)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
      style={{ ["--accent" as string]: accentVariable(module.discipline?.accent) }}
    >
      <div className="flex items-center gap-2">
        {module.discipline ? (
          <span className="flex items-center gap-2 text-[11px] tracking-wide text-[var(--accent)] uppercase">
            <span aria-hidden className="block h-3 w-0.5 bg-[var(--accent)]" />
            {module.discipline.name}
          </span>
        ) : null}
        <span className="text-[11px] text-[var(--color-neutral-500)]">
          · {module.kindLabel}
        </span>
      </div>

      <h3 className="mt-2.5 text-[17px] leading-snug transition-colors group-hover:text-[var(--accent)]">
        {module.title}
      </h3>

      {module.subtitle ? (
        <p className="mt-1 text-[13px] text-[var(--color-neutral-400)]">{module.subtitle}</p>
      ) : null}

      {module.summary ? (
        <p className="mt-2.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-[var(--color-neutral-500)]">
          {module.summary}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge>{module.difficultyLabel}</Badge>
        {module.estimatedMinutes ? (
          <span className="num text-[11px] text-[var(--color-neutral-500)]">
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
