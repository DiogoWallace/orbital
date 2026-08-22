import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Casca da plataforma: catálogo, módulos, projetos e área pessoal.
 *
 * Separada da casca de marketing porque as duas têm objetivos diferentes — uma
 * apresenta, a outra opera. Route groups permitem essa distinção sem inventar
 * um segmento de URL só para agradar a estrutura de pastas.
 */
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
