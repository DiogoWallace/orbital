import Link from "next/link";
import { ModuleCard } from "@/components/catalog/ModuleCard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getDisciplines, getModules } from "@/lib/api/catalog";
import { accentVariable } from "@/lib/utils";

/**
 * Landing page.
 *
 * Server Component com dados revalidados por tempo: a página chega pronta do
 * servidor, sem esqueleto de carregamento. Numa vitrine, o primeiro quadro é o
 * argumento.
 */
export default async function LandingPage() {
  const [{ data: disciplines }, modules] = await Promise.all([
    getDisciplines(),
    getModules({ perPage: 3 }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="grid-paper border-b border-[var(--color-line)]">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <p className="text-xs tracking-[0.2em] text-[var(--accent)] uppercase">
              Laboratório digital
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              Conceitos complexos deixam de ser abstratos quando você pode mexer
              neles.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-muted)]">
              Orbital reúne simulações interativas, visualizações e análise de
              dados em física, astronomia, engenharia e química. Cada módulo é um
              experimento que roda no seu navegador — ajuste as variáveis e veja
              o resultado no mesmo quadro.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/explorar"
                className="rounded-[var(--radius-control)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-void)] transition-[filter] hover:brightness-110"
              >
                Explorar módulos
              </Link>
              <Link
                href="/modulos/orbital-sandbox"
                className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-5 py-2.5 text-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Ver uma simulação
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-sm tracking-wide text-[var(--color-ink-faint)] uppercase">
            Áreas
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((discipline) => (
              <Link
                key={discipline.slug}
                href={`/disciplinas/${discipline.slug}`}
                className="group rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-colors hover:border-[var(--accent)]"
                style={{ ["--accent" as string]: accentVariable(discipline.accent) }}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-medium text-[var(--accent)]">
                    {discipline.name}
                  </h3>
                  <span className="tabular text-xs text-[var(--color-ink-faint)]">
                    {discipline.modulesCount ?? 0}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {discipline.tagline}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {modules.data.length > 0 ? (
          <section className="mx-auto max-w-7xl px-6 pb-20">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm tracking-wide text-[var(--color-ink-faint)] uppercase">
                Publicados recentemente
              </h2>
              <Link
                href="/explorar"
                className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Ver todos
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.data.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
