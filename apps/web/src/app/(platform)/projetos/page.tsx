import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
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
        <h6 className="text-[var(--color-neutral-500)]">Sequências de módulos</h6>
        <h1 className="mt-3 text-[40px] tracking-[-0.025em]">Projetos</h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
          Sequências de módulos que investigam uma pergunta do começo ao fim.
        </p>
      </header>

      {projects.data.length === 0 ? (
        <p className="mt-16 text-center text-sm text-[var(--color-neutral-500)]">
          Nenhum projeto publicado ainda.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {projects.data.map((project) => (
            <Link
              key={project.id}
              href={`/projetos/${project.slug}`}
              className="card elev-sm group gap-0 p-6"
            >
              <div className="flex items-center gap-2">
                <Badge tone="accent">{project.kindLabel}</Badge>
                <span className="num text-xs text-[var(--color-neutral-500)]">
                  {project.modulesCount ?? 0}{" "}
                  {project.modulesCount === 1 ? "módulo" : "módulos"}
                </span>
              </div>

              <h2 className="mt-3 text-[20px] transition-colors group-hover:text-[var(--color-accent)]">
                {project.title}
              </h2>

              {project.summary ? (
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-neutral-400)]">
                  {project.summary}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
