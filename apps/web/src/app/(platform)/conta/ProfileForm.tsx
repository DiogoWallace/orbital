"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { User } from "@/lib/api/types";

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [bio, setBio] = useState(user.bio ?? "");

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        username: form.get("username"),
        bio: form.get("bio"),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setErro(payload?.message ?? "Não foi possível salvar.");
      setFieldErrors(payload?.errors ?? {});
      setSalvando(false);

      return;
    }

    setSalvo(true);
    setSalvando(false);
    // O cabeçalho é Server Component e mostra o nome: sem o refresh ele
    // continuaria exibindo o antigo até a próxima navegação.
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <Field
        label="Nome de exibição"
        name="name"
        type="text"
        defaultValue={user.name}
        errors={fieldErrors.name}
        required
      />

      <Field
        label="Nome de usuário"
        name="username"
        type="text"
        defaultValue={user.username}
        errors={fieldErrors.username}
        hint="Só minúsculas, números e _. É o endereço do seu perfil."
        required
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-xs text-[var(--color-ink-muted)]">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={280}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          className="resize-y rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-void)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--accent)]"
        />
        <p className="tabular text-xs text-[var(--color-ink-faint)]">
          {280 - bio.length} caracteres restantes
        </p>
        {fieldErrors.bio ? (
          <p className="text-xs text-[var(--color-signal-danger)]">{fieldErrors.bio[0]}</p>
        ) : null}
      </div>

      {erro ? (
        <p role="alert" className="text-xs text-[var(--color-signal-danger)]">
          {erro}
        </p>
      ) : null}

      <div className="mt-2 flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
        {salvo ? (
          <span role="status" className="text-xs text-[var(--color-signal-ok)]">
            Salvo.
          </span>
        ) : null}
      </div>
    </form>
  );
}
