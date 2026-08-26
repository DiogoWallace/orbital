import Image from "next/image";
import Link from "next/link";
import { FeedRow } from "@/components/blog/FeedRow";
import { getPosts } from "@/lib/api/blog";
import { getModules } from "@/lib/api/catalog";
import { formatarDataFeed } from "@/lib/datas";
import type { PostSummary, Tag } from "@/lib/api/types";

export const metadata = {
  title: "Feed",
  description:
    "Notícias de pesquisa, notas autorais, bastidores da plataforma e resultados publicados por quem usa o laboratório.",
};

/**
 * As seções editoriais do feed, na ordem em que o controle as apresenta.
 *
 * Lista fixa, e não os assuntos que por acaso apareceram nesta página: um
 * filtro que muda de opções conforme você pagina não é um filtro, é uma
 * surpresa. Os slugs são os mesmos que o rodapé usa, então os dois caminhos
 * levam ao mesmo recorte.
 */
const secoes: Array<{ label: string; tag?: string }> = [
  { label: "Tudo" },
  { label: "Notícias", tag: "noticias" },
  { label: "Pesquisa", tag: "pesquisa" },
  { label: "Resultados", tag: "resultados" },
];

/** Os assuntos presentes nesta página, sem repetição e na ordem de aparição. */
function assuntosDaPagina(posts: PostSummary[]): Tag[] {
  const vistos = new Map<string, Tag>();

  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      if (!vistos.has(tag.slug)) vistos.set(tag.slug, tag);
    }
  }

  return [...vistos.values()];
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; tag?: string }>;
}) {
  const { pagina, tag } = await searchParams;
  const page = Number(pagina) > 0 ? Number(pagina) : 1;

  const [posts, modules] = await Promise.all([
    getPosts({ page, tag, perPage: 10 }),
    // Um módulo só, para a chamada do laboratório na barra lateral.
    getModules({ perPage: 1 }),
  ]);

  const { current_page: atual, last_page: ultima } = posts.meta;
  const modulo = modules.data[0];
  const assuntos = assuntosDaPagina(posts.data);

  // A capa grande é do item mais recente, e só na primeira página do feed sem
  // recorte: ela é a manchete da semana. Repetida no topo de cada página de
  // paginação, viraria só a primeira linha de novo, um pouco maior.
  const manchete = atual === 1 && !tag ? posts.data[0] : undefined;
  const restante = manchete ? posts.data.slice(1) : posts.data;

  return (
    <>
      <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end lg:gap-8">
        <div>
          <h6 className="text-[var(--color-neutral-500)]">
            Central de notícias e pesquisa
          </h6>
          <h1 className="mt-3 text-[40px] tracking-[-0.025em]">Feed</h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
            Um fluxo cronológico só: notícias de pesquisa, notas autorais,
            bastidores da plataforma e resultados publicados por quem usa o
            laboratório.
          </p>
        </div>

        {/* Links, e não rádios: cada recorte precisa ter URL própria para ser
            compartilhada e voltar pelo botão de voltar. O `.seg` do sistema
            reconhece `aria-current` além do `:checked` justamente para isso. */}
        <nav className="seg shrink-0 self-start" aria-label="Seções do feed">
          {secoes.map((secao) => {
            const ativo = (secao.tag ?? undefined) === tag;

            return (
              <Link
                key={secao.label}
                href={secao.tag ? `/blog?tag=${secao.tag}` : "/blog"}
                aria-current={ativo ? "true" : undefined}
                className="seg-opt"
              >
                {secao.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mt-8.5 grid items-start gap-12 lg:grid-cols-[1fr_300px]">
        <div>
          {posts.data.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--color-neutral-500)]">
              Nada publicado neste recorte ainda.
            </p>
          ) : null}

          {manchete ? <Manchete post={manchete} /> : null}

          <div className={manchete ? "mt-2" : undefined}>
            {restante.map((post) => (
              <FeedRow key={post.id} post={post} />
            ))}
          </div>

          {/* Paginação por link, e não por botão com JavaScript: cada página do
              feed precisa ter URL própria para ser indexada e compartilhada. */}
          {ultima > 1 ? (
            <nav
              aria-label="Paginação"
              className="mt-7 flex items-center justify-between text-[13px]"
            >
              {atual > 1 ? (
                <Link href={paginaHref(atual - 1, tag)} className="btn btn-ghost">
                  ← Mais recentes
                </Link>
              ) : (
                <span className="text-[var(--color-neutral-600)]">← Mais recentes</span>
              )}

              <span className="num text-xs text-[var(--color-neutral-500)]">
                {atual} de {ultima}
              </span>

              {atual < ultima ? (
                <Link href={paginaHref(atual + 1, tag)} className="btn btn-ghost">
                  Mais antigos →
                </Link>
              ) : (
                <span className="text-[var(--color-neutral-600)]">Mais antigos →</span>
              )}
            </nav>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6.5 lg:sticky lg:top-[86px]">
          {assuntos.length > 0 ? (
            <div>
              <h6 className="mb-2.5 text-[var(--color-neutral-500)]">
                Filtrar por assunto
              </h6>
              <div className="flex flex-wrap gap-1.5">
                <Link href="/blog" className={tag ? "tag tag-neutral" : "tag tag-outline"}>
                  Tudo
                </Link>
                {assuntos.map((assunto) => (
                  <Link
                    key={assunto.slug}
                    href={`/blog?tag=${assunto.slug}`}
                    className={
                      tag === assunto.slug ? "tag tag-outline" : "tag tag-neutral"
                    }
                  >
                    {assunto.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {modulo ? (
            <div className="card elev-sm gap-0 p-4.5">
              <span className="card-kicker">Do laboratório</span>
              <h4 className="mt-2.5 text-[17px]">{modulo.title}</h4>
              {modulo.summary ? (
                <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
                  {modulo.summary}
                </p>
              ) : null}
              <div className="num mt-3 flex gap-3 text-[11px] text-[var(--color-neutral-500)]">
                <span>{modulo.difficultyLabel}</span>
                {modulo.estimatedMinutes ? <span>{modulo.estimatedMinutes} min</span> : null}
              </div>
              <Link
                href={`/modulos/${modulo.slug}`}
                className="btn btn-primary btn-block mt-3.5"
              >
                Abrir simulação
              </Link>
            </div>
          ) : null}

          <div>
            <h6 className="mb-3 text-[var(--color-neutral-500)]">Publicar no feed</h6>
            <p className="text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
              Salvou uma execução que contraria a intuição? Transforme em nota: os
              parâmetros viram um bloco reprodutível dentro do texto.
            </p>
            <Link href="/login?proximo=/dashboard" className="btn btn-secondary btn-block mt-3">
              Entrar para publicar
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

function paginaHref(pagina: number, tag?: string): string {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (pagina > 1) params.set("pagina", String(pagina));

  const query = params.toString();

  return query ? `/blog?${query}` : "/blog";
}

/**
 * A manchete: o item mais recente, apresentado com capa e em duas colunas.
 *
 * Sem capa cadastrada ele vira uma linha comum — inventar uma imagem de banco
 * para preencher a coluna esquerda seria pior do que não ter manchete.
 */
function Manchete({ post }: { post: PostSummary }) {
  if (!post.coverPath) return <FeedRow post={post} />;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group grid items-center overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:grid-cols-[300px_1fr] sm:gap-6"
    >
      <div className="relative h-full min-h-[220px] overflow-hidden bg-[#0f111a]">
        <Image
          src={post.coverPath}
          alt=""
          fill
          sizes="(min-width: 640px) 300px, 100vw"
          className="lighten object-cover"
        />
      </div>

      <div className="p-5.5 sm:py-5.5 sm:pr-6 sm:pl-0">
        <div className="flex items-center gap-2.5">
          <span className="tag tag-accent">{post.tags?.[0]?.name ?? "Nota"}</span>
          <span className="num text-[11px] text-[var(--color-neutral-500)]">
            {formatarDataFeed(post.publishedAt)} · {post.readingMinutes} min
            {post.commentsCount
              ? ` · ${post.commentsCount} comentário${post.commentsCount === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>

        <h2 className="mt-3 max-w-[26ch] text-[27px] tracking-[-0.02em] transition-colors group-hover:text-[var(--color-accent)]">
          {post.title}
        </h2>

        {post.excerpt ? (
          <p className="mt-2.5 max-w-[56ch] text-sm leading-relaxed text-[var(--color-neutral-300)]">
            {post.excerpt}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
