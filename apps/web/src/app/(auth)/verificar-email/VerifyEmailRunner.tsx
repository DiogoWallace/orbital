"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

type Estado = "verificando" | "pronto" | "falhou";

/**
 * Consome o token assim que a página abre.
 *
 * O `useRef` existe porque o token é de uso único e o Strict Mode do React
 * monta cada componente duas vezes em desenvolvimento — sem a trava, a segunda
 * montagem queimaria o token que a primeira acabou de usar e a tela mostraria
 * "link inválido" logo depois de ter dado certo.
 */
export function VerifyEmailRunner({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [erro, setErro] = useState<string | null>(null);
  const disparado = useRef(false);

  useEffect(() => {
    if (disparado.current) return;
    disparado.current = true;

    (async () => {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setErro(payload?.message ?? "Não foi possível confirmar o e-mail.");
        setEstado("falhou");

        return;
      }

      // O cabeçalho é Server Component e lê a sessão do cookie: sem o refresh
      // o aviso de "confirme seu e-mail" continuaria na tela já confirmada.
      router.refresh();
      setEstado("pronto");
    })();
  }, [token, email, router]);

  if (estado === "verificando") {
    return (
      <p role="status" className="text-sm text-[var(--color-ink-muted)]">
        Confirmando seu e-mail…
      </p>
    );
  }

  if (estado === "falhou") {
    return (
      <>
        <h1 className="text-lg font-medium tracking-tight">Não deu para confirmar</h1>
        <p role="alert" className="mt-2 text-xs text-[var(--color-signal-danger)]">
          {erro}
        </p>
        <p className="mt-4 text-xs text-[var(--color-ink-faint)]">
          Entre na plataforma: o aviso no topo da página permite pedir um link novo.
        </p>
        <Link href="/login" className="mt-6 block">
          <Button variant="outline" className="w-full">
            Ir para o login
          </Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-lg font-medium tracking-tight">E-mail confirmado</h1>
      <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
        Sua conta está completa. Agora dá para salvar execuções de simulação e criar
        projetos.
      </p>
      <Link href="/dashboard" className="mt-6 block">
        <Button variant="primary" className="w-full">
          Ir para o painel
        </Button>
      </Link>
    </>
  );
}
