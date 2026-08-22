"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

/**
 * Escolha da senha nova.
 *
 * Termina no login, e não no dashboard: a API não emite sessão no reset, então
 * não há token para guardar aqui. Quem chegou pelo link provou controle da
 * caixa de e-mail — provar que sabe a senha nova é o passo seguinte.
 */
export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        email,
        password: form.get("password"),
        password_confirmation: form.get("password_confirmation"),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message ?? "Não foi possível alterar a senha.");
      setFieldErrors(payload?.errors ?? {});
      setPending(false);

      return;
    }

    router.push("/login?senha=alterada");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Invisível, mas presente: sem ele o gerenciador de senhas do navegador
          não sabe a qual conta associar a senha que está sendo criada. */}
      <input type="hidden" name="email" value={email} autoComplete="username" readOnly />

      <Field
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        errors={fieldErrors.password}
        hint="Pelo menos 8 caracteres."
        required
        autoFocus
      />

      <Field
        label="Confirme a nova senha"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        required
      />

      {/* O token expira em 60 minutos; quando isso acontece o erro vem por aqui. */}
      {error || fieldErrors.token ? (
        <p role="alert" className="text-xs text-[var(--color-signal-danger)]">
          {fieldErrors.token?.[0] ?? error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending} className="mt-2">
        {pending ? "Alterando…" : "Alterar senha"}
      </Button>
    </form>
  );
}
