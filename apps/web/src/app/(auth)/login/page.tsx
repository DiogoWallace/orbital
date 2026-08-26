import Image from "next/image";
import Link from "next/link";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { galeriaWebb } from "@/lib/webb";
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

/**
 * O que a conta destrava.
 *
 * Escrito como promessa concreta, não como lista de recursos: quem chega aqui
 * já sabe que existe um formulário, o que falta é o motivo de preenchê-lo.
 */
const beneficios = [
  {
    titulo: "Execuções salvas",
    texto:
      "Parâmetros e versão do modelo guardados juntos, reproduzíveis meses depois.",
  },
  {
    titulo: "Projetos",
    texto: "Reúna cenários, gráficos e texto num só lugar e compartilhe por link.",
  },
  {
    titulo: "Publicar no feed",
    texto:
      "Transforme um resultado em nota, com o cenário anexado para quem ler reabrir.",
  },
];

const pilares = galeriaWebb.find((imagem) => imagem.id === "weic2216b");

/**
 * Entrada e criação de conta.
 *
 * Duas colunas, e não o cartão centralizado que as outras telas de conta usam:
 * esta é a porta de entrada do produto, e é o único lugar onde vale gastar
 * meia tela com imagem para dizer o que se ganha do outro lado do formulário.
 *
 * O modo vive na URL (`?modo=criar`), não em estado de componente: o link do
 * rodapé da landing precisa abrir direto no cadastro, e o botão de voltar do
 * navegador precisa desfazer a troca.
 */
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

  // O destino sobrevive à troca de aba entrar/criar conta: quem clicou em
  // "comentar" e caiu no login não perde para onde estava indo por ter
  // percebido, no meio do caminho, que ainda não tem conta.
  const href = (destino: "login" | "register") => {
    const params = new URLSearchParams();
    if (destino === "register") params.set("modo", "criar");
    if (proximo?.startsWith("/")) params.set("proximo", proximo);

    const query = params.toString();

    return query ? `/login?${query}` : "/login";
  };

  // A altura casada com a viewport só vale onde as duas colunas existem: no
  // celular o cabeçalho ganha uma segunda linha, e descontar 58px fixos ali
  // renderia uma tela um pouco mais alta que a janela, sem motivo.
  return (
    <main className="grid lg:min-h-[calc(100dvh-58px)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative isolate hidden flex-col justify-between overflow-hidden px-15 py-14 lg:flex">
        <div aria-hidden className="absolute inset-0 -z-10">
          {pilares ? (
            <Image
              src={pilares.imagem}
              alt=""
              placeholder="blur"
              priority
              sizes="55vw"
              className="lighten size-full object-cover opacity-60"
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-bg)_4%,color-mix(in_srgb,var(--color-bg)_68%,transparent)_60%,color-mix(in_srgb,var(--color-bg)_92%,transparent))]" />
        </div>

        <p className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.14em] text-[var(--color-accent-300)] uppercase">
          <span aria-hidden className="block h-0.5 w-[22px] bg-[var(--color-accent)]" />
          Conta Orbital
        </p>

        <div>
          <h2 className="max-w-[22ch] text-[34px] tracking-[-0.025em]">
            Explorar é aberto. Guardar e publicar é que pede conta.
          </h2>

          <div className="mt-7 flex max-w-[46ch] flex-col gap-3.5">
            {beneficios.map((beneficio) => (
              <div key={beneficio.titulo} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-[7px] block h-0.5 w-3.5 shrink-0 bg-[var(--color-accent)]"
                />
                <div>
                  <div className="text-[15px] font-medium">{beneficio.titulo}</div>
                  <div className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
                    {beneficio.texto}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {pilares ? (
          <p className="max-w-[52ch] text-[11px] text-[var(--color-neutral-500)]">
            Fundo: {pilares.titulo}, {pilares.dados[0]?.valor} · NIRCam ·{" "}
            {pilares.credito} ·{" "}
            <a
              href={pilares.fonte}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-accent)]"
            >
              ESA/Webb
            </a>
          </p>
        ) : null}
      </section>

      <section className="flex items-center justify-center bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-bg))] px-7 py-14 lg:px-15">
        <div className="w-full max-w-[372px]">
          <nav className="seg w-full" aria-label="Entrar ou criar conta">
            <Link
              href={href("login")}
              aria-current={mode === "login" ? "true" : undefined}
              className="seg-opt flex-1 justify-center"
            >
              Entrar
            </Link>
            <Link
              href={href("register")}
              aria-current={mode === "register" ? "true" : undefined}
              className="seg-opt flex-1 justify-center"
            >
              Criar conta
            </Link>
          </nav>

          <h1 className="mt-6.5 text-[27px] tracking-[-0.02em]">
            {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-neutral-400)]">
            {mode === "login"
              ? "Suas execuções salvas e projetos continuam onde você parou."
              : "Leva menos de um minuto. Explorar continua não exigindo conta."}
          </p>

          {/* Fim do fluxo de recuperação: quem acabou de trocar a senha chega
              aqui sem sessão, e precisa entender por que está vendo o login de
              novo. */}
          {senha === "alterada" ? (
            <p
              role="status"
              className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-signal-ok)] shadow-[var(--shadow-sm)]"
            >
              Senha alterada. Entre com a nova senha.
            </p>
          ) : null}

          {mensagemDeErro ? (
            <p
              role="alert"
              className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-signal-danger)] shadow-[var(--shadow-sm)]"
            >
              {mensagemDeErro}
            </p>
          ) : null}

          {googleAtivo ? (
            <>
              <div className="mt-6">
                <GoogleButton />
              </div>

              <div className="my-5.5 flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-px flex-1 bg-[linear-gradient(to_right,transparent,var(--color-divider))]"
                />
                <span className="text-[10px] tracking-[0.12em] text-[var(--color-neutral-500)] uppercase">
                  ou por e-mail
                </span>
                <span
                  aria-hidden
                  className="h-px flex-1 bg-[linear-gradient(to_left,transparent,var(--color-divider))]"
                />
              </div>
            </>
          ) : (
            <div className="mt-6" />
          )}

          <AuthForm mode={mode} next={next} />

          {/* Conta criada pelo Google não tem senha, e o erro de login é o mesmo
              genérico de sempre — de propósito, para não revelar quais e-mails
              existem. Esta dica é o que evita que a pessoa fique tentando. */}
          <p className="mt-5 text-xs leading-relaxed text-[var(--color-neutral-500)]">
            {googleAtivo && mode === "login"
              ? "Conta criada pelo Google não tem senha — entre pelo botão acima. "
              : ""}
            Ao continuar você aceita os{" "}
            <Link
              href="/#licencas"
              className="text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-accent)]"
            >
              termos de uso
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
