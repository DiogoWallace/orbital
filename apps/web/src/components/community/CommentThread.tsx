import Link from "next/link";
import { CommentForm } from "@/components/community/CommentForm";
import { CommentItem } from "@/components/community/CommentItem";
import { getComments } from "@/lib/api/community";
import type { User } from "@/lib/api/types";

/**
 * O fio de comentários de um post.
 *
 * Server Component: o fio vem pronto do servidor, o que faz a conversa existir
 * para quem chega pelo Google e para quem lê sem JavaScript. Só as ações —
 * escrever, curtir, moderar — são cliente.
 */
export async function CommentThread({
  slug,
  viewer,
}: {
  slug: string;
  viewer: User | null;
}) {
  const comments = await getComments(slug);
  const total = comments.meta.total;

  return (
    <section id="comentarios" className="mt-16 scroll-mt-20">
      <h2 className="text-sm tracking-wide text-[var(--color-ink-faint)] uppercase">
        {total === 0 ? "Comentários" : `${total} comentário${total > 1 ? "s" : ""}`}
      </h2>

      <div className="mt-6">
        {viewer === null ? (
          <p className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Entre
            </Link>{" "}
            para comentar.
          </p>
        ) : viewer.emailVerified ? (
          <CommentForm endpoint={`/api/posts/${slug}/comments`} rotulo="Comentar" />
        ) : (
          // A porta suave do ADR 0010, dita com todas as letras: o que fica
          // público sob um nome espera a confirmação do endereço.
          <p className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
            Confirme seu e-mail para comentar — o aviso no topo da página reenvia o link.
          </p>
        )}
      </div>

      {comments.data.length > 0 ? (
        <div className="mt-8 flex flex-col gap-6">
          {comments.data.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postSlug={slug}
              autenticado={viewer !== null && viewer.emailVerified}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-[var(--color-ink-faint)]">
          Ninguém comentou ainda.
        </p>
      )}
    </section>
  );
}
