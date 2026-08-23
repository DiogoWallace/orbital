import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Badge } from "@/components/ui/Badge";
import { getPost } from "@/lib/api/blog";
import { formatarDataLonga } from "@/lib/datas";

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
  const post = await getPost(slug);

  // A API já devolve 404 para rascunho alheio (a policy decide). Aqui só
  // traduzimos isso na página — nenhuma regra de visibilidade vive no
  // frontend, que é onde ela seria fácil de contornar.
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Link
        href="/blog"
        className="text-xs text-[var(--color-ink-faint)] hover:text-[var(--accent)]"
      >
        ← Blog
      </Link>

      <header className="mt-6">
        <div className="tabular flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-ink-faint)]">
          <time dateTime={post.publishedAt ?? undefined}>
            {formatarDataLonga(post.publishedAt)}
          </time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min de leitura</span>
          {post.author ? (
            <>
              <span aria-hidden>·</span>
              <span>{post.author.name}</span>
            </>
          ) : null}
          {post.status !== "published" ? (
            <Badge tone="warn" className="ml-1">
              Rascunho
            </Badge>
          ) : null}
        </div>

        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-balance">
          {post.title}
        </h1>

        {post.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-muted)]">
            {post.excerpt}
          </p>
        ) : null}
      </header>

      {post.coverPath ? (
        <figure className="mt-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-void)]">
            <Image
              src={post.coverPath}
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 42rem, 100vw"
              className="object-cover"
            />
          </div>
          {/* O crédito vem no mesmo recurso da capa e é renderizado sempre que
              existe: a licença das imagens que usamos exige crédito legível
              junto do conteúdo. */}
          {post.coverCredit ? (
            <figcaption className="mt-2 text-[11px] text-[var(--color-ink-faint)]">
              {post.coverCredit}
              {post.coverSource ? (
                <>
                  {" · "}
                  <a
                    href={post.coverSource}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-[var(--accent)]"
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
          KaTeX. A API nunca devolve HTML, então não há o que sanitizar. */}
      <div className="prose-orbital mt-10">
        <Markdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {post.body}
        </Markdown>
      </div>

      {post.tags && post.tags.length > 0 ? (
        <footer className="mt-12 flex flex-wrap gap-1.5 border-t border-[var(--color-line)] pt-6">
          {post.tags.map((tag) => (
            <Link key={tag.slug} href={`/blog?tag=${tag.slug}`}>
              <Badge>{tag.name}</Badge>
            </Link>
          ))}
        </footer>
      ) : null}
    </article>
  );
}
