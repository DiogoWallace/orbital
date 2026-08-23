"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Botão de curtir, com atualização otimista.
 *
 * O estado muda antes da resposta do servidor porque curtir é um gesto de
 * meio segundo: esperar a rede para o coração acender faz a interface parecer
 * quebrada. Se a requisição falhar, o estado volta ao que era — e é aí que a
 * cópia local do valor original importa.
 *
 * Quem não está logado não vê um botão morto: vê um link para entrar. Botão
 * que aparece e responde 401 é pior que botão nenhum.
 */
export function LikeButton({
  endpoint,
  liked: likedInicial,
  count: countInicial,
  autenticado,
  rotulo,
  size = "md",
}: {
  endpoint: string;
  liked: boolean;
  count: number;
  autenticado: boolean;
  rotulo: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(likedInicial);
  const [count, setCount] = useState(countInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-full border transition-colors",
    size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
    liked
      ? "border-[var(--color-signal-rose,var(--accent))] text-[var(--accent)]"
      : "border-[var(--color-line-strong)] text-[var(--color-ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
  );

  if (!autenticado) {
    return (
      <a href="/login" className={classes} title="Entre para curtir">
        <Coracao preenchido={false} />
        <span className="tabular">{count}</span>
        <span className="sr-only">{rotulo} — entre para curtir</span>
      </a>
    );
  }

  async function alternar() {
    const anterior = { liked, count };

    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));
    setErro(null);

    const response = await fetch(endpoint, { method: "POST" });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setLiked(anterior.liked);
      setCount(anterior.count);
      setErro(payload?.message ?? "Não foi possível curtir.");

      return;
    }

    // A verdade do servidor sobrescreve o palpite otimista: se dois
    // dispositivos clicaram junto, o número certo é o que voltou.
    const { data } = await response.json();
    setLiked(data.liked);
    setCount(data.likesCount);

    // Mantém as contagens renderizadas no servidor em dia.
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={alternar}
        disabled={pendente}
        aria-pressed={liked}
        className={classes}
      >
        <Coracao preenchido={liked} />
        <span className="tabular">{count}</span>
        <span className="sr-only">{rotulo}</span>
      </button>
      {erro ? (
        <span role="alert" className="text-[11px] text-[var(--color-signal-danger)]">
          {erro}
        </span>
      ) : null}
    </span>
  );
}

function Coracao({ preenchido }: { preenchido: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5"
      fill={preenchido ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M8 14s6-3.7 6-7.6A3.4 3.4 0 0 0 8 4.6 3.4 3.4 0 0 0 2 6.4C2 10.3 8 14 8 14Z" />
    </svg>
  );
}
