import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleRenderer } from "@/components/module/ModuleRenderer";
import { ModuleSections } from "@/components/module/ModuleSections";
import { Badge } from "@/components/ui/Badge";
import { getModule } from "@/lib/api/catalog";
import { accentVariable } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const scienceModule = await getModule(slug);

  if (!scienceModule) return { title: "Módulo não encontrado" };

  return {
    title: scienceModule.title,
    description: scienceModule.summary ?? scienceModule.subtitle ?? undefined,
  };
}

/**
 * Casca de um módulo.
 *
 * Esta página é genérica: ela conhece metadados, taxonomia e conteúdo, e
 * delega a experiência ao componente resolvido pelo registry. É o mesmo
 * arquivo para o módulo número 1 e para o número 300 (ADR 0005).
 */
export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params;
  const scienceModule = await getModule(slug);

  if (!scienceModule) notFound();

  return (
    <article
      style={{ ["--accent" as string]: accentVariable(scienceModule.discipline?.accent) }}
    >
      <header className="border-b border-[var(--color-line)] pb-8">
        <nav className="flex items-center gap-2 text-xs text-[var(--color-ink-faint)]">
          <Link href="/explorar" className="hover:text-[var(--color-ink)]">
            Explorar
          </Link>
          {scienceModule.discipline ? (
            <>
              <span aria-hidden>/</span>
              <Link
                href={`/disciplinas/${scienceModule.discipline.slug}`}
                className="text-[var(--accent)] hover:underline"
              >
                {scienceModule.discipline.name}
              </Link>
            </>
          ) : null}
          {scienceModule.topic ? (
            <>
              <span aria-hidden>/</span>
              <span>{scienceModule.topic.name}</span>
            </>
          ) : null}
        </nav>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance">
          {scienceModule.title}
        </h1>

        {scienceModule.subtitle ? (
          <p className="mt-2 text-lg text-[var(--color-ink-muted)]">
            {scienceModule.subtitle}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{scienceModule.kindLabel}</Badge>
          <Badge>{scienceModule.difficultyLabel}</Badge>
          {scienceModule.estimatedMinutes ? (
            <span className="tabular text-xs text-[var(--color-ink-faint)]">
              {scienceModule.estimatedMinutes} min
            </span>
          ) : null}
          {scienceModule.status !== "published" ? (
            <Badge tone="warn">Rascunho — visível para curadoria</Badge>
          ) : null}
        </div>

        {scienceModule.summary ? (
          <p className="mt-6 max-w-3xl leading-relaxed text-[var(--color-ink-muted)]">
            {scienceModule.summary}
          </p>
        ) : null}
      </header>

      <div className="py-8">
        <ModuleRenderer module={scienceModule} />
      </div>

      {scienceModule.sections && scienceModule.sections.length > 0 ? (
        <div className="mx-auto max-w-3xl border-t border-[var(--color-line)] pt-10">
          <ModuleSections sections={scienceModule.sections} />
        </div>
      ) : null}

      {scienceModule.projects && scienceModule.projects.length > 0 ? (
        <aside className="mx-auto mt-12 max-w-3xl">
          <h2 className="text-xs tracking-wide text-[var(--color-ink-faint)] uppercase">
            Faz parte de
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {scienceModule.projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projetos/${project.slug}`}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
