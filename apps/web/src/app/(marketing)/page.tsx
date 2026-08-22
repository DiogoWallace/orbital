import Link from "next/link";
import { ModuleCard } from "@/components/catalog/ModuleCard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { WebbCard } from "@/components/marketing/WebbCard";
import { WebbHero } from "@/components/marketing/WebbHero";
import { getDisciplines, getModules } from "@/lib/api/catalog";
import { accentVariable } from "@/lib/utils";
import { galeriaWebb } from "@/lib/webb";

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
        <WebbHero />

        {/* --- O que é isto ------------------------------------------------ */}
        <section className="grid-paper border-b border-[var(--color-line)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-sm tracking-wide text-[var(--color-ink-faint)] uppercase">
                O projeto
              </h2>
              <p className="mt-4 text-2xl leading-snug font-medium tracking-tight text-balance">
                Um laboratório digital, não uma enciclopédia.
              </p>
            </div>

            <div className="space-y-4 text-base leading-relaxed text-[var(--color-ink-muted)]">
              <p>
                Ler que a velocidade orbital cai com a altitude é uma coisa. Arrastar
                a altitude e ver a órbita se abrir em elipse é outra. O Orbital existe
                para a segunda: cada módulo é um experimento completo, com física
                própria, parâmetros que você controla e resultados que aparecem no
                mesmo quadro.
              </p>
              <p>
                A simulação roda no seu navegador, não em um servidor — o que
                significa resposta imediata a cada ajuste, e nenhum limite de quantas
                vezes você pode tentar. Salvar uma execução, comparar cenários e
                reunir tudo em um projeto exige conta; explorar, não.
              </p>
              <p className="text-[var(--color-ink-faint)]">
                Os modelos são simplificações didáticas, honestas sobre o que
                simplificam. Cada módulo declara suas hipóteses e a faixa em que vale.
              </p>
            </div>
          </div>
        </section>

        {/* --- Galeria Webb ------------------------------------------------ */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="text-sm tracking-wide text-[var(--color-ink-faint)] uppercase">
              O céu como dado
            </h2>
            <p className="mt-4 text-2xl leading-snug font-medium tracking-tight text-balance">
              Cada imagem do James Webb é um conjunto de medidas antes de ser uma
              paisagem.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-ink-muted)]">
              As cores são escolhas: o telescópio enxerga no infravermelho, invisível
              para nós, e cada faixa de comprimento de onda recebe uma cor para que o
              olho consiga ler o que o detector registrou. É a mesma tradução que a
              plataforma faz em todo módulo — de número para forma.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {galeriaWebb.map((imagem) => (
              <WebbCard key={imagem.id} imagem={imagem} />
            ))}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-[var(--color-ink-faint)]">
            Imagens da ESA/Webb, sob licença{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-[var(--accent)]"
            >
              Creative Commons Attribution 4.0 International
            </a>
            . Os dados de cada objeto vêm das páginas de divulgação em{" "}
            <a
              href="https://esawebb.org/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-[var(--accent)]"
            >
              esawebb.org
            </a>
            . O Orbital não é afiliado à ESA, à NASA nem à CSA.
          </p>
        </section>

        {/* --- Áreas ------------------------------------------------------- */}
        <section className="border-t border-[var(--color-line)]">
          <div className="mx-auto max-w-7xl px-6 py-20">
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
          </div>
        </section>

        {/* --- Publicados recentemente ------------------------------------- */}
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
