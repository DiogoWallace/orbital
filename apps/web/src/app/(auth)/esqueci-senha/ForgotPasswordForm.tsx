"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

/**
 * Formulário de pedido de recuperação.
 *
 * Em caso de sucesso o formulário some e dá lugar à confirmação. Deixá-lo na
 * tela convidaria a reenviar — e cada reenvio queima o token anterior, o que
 * faz o link que já chegou parar de funcionar.
 */
export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível continuar.");
      setFieldErrors(payload?.errors ?? {});
      setPending(false);

      return;
    }

    setSent(payload?.message ?? "Se houver uma conta com esse e-mail, o link chega em instantes.");
    setPending(false);
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-4"
      >
        <p className="text-sm text-[var(--color-ink)]">{sent}</p>
        <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
          O link vale por 60 minutos e só pode ser usado uma vez. Vale conferir a caixa de spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        errors={fieldErrors.email}
        required
        autoFocus
      />

      {error ? (
        <p role="alert" className="text-xs text-[var(--color-signal-danger)]">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending} className="mt-2">
        {pending ? "Enviando…" : "Enviar link"}
      </Button>
    </form>
  );
}
