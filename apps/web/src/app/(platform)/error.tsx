"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";

/**
 * Render que quebrou dentro da plataforma.
 *
 * Cliente por obrigação do Next — um error boundary do React precisa ser
 * componente de classe no cliente, e é isto que o `error.tsx` vira. Ele cobre
 * as páginas do grupo `(platform)` e o layout continua de pé em volta: quem
 * quebrou foi a página, não a casca, então cabeçalho e rodapé seguem lá e a
 * navegação não some junto com o conteúdo.
 *
 * Na prática, a causa mais comum é a API não ter respondido — todas estas
 * páginas leem do Laravel no servidor. Por isso `retry` vem primeiro entre as
 * ações: se a queda foi momentânea, é o botão que resolve sem sair da página.
 * Ele refaz o fetch e re-renderiza só o trecho que falhou.
 *
 * O `digest` é mostrado de propósito. Em produção o Next troca a mensagem
 * original por uma genérica antes de mandá-la ao navegador, para não vazar
 * detalhe interno — o digest é o que sobra para casar esta tela com a linha
 * certa do log do servidor. Sem ele, um relato de usuário é impossível de
 * rastrear.
 */
export default function PlatformError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      className="px-0 py-12 sm:py-16"
      codigo="500"
      kicker="Falha no nosso lado"
      titulo="Alguma coisa quebrou ao montar esta página."
      acoes={
        <>
          <button
            type="button"
            onClick={() => retry()}
            className="btn btn-primary px-4.5 py-2.5 text-[15px]"
          >
            Tentar de novo
          </button>
          <Link href="/" className="btn btn-secondary px-4.5 py-2.5 text-[15px]">
            Voltar ao início
          </Link>
        </>
      }
      detalhe={
        error.digest ? (
          <>
            Se acontecer de novo, este código identifica a falha no nosso log:{" "}
            <span className="tabular text-[var(--color-neutral-400)]">{error.digest}</span>
          </>
        ) : null
      }
    >
      <p>
        O erro é nosso, não seu — nada do que você fez causou isso. Costuma ser
        momentâneo, então vale tentar de novo antes de qualquer outra coisa.
      </p>
    </ErrorScreen>
  );
}
