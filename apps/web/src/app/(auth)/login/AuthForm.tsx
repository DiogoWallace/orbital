"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Mode = "login" | "register";

/**
 * Formulário de autenticação.
 *
 * Envia para o BFF (`/api/auth/*`), nunca para a API do Laravel: o token não
 * passa pelo JavaScript da página em momento algum (ADR 0004).
 */
export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
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

    const payload =
      mode === "login"
        ? {
            email: form.get("email"),
            password: form.get("password"),
          }
        : {
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            password_confirmation: form.get("password_confirmation"),
          };

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      setError(problem?.message ?? "Não foi possível continuar.");
      setFieldErrors(problem?.errors ?? {});
      setPending(false);

      return;
    }

    // `refresh` antes de navegar: o cabeçalho é Server Component e precisa
    // reler o cookie recém-criado.
    router.refresh();
    router.push(next);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === "register" ? (
        <Field
          label="Nome"
          name="name"
          type="text"
          autoComplete="name"
          errors={fieldErrors.name}
          required
        />
      ) : null}

      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        errors={fieldErrors.email}
        required
      />

      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        errors={fieldErrors.password}
        required
      />

      {mode === "register" ? (
        <Field
          label="Confirme a senha"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-[var(--color-signal-danger)]">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending} className="mt-2">
        {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
    </form>
  );
}
