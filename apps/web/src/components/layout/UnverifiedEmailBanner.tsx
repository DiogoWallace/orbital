"use client";

import { useState } from "react";

/**
 * Aviso de conta não confirmada.
 *
 * A porta é suave: quem não confirmou navega e simula normalmente, e só as
 * ações que gravam algo ficam bloqueadas. Este aviso é o que evita que o
 * bloqueio apareça como surpresa na hora de salvar — o usuário sabe o que
 * falta antes de esbarrar.
 *
 * Não é dispensável de propósito: enquanto a conta estiver pela metade, o
 * aviso continua ali.
 */
export function UnverifiedEmailBanner({ email }: { email: string }) {
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado">("parado");
  const [erro, setErro] = useState<string | null>(null);

  async function reenviar() {
    setEstado("enviando");
    setErro(null);

    const response = await fetch("/api/auth/email/resend", { method: "POST" });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setErro(payload?.message ?? "Não foi possível reenviar.");
      setEstado("parado");

      return;
    }

    setEstado("enviado");
  }

  return (
    <div
      role="status"
      className="border-b border-[var(--color-signal-warn)]/30 bg-[color-mix(in_oklch,var(--color-signal-warn)_12%,transparent)]"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2.5 text-xs">
        <span className="text-[var(--color-ink)]">
          Confirme seu e-mail para salvar simulações e criar projetos.
        </span>
        <span className="text-[var(--color-ink-faint)]">
          Enviamos um link para{" "}
          <span className="font-[family-name:var(--font-mono)]">{email}</span>.
        </span>

        {estado === "enviado" ? (
          <span className="text-[var(--color-signal-ok)]">Link reenviado.</span>
        ) : (
          <button
            type="button"
            onClick={reenviar}
            disabled={estado === "enviando"}
            className="text-[var(--color-signal-warn)] underline underline-offset-2 hover:brightness-110 disabled:opacity-50"
          >
            {estado === "enviando" ? "Enviando…" : "Reenviar"}
          </button>
        )}

        {erro ? <span className="text-[var(--color-signal-danger)]">{erro}</span> : null}
      </div>
    </div>
  );
}
