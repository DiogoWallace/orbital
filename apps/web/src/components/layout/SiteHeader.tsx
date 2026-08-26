import Link from "next/link";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { getCurrentUser } from "@/lib/api/catalog";

/**
 * Cabeçalho da plataforma.
 *
 * Server Component: a sessão é lida no servidor a partir do cookie httpOnly
 * (ADR 0004), então o estado de autenticação já chega correto no primeiro
 * paint — sem piscar "Entrar" para quem está logado.
 *
 * A barra é translúcida com desfoque porque ela passa por cima da imagem do
 * Webb na abertura da landing: opaca, cortaria a foto em duas; transparente,
 * perderia o texto contra as estrelas.
 *
 * O layout é uma grade de duas linhas que vira uma só a partir de `md`. No
 * celular a navegação desce para a segunda linha e rola na horizontal, em vez
 * de sumir atrás de um menu sanduíche: são quatro destinos, e quatro destinos
 * visíveis valem mais que quatro destinos escondidos atrás de um toque. É a
 * mesma `<nav>` nos dois casos — o que muda é onde a grade a coloca.
 *
 * A busca é um `<form>` de verdade apontando para o catálogo. Poderia ser um
 * campo controlado que filtra ao digitar, mas então o recorte não teria URL —
 * e um recorte de catálogo é a coisa que mais se compartilha por link aqui.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] shadow-[0_1px_0_var(--color-divider)] backdrop-blur-[10px]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[auto_1fr] items-center gap-x-7 px-7 md:grid-cols-[auto_auto_1fr]">
        <Link href="/" className="col-start-1 row-start-1 flex h-[58px] shrink-0 items-center">
          {/* Alinhamento por linha de base, não pelo centro: assim o ponto
              pousa sobre a mesma linha em que a palavra se apoia, como um
              corpo em órbita rasante. Centralizado, ele flutuaria no meio da
              altura das letras. */}
          <span className="flex items-baseline gap-2">
            <span
              aria-hidden
              className="block size-[7px] rounded-full bg-[var(--color-accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_22%,transparent)]"
            />
            <span className="text-[17px] font-medium tracking-[-0.02em]">Orbital</span>
          </span>
        </Link>

        <div className="col-span-2 row-start-2 -mx-7 overflow-x-auto px-7 pb-2.5 md:col-span-1 md:col-start-2 md:row-start-1 md:mx-0 md:overflow-visible md:px-0 md:pb-0">
          <HeaderNav />
        </div>

        <div className="col-start-2 row-start-1 flex h-[58px] items-center justify-end gap-3.5 md:col-start-3">
          <form action="/explorar" className="relative hidden items-center lg:flex">
            <svg
              aria-hidden
              viewBox="0 0 256 256"
              width="15"
              height="15"
              fill="currentColor"
              className="absolute left-[9px] text-[var(--color-neutral-500)]"
            >
              <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
            </svg>
            <input
              className="input w-[250px] bg-transparent pl-[30px] text-[13px]"
              type="search"
              name="busca"
              aria-label="Buscar no catálogo"
              placeholder="Buscar módulos, notas, autores"
            />
          </form>

          {user ? (
            <>
              <Link
                href={`/perfil/${user.username}`}
                className="hidden text-sm text-[var(--color-neutral-400)] transition-colors hover:text-[var(--color-accent)] sm:block"
              >
                {user.name.split(" ")[0]}
              </Link>
              <Link href="/conta" className="btn btn-secondary">
                Conta
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="btn btn-ghost text-[var(--color-neutral-500)]"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
