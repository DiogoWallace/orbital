import Link from "next/link";
import { Avatar } from "@/components/community/Avatar";
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
 *
 * A caixa de escrita vem antes das respostas, com o avatar de quem escreve ao
 * lado. É a forma que todo mundo já conhece de outros lugares, e ela responde
 * de imediato à pergunta que traz alguém até aqui: dá para participar?
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
    <section id="comentarios" className="mt-13 scroll-mt-24">
      <div className="rule-bottom flex items-baseline justify-between pb-3.5">
        <h3 className="text-[20px]">
          {total === 0 ? "Comentários" : `${total} comentário${total > 1 ? "s" : ""}`}
        </h3>
        <span className="text-xs text-[var(--color-neutral-500)]">
          Ordenado por mais recentes
        </span>
      </div>

      <div className="mt-5">
        {viewer === null ? (
          <p className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-neutral-400)] shadow-[var(--shadow-sm)]">
            <Link href="/login" className="text-[var(--color-accent)] hover:underline">
              Entre
            </Link>{" "}
            para comentar.
          </p>
        ) : viewer.emailVerified ? (
          <div className="flex gap-3">
            <Avatar name={viewer.name} username={viewer.username} size="sm" />
            <div className="min-w-0 flex-1">
              <CommentForm endpoint={`/api/posts/${slug}/comments`} rotulo="Publicar" />
            </div>
          </div>
        ) : (
          // A porta suave do ADR 0010, dita com todas as letras: o que fica
          // público sob um nome espera a confirmação do endereço.
          <p className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-neutral-400)] shadow-[var(--shadow-sm)]">
            Confirme seu e-mail para comentar — o aviso no topo da página reenvia o
            link.
          </p>
        )}
      </div>

      {comments.data.length > 0 ? (
        <div className="mt-6.5 flex flex-col gap-5.5">
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
        <p className="mt-6 text-sm text-[var(--color-neutral-500)]">
          Ninguém comentou ainda.
        </p>
      )}
    </section>
  );
}
