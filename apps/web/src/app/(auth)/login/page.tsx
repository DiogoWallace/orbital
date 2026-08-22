import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; modo?: string; senha?: string }>;
}) {
  const { proximo, modo, senha } = await searchParams;
  const mode = modo === "criar" ? "register" : "login";

  // Só caminhos internos são aceitos como destino: aceitar uma URL absoluta
  // aqui transformaria o login num redirecionador aberto.
  const next = proximo?.startsWith("/") ? proximo : "/dashboard";

  return (
    <Panel className="p-6">
      <h1 className="text-lg font-medium tracking-tight">
        {mode === "login" ? "Entrar no Orbital" : "Criar conta"}
      </h1>
      <p className="mt-1 mb-6 text-xs text-[var(--color-ink-faint)]">
        {mode === "login"
          ? "Salve execuções de simulação e acompanhe seus projetos."
          : "Leva menos de um minuto."}
      </p>

      {/* Fim do fluxo de recuperação: quem acabou de trocar a senha chega aqui
          sem sessão, e precisa entender por que está vendo o login de novo. */}
      {senha === "alterada" ? (
        <p
          role="status"
          className="mb-5 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-signal-ok)]"
        >
          Senha alterada. Entre com a nova senha.
        </p>
      ) : null}

      <AuthForm mode={mode} next={next} />

      {mode === "login" ? (
        <p className="mt-4 text-center text-xs">
          <Link
            href="/esqueci-senha"
            className="text-[var(--color-ink-faint)] hover:text-[var(--accent)] hover:underline"
          >
            Esqueci minha senha
          </Link>
        </p>
      ) : null}

      <p className="mt-6 text-center text-xs text-[var(--color-ink-faint)]">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <Link href="/login?modo=criar" className="text-[var(--accent)] hover:underline">
              Criar agora
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Entrar
            </Link>
          </>
        )}
      </p>
    </Panel>
  );
}
