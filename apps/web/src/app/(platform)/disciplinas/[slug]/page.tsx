import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleCard } from "@/components/catalog/ModuleCard";
import { getDiscipline, getModules } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { accentVariable } from "@/lib/utils";
import type { Discipline } from "@/lib/api/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadDiscipline(slug: string): Promise<Discipline | null> {
  try {
    const { data } = await getDiscipline(slug);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const discipline = await loadDiscipline(slug);

  return { title: discipline?.name ?? "Área não encontrada" };
}

export default async function DisciplinaPage({ params }: PageProps) {
  const { slug } = await params;

  const [discipline, modules] = await Promise.all([
    loadDiscipline(slug),
    getModules({ discipline: slug, perPage: 24 }),
  ]);

  if (!discipline) notFound();

  return (
    <div style={{ ["--accent" as string]: accentVariable(discipline.accent) }}>
      <header className="border-b border-[var(--color-line)] pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--accent)]">
          {discipline.name}
        </h1>
        {discipline.tagline ? (
          <p className="mt-2 text-lg text-[var(--color-ink-muted)]">
            {discipline.tagline}
          </p>
        ) : null}
        {discipline.description ? (
          <p className="mt-4 max-w-3xl leading-relaxed text-[var(--color-ink-faint)]">
            {discipline.description}
          </p>
        ) : null}
      </header>

      {discipline.topics && discipline.topics.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs tracking-wide text-[var(--color-ink-faint)] uppercase">
            Tópicos
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {discipline.topics.map((topic) => (
              <li
                key={topic.id}
                className="rounded-[var(--radius-panel)] border border-[var(--color-line)] px-4 py-3"
              >
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {topic.name}
                </p>
                {topic.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-faint)]">
                    {topic.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xs tracking-wide text-[var(--color-ink-faint)] uppercase">
          Módulos
        </h2>

        {modules.data.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--color-ink-faint)]">
            Ainda não há módulos publicados nesta área.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.data.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
