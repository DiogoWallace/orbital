import Link from "next/link";
import { ModuleCard } from "@/components/catalog/ModuleCard";
import { getDisciplines, getModules } from "@/lib/api/catalog";
import { accentVariable } from "@/lib/utils";

export const metadata = { title: "Explorar" };

/**
 * Catálogo com filtros.
 *
 * Os filtros vivem na URL, não em estado de componente: um recorte do catálogo
 * é compartilhável, volta pelo botão de voltar e é renderizado no servidor.
 */
export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const disciplina = typeof params.disciplina === "string" ? params.disciplina : undefined;
  const busca = typeof params.busca === "string" ? params.busca : undefined;

  const [{ data: disciplines }, modules] = await Promise.all([
    getDisciplines(),
    getModules({ discipline: disciplina, search: busca, perPage: 24 }),
  ]);

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Explorar</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          {modules.meta.total} {modules.meta.total === 1 ? "módulo" : "módulos"} no
          catálogo.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar por área">
        <FilterChip href="/explorar" active={!disciplina} label="Tudo" />
        {disciplines.map((discipline) => (
          <FilterChip
            key={discipline.slug}
            href={`/explorar?disciplina=${discipline.slug}`}
            active={disciplina === discipline.slug}
            label={discipline.name}
            accent={discipline.accent}
          />
        ))}
      </nav>

      {modules.data.length === 0 ? (
        <p className="mt-16 text-center text-sm text-[var(--color-ink-faint)]">
          Nenhum módulo corresponde a esse recorte.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.data.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
  accent,
}: {
  href: string;
  label: string;
  active: boolean;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={accent ? { ["--accent" as string]: accentVariable(accent) } : undefined}
      className={
        active
          ? "rounded-full border border-[var(--accent)] px-3.5 py-1.5 text-xs text-[var(--accent)]"
          : "rounded-full border border-[var(--color-line-strong)] px-3.5 py-1.5 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }
    >
      {label}
    </Link>
  );
}
