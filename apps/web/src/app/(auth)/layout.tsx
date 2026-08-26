import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Casca das telas de conta.
 *
 * Cabeçalho sim, rodapé não: quem chega aqui está no meio de uma tarefa curta,
 * e um rodapé com quinze links abaixo do formulário é convite para abandoná-la.
 * O cabeçalho fica porque é a saída — dá para desistir e voltar a explorar.
 *
 * A casca não centraliza nada. O login ocupa a tela inteira em duas colunas e
 * as demais telas são um cartão centralizado; quem decide é cada página, com o
 * `AuthCard` para o segundo caso.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {children}
    </div>
  );
}
