"use client";

import Link from "next/link";
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {mode === "register" ? (
        <Field
          label="Nome"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Como você assina o que publica"
          errors={fieldErrors.name}
          required
        />
      ) : null}

      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@instituicao.br"
        errors={fieldErrors.email}
        required
      />

      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder="••••••••••••"
        errors={fieldErrors.password}
        // A regra aparece antes da tentativa: descobrir a política pelo erro
        // é o caminho mais curto para a pessoa desistir do cadastro.
        hint={mode === "register" ? "Pelo menos 12 caracteres, com letras e números." : undefined}
        // O "esqueci" mora na linha do rótulo, e não abaixo do botão: é ali que
        // a pessoa está olhando no instante em que percebe que não lembra.
        action={
          mode === "login" ? (
            <Link
              href="/esqueci-senha"
              className="text-xs text-[var(--color-neutral-400)] hover:text-[var(--color-accent)]"
            >
              Esqueci
            </Link>
          ) : undefined
        }
        required
      />

      {mode === "register" ? (
        <Field
          label="Confirme a senha"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          required
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-[var(--color-signal-danger)]">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" block disabled={pending} className="mt-1 py-2.5">
        {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
    </form>
  );
}
