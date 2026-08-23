import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import type { PostSummary } from "@/lib/api/types";
import { formatarData } from "@/lib/datas";

/**
 * Card de post na listagem e na home.
 *
 * A capa é opcional e nem todo post tem: um texto curto sobre uma decisão de
 * arquitetura não precisa de imagem, e inventar uma só para preencher a grade
 * é o começo do banco de imagens genérico.
 */
export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Panel as="article" className="group overflow-hidden">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.coverPath ? (
          <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-void)]">
            <Image
              src={post.coverPath}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover transition-transform duration-500 ease-[var(--ease-out-instrument)] group-hover:scale-[1.03] motion-reduce:transform-none"
            />
          </div>
        ) : null}

        <div className="p-5">
          <div className="tabular flex items-center gap-2 text-[11px] text-[var(--color-ink-faint)]">
            <time dateTime={post.publishedAt ?? undefined}>
              {formatarData(post.publishedAt)}
            </time>
            <span aria-hidden>·</span>
            <span>{post.readingMinutes} min de leitura</span>
            {post.commentsCount ? (
              <>
                <span aria-hidden>·</span>
                <span>{post.commentsCount} comentário{post.commentsCount === 1 ? "" : "s"}</span>
              </>
            ) : null}
            {post.likesCount ? (
              <>
                <span aria-hidden>·</span>
                <span>{post.likesCount} curtida{post.likesCount === 1 ? "" : "s"}</span>
              </>
            ) : null}
            {post.status !== "published" ? (
              <Badge className="ml-auto">Rascunho</Badge>
            ) : null}
          </div>

          <h3 className="mt-2 text-lg leading-snug font-medium tracking-tight transition-colors group-hover:text-[var(--accent)]">
            {post.title}
          </h3>

          {post.excerpt ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {post.excerpt}
            </p>
          ) : null}

          {post.tags && post.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge key={tag.slug}>{tag.name}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </Panel>
  );
}
