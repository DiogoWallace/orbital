"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Caixa de escrita — serve para comentar, responder e editar.
 *
 * Um componente para os três casos porque a diferença entre eles é o endpoint
 * e o rótulo do botão, não o comportamento. Três cópias divergiriam no
 * primeiro ajuste de validação.
 */
export function CommentForm({
  endpoint,
  method = "POST",
  parentId,
  valorInicial = "",
  rotulo,
  autoFocus = false,
  onPronto,
  onCancelar,
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  parentId?: number;
  valorInicial?: string;
  rotulo: string;
  autoFocus?: boolean;
  onPronto?: () => void;
  onCancelar?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState(valorInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const restantes = 2000 - body.length;

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parentId ? { body, parentId } : { body }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setErro(payload?.errors?.body?.[0] ?? payload?.message ?? "Não foi possível enviar.");
      setEnviando(false);

      return;
    }

    // Limpa antes do refresh: o fio recarregado já traz o comentário novo, e
    // deixar o texto na caixa convida a enviar duas vezes.
    setBody("");
    setEnviando(false);
    onPronto?.();
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={2000}
        autoFocus={autoFocus}
        placeholder="Escreva um comentário…"
        className="w-full resize-y rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-void)] px-3 py-2 text-sm leading-relaxed text-[var(--color-ink)] outline-none focus:border-[var(--accent)]"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={enviando || body.trim().length < 2}
          className="text-xs"
        >
          {enviando ? "Enviando…" : rotulo}
        </Button>

        {onCancelar ? (
          <button
            type="button"
            onClick={onCancelar}
            className="text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
          >
            Cancelar
          </button>
        ) : null}

        {/* O contador só aparece perto do limite: mostrar "1994 restantes"
            desde o primeiro caractere é ruído. */}
        {restantes < 200 ? (
          <span className="tabular ml-auto text-[11px] text-[var(--color-ink-faint)]">
            {restantes}
          </span>
        ) : null}
      </div>

      {erro ? (
        <p role="alert" className="text-xs text-[var(--color-signal-danger)]">
          {erro}
        </p>
      ) : null}
    </form>
  );
}
