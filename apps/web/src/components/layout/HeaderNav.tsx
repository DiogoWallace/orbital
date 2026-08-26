"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Os links de navegação do cabeçalho.
 *
 * Único pedaço de cliente no `SiteHeader`, que é Server Component: marcar o
 * link da rota atual exige saber a rota atual, e isso só existe no navegador.
 * Separar em vez de transformar o cabeçalho inteiro em cliente mantém a
 * leitura da sessão no servidor, onde ela precisa acontecer.
 */
const navegacao = [
  { href: "/blog", label: "Feed" },
  { href: "/explorar", label: "Laboratório" },
  { href: "/projetos", label: "Projetos" },
  { href: "/#areas", label: "Áreas" },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-5 text-sm whitespace-nowrap" aria-label="Principal">
      {navegacao.map((item) => {
        // Âncora da landing nunca conta como seção ativa: ela não é uma rota.
        const ativo = !item.href.includes("#") && pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={
              ativo
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-neutral-400)] transition-colors hover:text-[var(--color-accent)]"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
