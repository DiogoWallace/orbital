import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A tela de erro da plataforma, em uma peça só.
 *
 * Todas as situações — rota que não existe, render que quebrou, layout raiz que
 * quebrou — usam este mesmo componente. Uma tela por caso divergiria no
 * primeiro ajuste de espaçamento, e erro é justamente onde a interface não
 * pode parecer improvisada: quem chega aqui já está frustrado, e uma página que
 * destoa do resto do site sugere que ninguém previu a situação.
 *
 * Não é Server Component nem Client Component por natureza: é marcação pura,
 * sem hook e sem acesso a dados, então serve aos dois lados. Os `error.tsx`,
 * que o Next obriga a serem cliente, o importam do mesmo lugar que o
 * `not-found.tsx`, que é servidor.
 *
 * A leitura segue a ordem em que a pergunta aparece na cabeça de quem chega:
 * o que aconteceu (o código, em fonte de instrumento), o que isso significa em
 * português, e o que dá para fazer agora. O código fica grande mas recuado em
 * neutro — é contexto, não a mensagem; a mensagem é o título.
 */
export function ErrorScreen({
  codigo,
  kicker,
  titulo,
  children,
  acoes,
  detalhe,
  className,
}: {
  /** O status HTTP, lido como leitura de instrumento. */
  codigo: string;
  kicker: string;
  titulo: string;
  /** A explicação, e o que mais ajudar a sair daqui. */
  children: ReactNode;
  acoes: ReactNode;
  /** Rodapé técnico — o identificador do erro, quando existe. */
  detalhe?: ReactNode;
  /** Ajuste de respiro para quem já está dentro de uma casca com padding. */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[620px] flex-col px-7 py-20 sm:py-28",
        className,
      )}
    >
      <p className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.14em] text-[var(--color-accent-300)] uppercase">
        <span aria-hidden className="block h-0.5 w-[22px] bg-[var(--color-accent)]" />
        {kicker}
      </p>

      <p
        aria-hidden
        className="tabular mt-5 text-[72px] leading-none tracking-[-0.04em] text-[var(--color-neutral-700)] sm:text-[86px]"
      >
        {codigo}
      </p>

      <h1 className="mt-4 text-[30px] tracking-[-0.025em] text-balance sm:text-[34px]">
        {titulo}
      </h1>

      <div className="mt-3.5 text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
        {children}
      </div>

      <div className="mt-7 flex flex-wrap gap-2.5">{acoes}</div>

      {detalhe ? (
        <div className="rule-top mt-10 pt-4 text-[11px] leading-relaxed text-[var(--color-neutral-600)]">
          {detalhe}
        </div>
      ) : null}
    </div>
  );
}
