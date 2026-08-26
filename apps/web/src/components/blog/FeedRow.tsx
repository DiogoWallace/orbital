import Link from "next/link";
import type { PostSummary } from "@/lib/api/types";
import { formatarDataFeed } from "@/lib/datas";

/**
 * Uma linha do feed.
 *
 * Linha, e não cartão. O feed é cronológico e homogêneo: quinze cartões em
 * grade fazem o olho varrer em zigue-zague procurando qual é o mais novo,
 * enquanto uma coluna de linhas se lê de cima para baixo, que é a ordem que o
 * conteúdo tem. A régua que separa cada uma desaparece nas pontas — a
 * assinatura do sistema — em vez de desenhar uma tabela.
 *
 * A capa não aparece aqui de propósito: só o primeiro item da página é
 * ilustrado. Uma miniatura por linha transformaria a hierarquia editorial numa
 * lista de thumbnails todas do mesmo tamanho.
 */
export function FeedRow({ post }: { post: PostSummary }) {
  const tipo = post.tags?.[0]?.name ?? "Nota";
  const curtidas = post.likesCount ?? 0;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="row-link group grid grid-cols-1 items-start gap-2 px-1 py-5.5 sm:grid-cols-[1fr_130px] sm:gap-7"
    >
      <div>
        <div className="flex items-center gap-2.5">
          <span className="tag tag-neutral">{tipo}</span>
          <span className="num text-[11px] text-[var(--color-neutral-500)]">
            {formatarDataFeed(post.publishedAt)} · {post.readingMinutes} min
            {post.commentsCount
              ? ` · ${post.commentsCount} comentário${post.commentsCount === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>

        <h3 className="mt-2.5 max-w-[34ch] text-[21px] tracking-[-0.015em] transition-colors group-hover:text-[var(--color-accent)]">
          {post.title}
        </h3>

        {post.excerpt ? (
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-[var(--color-neutral-400)]">
            {post.excerpt}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4 pt-0.5 sm:flex-col sm:items-end sm:gap-2">
        {curtidas > 0 ? (
          <span className="num inline-flex items-center gap-1.5 text-[11px] text-[var(--color-neutral-500)]">
            <svg aria-hidden viewBox="0 0 256 256" width="13" height="13" fill="currentColor">
              <path d="M178,32c-20.65,0-38.73,8.88-50,23.89C116.73,40.88,98.65,32,78,32A62.07,62.07,0,0,0,16,94c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,220.66,240,164,240,94A62.07,62.07,0,0,0,178,32Z" />
            </svg>
            {curtidas}
          </span>
        ) : null}

        {post.author ? (
          <span className="text-[11px] text-[var(--color-neutral-500)]">
            {post.author.name}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
