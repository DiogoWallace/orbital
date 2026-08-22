import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleCard } from "@/components/catalog/ModuleCard";
import { Badge } from "@/components/ui/Badge";
import { getProject } from "@/lib/api/catalog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  return {
    title: project?.title ?? "Projeto não encontrado",
    description: project?.summary ?? undefined,
  };
}

export default async function ProjetoPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  return (
    <article>
      <header className="border-b border-[var(--color-line)] pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{project.kindLabel}</Badge>
          <Badge>{project.statusLabel}</Badge>
          {project.startedAt ? (
            <span className="tabular text-xs text-[var(--color-ink-faint)]">
              início {new Date(project.startedAt).toLocaleDateString("pt-BR")}
            </span>
          ) : null}
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance">
          {project.title}
        </h1>

        {project.summary ? (
          <p className="mt-3 max-w-3xl text-lg text-[var(--color-ink-muted)]">
            {project.summary}
          </p>
        ) : null}
      </header>

      {project.description ? (
        <div className="mx-auto max-w-3xl py-8">
          {project.description.split("\n\n").map((paragraph, index) => (
            <p
              key={index}
              className="mt-4 text-sm leading-relaxed text-[var(--color-ink-muted)]"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {project.modules && project.modules.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-xs tracking-wide text-[var(--color-ink-faint)] uppercase">
            Percurso
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.modules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
