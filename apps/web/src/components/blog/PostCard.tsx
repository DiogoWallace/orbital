import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { PostSummary } from "@/lib/api/types";
import { formatarDataFeed } from "@/lib/datas";

/**
 * Cartão de post — usado onde a lista é uma grade, e não o feed.
 *
 * O feed em si usa `FeedRow`: lá a leitura é cronológica e a linha vence o
 * cartão. Aqui, no perfil de alguém, a lista é um portfólio — cartões lado a
 * lado se comparam melhor do que linhas empilhadas.
 *
 * A capa é opcional e nem todo post tem: um texto curto sobre uma decisão de
 * arquitetura não precisa de imagem, e inventar uma só para preencher a grade
 * é o começo do banco de imagens genérico.
 */
export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      {post.coverPath ? (
        <div className="relative aspect-[16/9] overflow-hidden bg-[#0f111a]">
          <Image
            src={post.coverPath}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="lighten object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag tag-neutral">{post.tags?.[0]?.name ?? "Nota"}</span>
          <span className="num text-[11px] text-[var(--color-neutral-500)]">
            <time dateTime={post.publishedAt ?? undefined}>
              {formatarDataFeed(post.publishedAt)}
            </time>{" "}
            · {post.readingMinutes} min
          </span>
          {post.status !== "published" ? (
            <Badge tone="warn" className="ml-auto">
              Rascunho
            </Badge>
          ) : null}
        </div>

        <h3 className="mt-3 text-[17px] leading-snug transition-colors group-hover:text-[var(--color-accent)]">
          {post.title}
        </h3>

        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
            {post.excerpt}
          </p>
        ) : null}

        <div className="num mt-4 flex gap-3 text-[11px] text-[var(--color-neutral-500)]">
          {post.likesCount ? <span>{post.likesCount} curtidas</span> : null}
          {post.commentsCount ? (
            <span>
              {post.commentsCount} comentário{post.commentsCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
