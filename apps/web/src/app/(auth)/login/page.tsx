import Link from "next/link";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Panel } from "@/components/ui/Panel";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "Entrar" };

/** O que deu errado na volta do Google, em português. */
const ERROS: Record<string, string> = {
  cancelado: "Você cancelou a entrada pelo Google.",
  expirado: "A janela de entrada expirou. Tente de novo.",
  estado: "A volta do Google não conferiu. Comece o login novamente.",
  incompleto: "A resposta do Google veio incompleta. Tente de novo.",
  falhou: "Não foi possível entrar com o Google agora.",
  indisponivel: "O login com o Google não está disponível neste ambiente.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; modo?: string; senha?: string; erro?: string }>;
}) {
  const { proximo, modo, senha, erro } = await searchParams;
  const mode = modo === "criar" ? "register" : "login";

  // Só caminhos internos são aceitos como destino: aceitar uma URL absoluta
  // aqui transformaria o login num redirecionador aberto.
  const next = proximo?.startsWith("/") ? proximo : "/dashboard";

  const googleAtivo = process.env.GOOGLE_LOGIN_ENABLED === "true";
  const mensagemDeErro = erro ? (ERROS[erro] ?? ERROS.falhou) : null;

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

      {mensagemDeErro ? (
        <p
          role="alert"
          className="mb-5 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-signal-danger)]"
        >
          {mensagemDeErro}
        </p>
      ) : null}

      {googleAtivo ? (
        <>
          <GoogleButton />

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--color-line)]" />
            <span className="text-[10px] tracking-widest text-[var(--color-ink-faint)] uppercase">
              ou
            </span>
            <span className="h-px flex-1 bg-[var(--color-line)]" />
          </div>
        </>
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

      {/* Conta criada pelo Google não tem senha, e o erro de login é o mesmo
          genérico de sempre — de propósito, para não revelar quais e-mails
          existem. Esta dica é o que evita que a pessoa fique tentando. */}
      {googleAtivo && mode === "login" ? (
        <p className="mt-4 text-center text-xs text-[var(--color-ink-faint)]">
          Se você criou a conta pelo Google, entre pelo botão acima.
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
