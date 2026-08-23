"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/community/Avatar";
import { CommentForm } from "@/components/community/CommentForm";
import { LikeButton } from "@/components/community/LikeButton";
import { Badge } from "@/components/ui/Badge";
import type { CommentNode } from "@/lib/api/types";
import { formatarData } from "@/lib/datas";

/**
 * Um comentário, com respostas quando for raiz.
 *
 * Os botões vêm de `viewerCan`, calculado pela policy na API. O frontend não
 * reimplementa a regra: um botão que aparece e depois recebe 403 é pior que
 * botão nenhum, e duas cópias da mesma regra divergem na primeira mudança.
 */
export function CommentItem({
  comment,
  postSlug,
  autenticado,
  profundidade = 0,
}: {
  comment: CommentNode;
  postSlug: string;
  autenticado: boolean;
  profundidade?: number;
}) {
  const router = useRouter();
  const [respondendo, setRespondendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const autor = comment.author;

  async function acao(endpoint: string, method: "DELETE" | "PATCH", body?: unknown) {
    setErro(null);

    const response = await fetch(endpoint, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setErro(payload?.message ?? "Não foi possível concluir.");

      return;
    }

    router.refresh();
  }

  return (
    <article
      className={
        profundidade > 0
          ? "border-l border-[var(--color-line)] pl-4 sm:pl-5"
          : "border-t border-[var(--color-line)] pt-5"
      }
    >
      <div className="flex gap-3">
        {autor ? (
          <Link href={`/perfil/${autor.username}`} aria-label={`Perfil de ${autor.name}`}>
            <Avatar
              name={autor.name}
              username={autor.username}
              size={profundidade > 0 ? "sm" : "md"}
            />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {autor ? (
              <Link
                href={`/perfil/${autor.username}`}
                className="font-medium text-[var(--color-ink)] hover:text-[var(--accent)]"
              >
                {autor.name}
              </Link>
            ) : (
              <span className="text-[var(--color-ink-faint)]">Conta removida</span>
            )}

            {autor?.isCurator ? <Badge tone="accent">Curadoria</Badge> : null}

            <time
              dateTime={comment.createdAt ?? undefined}
              className="tabular text-[var(--color-ink-faint)]"
            >
              {formatarData(comment.createdAt)}
            </time>

            {/* Editar depois de alguém responder muda o sentido da resposta
                alheia; a marca é o mínimo de honestidade. */}
            {comment.editedAt ? (
              <span className="text-[var(--color-ink-faint)]">· editado</span>
            ) : null}

            {comment.status === "hidden" ? (
              <Badge tone="warn">Oculto pela moderação</Badge>
            ) : null}
          </div>

          {editando ? (
            <div className="mt-3">
              <CommentForm
                endpoint={`/api/comments/${comment.id}`}
                method="PATCH"
                valorInicial={comment.body}
                rotulo="Salvar"
                autoFocus
                onPronto={() => setEditando(false)}
                onCancelar={() => setEditando(false)}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-[var(--color-ink-muted)]">
              {comment.body}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <LikeButton
              endpoint={`/api/comments/${comment.id}/like`}
              liked={comment.liked ?? false}
              count={comment.likesCount ?? 0}
              autenticado={autenticado}
              rotulo="Curtir comentário"
              size="sm"
            />

            {autenticado ? (
              <Acao onClick={() => setRespondendo((v) => !v)}>Responder</Acao>
            ) : null}

            {comment.viewerCan.edit ? (
              <Acao onClick={() => setEditando((v) => !v)}>Editar</Acao>
            ) : null}

            {comment.viewerCan.delete ? (
              <Acao
                onClick={() => {
                  if (confirm("Apagar este comentário?")) {
                    acao(`/api/comments/${comment.id}`, "DELETE");
                  }
                }}
              >
                Apagar
              </Acao>
            ) : null}

            {comment.viewerCan.moderate ? (
              <Acao
                onClick={() =>
                  acao(`/api/comments/${comment.id}/moderation`, "PATCH", {
                    status: comment.status === "hidden" ? "visible" : "hidden",
                  })
                }
              >
                {comment.status === "hidden" ? "Devolver ao ar" : "Ocultar"}
              </Acao>
            ) : null}

            {comment.viewerCan.report ? (
              <Acao
                onClick={() => {
                  const motivo = prompt(
                    "Por que denunciar?\n\nspam, abuse, off_topic ou other",
                    "spam",
                  );

                  if (motivo) {
                    fetch(`/api/comments/${comment.id}/report`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reason: motivo }),
                    }).then(() => alert("Denúncia registrada. A curadoria vai analisar."));
                  }
                }}
              >
                Denunciar
              </Acao>
            ) : null}
          </div>

          {erro ? (
            <p role="alert" className="mt-2 text-xs text-[var(--color-signal-danger)]">
              {erro}
            </p>
          ) : null}

          {respondendo ? (
            <div className="mt-4">
              <CommentForm
                endpoint={`/api/posts/${postSlug}/comments`}
                parentId={comment.id}
                rotulo="Responder"
                autoFocus
                onPronto={() => setRespondendo(false)}
                onCancelar={() => setRespondendo(false)}
              />
            </div>
          ) : null}

          {comment.replies && comment.replies.length > 0 ? (
            <div className="mt-5 flex flex-col gap-5">
              {comment.replies.map((resposta) => (
                <CommentItem
                  key={resposta.id}
                  comment={resposta}
                  postSlug={postSlug}
                  autenticado={autenticado}
                  profundidade={profundidade + 1}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Acao({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-[var(--color-ink-faint)] transition-colors hover:text-[var(--accent)]"
    >
      {children}
    </button>
  );
}
