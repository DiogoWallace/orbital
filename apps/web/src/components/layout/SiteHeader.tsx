import Link from "next/link";
import { getCurrentUser } from "@/lib/api/catalog";

const navigation = [
  { href: "/explorar", label: "Explorar" },
  { href: "/projetos", label: "Projetos" },
  { href: "/blog", label: "Blog" },
];

/**
 * Cabeçalho da plataforma.
 *
 * Server Component: a sessão é lida no servidor a partir do cookie httpOnly
 * (ADR 0004), então o estado de autenticação já chega correto no primeiro
 * paint — sem piscar "Entrar" para quem está logado.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[color-mix(in_oklch,var(--color-void)_85%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="block size-2.5 rounded-full bg-[var(--accent)]"
          />
          <span className="text-sm font-semibold tracking-tight">Orbital</span>
        </Link>

        <nav className="flex items-center gap-5" aria-label="Principal">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <Link
                href={`/perfil/${user.username}`}
                className="text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
              >
                {user.name}
              </Link>
              <Link
                href="/conta"
                className="text-sm text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
              >
                Conta
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="text-sm text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-3 py-1.5 text-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
