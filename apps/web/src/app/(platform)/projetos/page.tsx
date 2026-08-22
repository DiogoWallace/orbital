import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { getProjects } from "@/lib/api/catalog";

export const metadata = { title: "Projetos" };

/**
 * Projetos agrupam módulos numa linha de raciocínio.
 *
 * A distinção importa: o módulo é a peça, o projeto é o argumento. Sem esse
 * segundo nível, um catálogo com centenas de módulos vira uma lista sem tese.
 */
export default async function ProjetosPage() {
  const projects = await getProjects();

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
          Sequências de módulos que investigam uma pergunta do começo ao fim.
        </p>
      </header>

      {projects.data.length === 0 ? (
        <p className="mt-16 text-center text-sm text-[var(--color-ink-faint)]">
          Nenhum projeto publicado ainda.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {projects.data.map((project) => (
            <Panel key={project.id} as="article" className="p-6">
              <div className="flex items-center gap-2">
                <Badge tone="accent">{project.kindLabel}</Badge>
                <span className="text-xs text-[var(--color-ink-faint)]">
                  {project.modulesCount ?? 0}{" "}
                  {project.modulesCount === 1 ? "módulo" : "módulos"}
                </span>
              </div>

              <h2 className="mt-3 text-lg font-medium">
                <Link
                  href={`/projetos/${project.slug}`}
                  className="transition-colors hover:text-[var(--accent)]"
                >
                  {project.title}
                </Link>
              </h2>

              {project.summary ? (
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {project.summary}
                </p>
              ) : null}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
