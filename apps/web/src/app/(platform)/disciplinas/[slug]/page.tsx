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

/**
 * Uma área do catálogo.
 *
 * O acento da disciplina é sobrescrito no contêiner inteiro: tudo que usa
 * `--accent` daqui para baixo — cartão de módulo, foco de teclado, seleção de
 * texto — se recolore junto, sem que nenhum componente precise saber em que
 * área está sendo renderizado.
 */
export default async function DisciplinaPage({ params }: PageProps) {
  const { slug } = await params;

  const [discipline, modules] = await Promise.all([
    loadDiscipline(slug),
    getModules({ discipline: slug, perPage: 24 }),
  ]);

  if (!discipline) notFound();

  return (
    <div style={{ ["--accent" as string]: accentVariable(discipline.accent) }}>
      <header className="rule-bottom pb-8">
        <h6 className="text-[var(--color-neutral-500)]">Área</h6>
        <h1 className="mt-3 flex items-center gap-3.5 text-[40px] tracking-[-0.025em]">
          <span aria-hidden className="block h-8 w-0.5 shrink-0 bg-[var(--accent)]" />
          {discipline.name}
        </h1>
        {discipline.tagline ? (
          <p className="mt-3 max-w-[60ch] text-[17px] leading-relaxed text-[var(--color-neutral-300)]">
            {discipline.tagline}
          </p>
        ) : null}
        {discipline.description ? (
          <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-[var(--color-neutral-500)]">
            {discipline.description}
          </p>
        ) : null}
      </header>

      {discipline.topics && discipline.topics.length > 0 ? (
        <section className="mt-8">
          <h6 className="text-[var(--color-neutral-500)]">Tópicos</h6>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {discipline.topics.map((topic) => (
              <li key={topic.id} className="card elev-sm gap-0 px-4 py-3.5">
                <p className="text-sm font-medium">{topic.name}</p>
                {topic.description ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-neutral-500)]">
                    {topic.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h6 className="text-[var(--color-neutral-500)]">Módulos</h6>

        {modules.data.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--color-neutral-500)]">
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
