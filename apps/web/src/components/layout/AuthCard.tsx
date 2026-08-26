import type { ReactNode } from "react";

/**
 * Cartão centralizado das telas curtas de conta — recuperar senha, redefinir,
 * confirmar e-mail.
 *
 * O login não usa este componente: ele é uma tela de duas colunas com a imagem
 * do Webb à esquerda, porque é a porta de entrada e vale gastar a área. As
 * outras três são etapas de um fluxo já iniciado, onde a imagem só atrasaria
 * a leitura do que precisa ser feito.
 */
export function AuthCard({
  titulo,
  descricao,
  children,
  rodape,
}: {
  /** Omitido quando o próprio conteúdo é que decide o título — o confirmador
      de e-mail, por exemplo, tem um por desfecho. */
  titulo?: string;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <main className="grid flex-1 place-items-center px-7 py-16">
      <div className="w-full max-w-[372px]">
        {titulo ? <h1 className="text-[27px] tracking-[-0.02em]">{titulo}</h1> : null}
        {descricao ? (
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
            {descricao}
          </p>
        ) : null}

        <div className={titulo || descricao ? "mt-6" : undefined}>{children}</div>

        {rodape ? (
          <div className="mt-6 text-center text-xs text-[var(--color-neutral-500)]">
            {rodape}
          </div>
        ) : null}
      </div>
    </main>
  );
}
