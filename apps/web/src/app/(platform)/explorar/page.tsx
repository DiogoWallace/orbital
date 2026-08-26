import Link from "next/link";
import { ModuleCard } from "@/components/catalog/ModuleCard";
import { getDisciplines, getModules } from "@/lib/api/catalog";
import { accentVariable } from "@/lib/utils";

export const metadata = { title: "Laboratório" };

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
        <h6 className="text-[var(--color-neutral-500)]">Catálogo de experimentos</h6>
        <h1 className="mt-3 text-[40px] tracking-[-0.025em]">Laboratório</h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
          {modules.meta.total} {modules.meta.total === 1 ? "módulo" : "módulos"} para
          abrir e mexer. A simulação roda no seu navegador — nada aqui exige conta.
        </p>
      </header>

      {busca ? (
        <p className="mt-6 text-xs text-[var(--color-neutral-500)]">
          Buscando por <span className="text-[var(--color-text)]">{busca}</span> ·{" "}
          <Link href="/explorar" className="text-[var(--color-accent)] hover:underline">
            limpar
          </Link>
        </p>
      ) : null}

      <nav className="mt-6 flex flex-wrap gap-1.5" aria-label="Filtrar por área">
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
        <p className="mt-16 text-center text-sm text-[var(--color-neutral-500)]">
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

/**
 * Chip de filtro.
 *
 * O ativo é contornado com o acento da própria área e os inativos ficam
 * preenchidos em neutro: assim o recorte em vigor é a única coisa colorida da
 * fila, e a cor já diz qual área é.
 */
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
      className={active ? "tag tag-outline" : "tag tag-neutral"}
    >
      {label}
    </Link>
  );
}
