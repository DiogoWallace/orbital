import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UnverifiedEmailBanner } from "@/components/layout/UnverifiedEmailBanner";
import { getCurrentUser } from "@/lib/api/catalog";

/**
 * Casca da plataforma: catálogo, módulos, projetos e área pessoal.
 *
 * Separada da casca de marketing porque as duas têm objetivos diferentes — uma
 * apresenta, a outra opera. Route groups permitem essa distinção sem inventar
 * um segmento de URL só para agradar a estrutura de pastas.
 *
 * A medida de 1240px é a do design system, e não o `max-w-7xl` do Tailwind: as
 * telas foram desenhadas nessa grade, e 1280px daria um respiro a mais de cada
 * lado que desalinha o conteúdo do cabeçalho.
 */
export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {user && !user.emailVerified ? <UnverifiedEmailBanner email={user.email} /> : null}
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-7 pt-11 pb-24">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
