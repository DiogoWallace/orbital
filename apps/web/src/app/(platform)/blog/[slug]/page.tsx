import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CommentThread } from "@/components/community/CommentThread";
import { LikeButton } from "@/components/community/LikeButton";
import { Avatar } from "@/components/community/Avatar";
import { Badge } from "@/components/ui/Badge";
import { getPost, getPosts } from "@/lib/api/blog";
import { getCurrentUser, getModules } from "@/lib/api/catalog";
import { formatarDataLonga } from "@/lib/datas";
import { extrairSumario, slugificar, textoDe } from "@/lib/markdown";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return { title: "Post não encontrado" };

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverPath ? [post.coverPath] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  const [post, viewer] = await Promise.all([getPost(slug), getCurrentUser()]);

  // A API já devolve 404 para rascunho alheio (a policy decide). Aqui só
  // traduzimos isso na página — nenhuma regra de visibilidade vive no
  // frontend, que é onde ela seria fácil de contornar.
  if (!post) notFound();

  const assunto = post.tags?.[0];

  // A ponte para o laboratório e a lista do "leia depois" saem da mesma
  // etiqueta que classifica o post. Nenhuma relação nova no banco: se um
  // módulo compartilha o assunto da nota, ele é o experimento que a nota
  // descreve — e quando não há, a ponte simplesmente não aparece, em vez de
  // apontar para um módulo qualquer só para preencher o bloco.
  const [pontes, mesmoAssunto, recentes] = await Promise.all([
    assunto ? getModules({ tag: assunto.slug, perPage: 1 }) : null,
    assunto ? getPosts({ tag: assunto.slug, perPage: 4 }) : null,
    getPosts({ perPage: 4 }),
  ]);

  const ponte = pontes?.data[0];
  const sumario = extrairSumario(post.body);

  // Do mesmo assunto primeiro, completando com os mais recentes. Um assunto
  // com uma nota só é o caso normal de um feed novo, e uma lateral vazia ali
  // é pior do que uma sugestão menos parente: quem terminou de ler está no
  // instante exato em que aceita ler outra coisa.
  const leiaDepois = [...(mesmoAssunto?.data ?? []), ...recentes.data]
    .filter(
      (outro, indice, lista) =>
        outro.slug !== post.slug &&
        lista.findIndex((candidato) => candidato.slug === outro.slug) === indice,
    )
    .slice(0, 3);

  return (
    <>
      <nav
        aria-label="Trilha"
        className="flex items-center gap-2 text-xs text-[var(--color-neutral-500)]"
      >
        <Link href="/blog" className="text-[var(--color-neutral-400)] hover:text-[var(--color-accent)]">
          Feed
        </Link>
        {post.tags?.map((tag) => (
          <span key={tag.slug} className="flex items-center gap-2">
            <span aria-hidden>/</span>
            <Link href={`/blog?tag=${tag.slug}`} className="hover:text-[var(--color-accent)]">
              {tag.name}
            </Link>
          </span>
        ))}
      </nav>

      <header className="mt-6.5 max-w-[44ch]">
        <div className="flex flex-wrap items-center gap-2.5">
          {assunto ? <span className="tag tag-accent">{assunto.name}</span> : null}
          <span className="num text-[11px] text-[var(--color-neutral-500)]">
            <time dateTime={post.publishedAt ?? undefined}>
              {formatarDataLonga(post.publishedAt)}
            </time>{" "}
            · {post.readingMinutes} min de leitura
          </span>
          {post.status !== "published" ? <Badge tone="warn">Rascunho</Badge> : null}
        </div>

        <h1 className="mt-4 text-[34px] leading-[1.06] tracking-[-0.03em] text-balance sm:text-[46px]">
          {post.title}
        </h1>
      </header>

      {post.excerpt ? (
        <p className="mt-5 max-w-[62ch] text-[19px] leading-[1.55] text-[var(--color-neutral-300)]">
          {post.excerpt}
        </p>
      ) : null}

      {/* Assinatura e ações na mesma linha, fechada por uma régua: é a fronteira
          entre "quem escreveu isto" e o texto propriamente dito. */}
      <div className="rule-bottom mt-6.5 flex flex-wrap items-center gap-3.5 pb-5.5">
        {post.author ? (
          <>
            <Avatar name={post.author.name} username={String(post.author.id)} />
            <div className="text-[13px]">
              <div>{post.author.name}</div>
              <div className="text-xs text-[var(--color-neutral-500)]">
                {assunto ? `${assunto.name} · ` : ""}
                {post.commentsCount ?? 0} comentário
                {(post.commentsCount ?? 0) === 1 ? "" : "s"}
              </div>
            </div>
          </>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <LikeButton
            endpoint={`/api/posts/${post.slug}/like`}
            liked={post.liked ?? false}
            count={post.likesCount ?? 0}
            autenticado={viewer !== null && viewer.emailVerified}
            rotulo="Curtir este post"
          />
          <a href="#comentarios" className="btn btn-secondary text-[13px]">
            Comentar
          </a>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-14 lg:grid-cols-[minmax(0,1fr)_296px]">
        <article>
          {post.coverPath ? (
            <figure>
              <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] bg-[#0f111a]">
                <Image
                  src={post.coverPath}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="lighten object-cover"
                />
              </div>
              {/* O crédito vem no mesmo recurso da capa e é renderizado sempre
                  que existe: a licença das imagens que usamos exige crédito
                  legível junto do conteúdo. */}
              {post.coverCredit ? (
                <figcaption className="mt-2.5">
                  {post.coverCredit}
                  {post.coverSource ? (
                    <>
                      {" · "}
                      <a
                        href={post.coverSource}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-accent)]"
                      >
                        fonte
                      </a>
                    </>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          {/* Mesmo pipeline das seções de módulo: Markdown com GFM e fórmula em
              KaTeX. A API nunca devolve HTML, então não há o que sanitizar.

              O `h2` é o único elemento com renderizador próprio, e só para
              ganhar um `id`: é ele que o sumário da lateral usa como âncora. */}
          <div className="prose-orbital mt-9 max-w-[68ch]">
            <Markdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h2: ({ children }) => <h2 id={slugificar(textoDe(children))}>{children}</h2>,
              }}
            >
              {post.body}
            </Markdown>
          </div>

          {ponte ? (
            <div className="mt-10 grid max-w-[68ch] items-center gap-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-6 py-5.5 shadow-[var(--shadow-sm)] sm:grid-cols-[1fr_auto]">
              <div>
                <span className="card-kicker">Experimente agora</span>
                <h4 className="mt-2 text-[19px]">{ponte.title}</h4>
                <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-[var(--color-neutral-400)]">
                  {ponte.summary ?? ponte.subtitle}
                </p>
              </div>
              <Link href={`/modulos/${ponte.slug}`} className="btn btn-primary px-4 py-2.5">
                Abrir módulo
              </Link>
            </div>
          ) : null}

          {post.tags && post.tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link key={tag.slug} href={`/blog?tag=${tag.slug}`} className="tag tag-neutral">
                  {tag.name}
                </Link>
              ))}
            </div>
          ) : null}

          <CommentThread slug={post.slug} viewer={viewer} />
        </article>

        <aside className="flex flex-col gap-6.5 lg:sticky lg:top-[86px]">
          {sumario.length > 1 ? (
            <nav aria-label="Neste texto">
              <h6 className="mb-2.5 text-[var(--color-neutral-500)]">Neste texto</h6>
              <div className="flex flex-col gap-2 text-[13px]">
                {sumario.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="border-l-2 border-[var(--color-neutral-800)] pl-2.5 text-[var(--color-neutral-400)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    {item.titulo}
                  </a>
                ))}
              </div>
            </nav>
          ) : null}

          {leiaDepois.length > 0 ? (
            <div>
              <h6 className="mb-3 text-[var(--color-neutral-500)]">Leia depois</h6>
              <div className="flex flex-col gap-3.5">
                {leiaDepois.map((outro) => (
                  <Link key={outro.id} href={`/blog/${outro.slug}`} className="group block">
                    <span className="tag tag-neutral px-2 py-0.5 text-[10px]">
                      {outro.tags?.[0]?.name ?? "Nota"}
                    </span>
                    <div className="mt-1.5 text-[14.5px] leading-tight font-medium transition-colors group-hover:text-[var(--color-accent)]">
                      {outro.title}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
