/**
 * Botão de entrada pelo Google.
 *
 * Um link, e não um `fetch`: o fluxo OAuth é navegação de verdade, o navegador
 * precisa sair daqui e voltar. Por isso também não há estado de "carregando" —
 * a própria troca de página é o retorno visual.
 *
 * Quem entra por aqui volta no painel, sem respeitar o `?proximo=` do login por
 * senha: carregar esse destino pela ida ao Google exigiria guardá-lo num cookie
 * antes do redirect, e o ganho não paga a peça a mais no fluxo de autenticação.
 *
 * O logotipo vai inline em SVG. Carregá-lo de um CDN do Google colocaria uma
 * requisição a terceiro na página de login, que é a última onde isso deveria
 * acontecer.
 */
export function GoogleButton() {
  return (
    <a
      href="/api/auth/google/start"
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-3.5 py-2 text-sm text-[var(--color-ink)] transition-colors duration-150 ease-[var(--ease-out-instrument)] hover:border-[var(--accent)]"
    >
      <svg aria-hidden viewBox="0 0 18 18" className="size-4">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.96H.96a9 9 0 0 0 0 8.08l3.02-2.32Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.02 2.32C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
      Entrar com o Google
    </a>
  );
}
