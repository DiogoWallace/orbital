import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { WebbCard } from "@/components/marketing/WebbCard";
import { WebbHero } from "@/components/marketing/WebbHero";
import { getPosts } from "@/lib/api/blog";
import { getDisciplines, getModules, getProjects } from "@/lib/api/catalog";
import { formatarDataFeed } from "@/lib/datas";
import { accentVariable } from "@/lib/utils";
import { galeriaWebb, type WebbImage } from "@/lib/webb";
import type { PostSummary } from "@/lib/api/types";

/**
 * O ciclo que a plataforma fecha.
 *
 * Editorial e versionado no repositório: é a tese do produto, e ela muda por
 * decisão de quem escreve, não por cadastro no banco.
 */
const ciclo = [
  {
    n: "01",
    titulo: "Explore",
    texto:
      "Abra um módulo e arraste os parâmetros. Nada roda no servidor, nada exige conta.",
  },
  {
    n: "02",
    titulo: "Salve o cenário",
    texto:
      "A execução guarda os parâmetros e a versão do modelo que os interpretou.",
  },
  {
    n: "03",
    titulo: "Publique",
    texto:
      "Escreva a nota com o cenário anexado — quem lê reabre exatamente o seu estado.",
  },
];

/** As três imagens da galeria, na ordem em que a seção as apresenta. */
const galeria = ["weic2209a", "weic2208a", "weic2214a"]
  .map((id) => galeriaWebb.find((imagem) => imagem.id === id))
  .filter((imagem): imagem is WebbImage => imagem !== undefined);

/** A primeira etiqueta do post é o tipo dele na leitura do feed. */
function tipoDoPost(post: PostSummary): string {
  return post.tags?.[0]?.name ?? "Nota";
}

/**
 * Landing page.
 *
 * Server Component com dados revalidados por tempo: a página chega pronta do
 * servidor, sem esqueleto de carregamento. Numa vitrine, o primeiro quadro é o
 * argumento.
 */
export default async function LandingPage() {
  // Em paralelo: quatro leituras independentes, e encadeá-las somaria quatro
  // idas ao banco no tempo da mais lenta vezes quatro.
  const [{ data: disciplines }, modules, projects, posts] = await Promise.all([
    getDisciplines(),
    getModules({ perPage: 1 }),
    getProjects(),
    getPosts({ perPage: 4 }),
  ]);

  const numeros = [
    { valor: modules.meta.total, rotulo: "módulos no catálogo" },
    { valor: disciplines.length, rotulo: "áreas com trilha própria" },
    { valor: projects.meta.total, rotulo: "projetos publicados" },
    { valor: posts.meta.total, rotulo: "notas publicadas" },
  ];

  const [destaque, ...secundarios] = posts.data;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <WebbHero />

        {/* --- Números ----------------------------------------------------- */}
        {/* O índigo saturado desta faixa é chão de seção, não cor de
            componente: ele existe para cortar a página entre a abertura e o
            argumento, e é o único bloco colorido da landing inteira. */}
        <section className="bg-[var(--color-section)]">
          <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-7 px-7 py-8.5 lg:grid-cols-4">
            {numeros.map((numero) => (
              <div key={numero.rotulo}>
                <div className="num text-[34px] leading-none font-medium tracking-[-0.03em]">
                  {numero.valor.toLocaleString("pt-BR")}
                </div>
                <div className="mt-1.5 text-xs text-[color-mix(in_srgb,#e9e9ed_68%,transparent)]">
                  {numero.rotulo}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- O ciclo ----------------------------------------------------- */}
        <section id="o-projeto" className="mx-auto max-w-[1240px] px-7 pt-21">
          <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h6 className="text-[var(--color-neutral-500)]">O ciclo</h6>
              <h2 className="mt-3.5 max-w-[20ch] text-[30px] tracking-[-0.02em]">
                Do experimento à publicação, sem trocar de ferramenta.
              </h2>
              <p className="mt-3.5 max-w-[40ch] text-sm leading-relaxed text-[var(--color-neutral-400)]">
                Era isso que faltava: o blog e o laboratório viviam em endereços
                diferentes. Agora um resultado salvo vira nota publicada em três
                passos.
              </p>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              {ciclo.map((etapa) => (
                <div key={etapa.n} className="card elev-sm gap-0 p-4.5">
                  <span className="num text-xs font-medium text-[var(--color-accent)]">
                    {etapa.n}
                  </span>
                  <div aria-hidden className="mt-2.5 h-0.5 w-6.5 bg-[var(--color-accent)]" />
                  <h4 className="mt-3.5 text-[17px]">{etapa.titulo}</h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
                    {etapa.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- No feed esta semana ----------------------------------------- */}
        {destaque ? (
          <section className="mx-auto max-w-[1240px] px-7 pt-19">
            <div className="flex items-baseline justify-between">
              <h6 className="text-[var(--color-neutral-500)]">No feed esta semana</h6>
              <Link href="/blog" className="btn btn-ghost text-[13px]">
                Ver tudo →
              </Link>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
              <Link
                href={`/blog/${destaque.slug}`}
                className="group block overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
              >
                {destaque.coverPath ? (
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#0f111a]">
                    <Image
                      src={destaque.coverPath}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      className="lighten object-cover"
                    />
                  </div>
                ) : null}

                <div className="px-5.5 pt-5 pb-5.5">
                  <div className="flex items-center gap-2.5">
                    <span className="tag tag-accent">{tipoDoPost(destaque)}</span>
                    <span className="num text-[11px] text-[var(--color-neutral-500)]">
                      {formatarDataFeed(destaque.publishedAt)} ·{" "}
                      {destaque.readingMinutes} min
                    </span>
                  </div>

                  <h3 className="mt-3 max-w-[28ch] text-[26px] tracking-[-0.02em] transition-colors group-hover:text-[var(--color-accent)]">
                    {destaque.title}
                  </h3>

                  {destaque.excerpt ? (
                    <p className="mt-2.5 max-w-[58ch] text-sm leading-relaxed text-[var(--color-neutral-300)]">
                      {destaque.excerpt}
                    </p>
                  ) : null}

                  {destaque.author ? (
                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-neutral-500)]">
                      <span
                        aria-hidden
                        className="inline-flex size-5.5 items-center justify-center rounded-full bg-[var(--color-accent-800)] text-[10px] text-[var(--color-accent-100)]"
                      >
                        {iniciais(destaque.author.name)}
                      </span>
                      {destaque.author.name}
                    </div>
                  ) : null}
                </div>
              </Link>

              <div className="flex flex-col gap-3.5">
                {secundarios.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="card elev-sm group gap-0 px-4.5 py-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="tag tag-neutral">{tipoDoPost(post)}</span>
                      <span className="num text-[11px] text-[var(--color-neutral-500)]">
                        {formatarDataFeed(post.publishedAt)}
                      </span>
                    </div>
                    <h4 className="mt-2.5 text-[17px] leading-tight transition-colors group-hover:text-[var(--color-accent)]">
                      {post.title}
                    </h4>
                    {post.excerpt ? (
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
                        {post.excerpt}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* --- Áreas ------------------------------------------------------- */}
        {/* Lista, e não grade de cartões. São cinco itens de uma taxonomia:
            empilhados numa coluna eles se comparam linha a linha, e o nome, a
            promessa e a contagem ficam alinhados verticalmente entre si. */}
        <section id="areas" className="mx-auto max-w-[1240px] px-7 pt-19">
          <h6 className="text-[var(--color-neutral-500)]">Áreas</h6>

          <div className="mt-4.5">
            {disciplines.map((discipline) => (
              <Link
                key={discipline.slug}
                href={`/disciplinas/${discipline.slug}`}
                style={{ ["--accent" as string]: accentVariable(discipline.accent) }}
                className="row-link grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-1 py-4 sm:grid-cols-[220px_1fr_120px_24px]"
              >
                <span className="flex items-center gap-2.5 text-[19px] font-medium tracking-[-0.015em]">
                  <span aria-hidden className="block h-[17px] w-0.5 bg-[var(--accent)]" />
                  {discipline.name}
                </span>
                <span className="col-span-2 text-[13px] text-[var(--color-neutral-400)] sm:col-span-1">
                  {discipline.tagline}
                </span>
                <span className="num text-xs text-[var(--color-neutral-500)]">
                  {discipline.modulesCount ?? 0} módulos
                </span>
                <span aria-hidden className="hidden text-right text-[var(--color-neutral-500)] sm:block">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* --- O céu como dado --------------------------------------------- */}
        <section id="ceu" className="mx-auto max-w-[1240px] px-7 pt-19">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end lg:gap-8">
            <div>
              <h6 className="text-[var(--color-neutral-500)]">O céu como dado</h6>
              <h2 className="mt-3.5 max-w-[28ch] text-[30px] tracking-[-0.02em]">
                Cada imagem é um conjunto de medidas antes de ser uma paisagem.
              </h2>
            </div>
            <p className="max-w-[40ch] text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
              Cada faixa de comprimento de onda recebe uma cor para que o olho leia
              o que o detector registrou — a mesma tradução que a plataforma faz em
              todo módulo.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galeria.map((imagem) => (
              <WebbCard key={imagem.id} imagem={imagem} />
            ))}
          </div>

          <p
            id="licencas"
            className="mt-5.5 max-w-[80ch] text-[11px] leading-relaxed text-[var(--color-neutral-500)]"
          >
            Imagens da ESA/Webb sob{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-accent)]"
            >
              CC BY 4.0
            </a>
            ; dados de divulgação em{" "}
            <a
              href="https://esawebb.org/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-accent)]"
            >
              esawebb.org
            </a>
            . O Orbital não é afiliado à ESA, à NASA nem à CSA.
          </p>
        </section>

        {/* --- Chamada final ----------------------------------------------- */}
        <section className="mx-auto max-w-[1240px] px-7 pt-21 pb-24">
          <div className="grid items-center gap-8 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-11 py-10 shadow-[var(--shadow-sm)] lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="max-w-[26ch] text-[28px] tracking-[-0.02em]">
                Tem um resultado que vale ser lido?
              </h2>
              <p className="mt-2.5 max-w-[56ch] text-sm leading-relaxed text-[var(--color-neutral-400)]">
                Conta gratuita para salvar execuções, montar projetos e publicar
                notas revisadas pela curadoria. Explorar não exige conta.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/login?modo=criar"
                className="btn btn-primary px-4.5 py-2.5 text-[15px]"
              >
                Criar conta
              </Link>
              <Link href="/explorar" className="btn btn-secondary px-4.5 py-2.5 text-[15px]">
                Ver um módulo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** `Ana Rocha` → `AR`. Duas letras é o que cabe no círculo de 22px. */
function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}
