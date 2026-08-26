import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleCard } from "@/components/catalog/ModuleCard";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { apiFetch } from "@/lib/api/client";
import { getCurrentUser, getModules } from "@/lib/api/catalog";
import type { Paginated, SimulationRun } from "@/lib/api/types";

export const metadata = { title: "Painel" };

/**
 * Área pessoal.
 *
 * A checagem de sessão acontece no servidor, antes de qualquer HTML sair: sem
 * flash de conteúdo protegido e sem redirect no cliente.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?proximo=/dashboard");

  const [runs, modules] = await Promise.all([
    apiFetch<Paginated<SimulationRun>>("/me/simulation-runs?perPage=5", {
      cache: "no-store",
    }).catch(() => null),
    getModules({ perPage: 3 }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h6 className="text-[var(--color-neutral-500)]">Sua área</h6>
        <h1 className="mt-3 text-[40px] tracking-[-0.025em]">
          Bem-vindo, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
          Suas execuções salvas e o que há de novo no catálogo.
        </p>
      </header>

      <Panel>
        <PanelHeader
          title="Execuções salvas"
          description="Cada execução guarda os parâmetros e a versão do modelo que os interpretou."
        />

        {!runs || runs.data.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--color-neutral-500)]">
            Nenhuma execução salva ainda. Abra uma simulação e guarde um cenário.
          </p>
        ) : (
          <ul>
            {runs.data.map((run) => (
              <li
                key={run.id}
                className="rule-bottom flex items-center gap-4 px-5 py-3.5 last:bg-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{run.label ?? "Execução sem rótulo"}</p>
                  {run.module ? (
                    <Link
                      href={`/modulos/${run.module.slug}`}
                      className="text-xs text-[var(--color-neutral-500)] hover:text-[var(--color-accent)]"
                    >
                      {run.module.title}
                    </Link>
                  ) : null}
                </div>
                <span className="num text-xs text-[var(--color-neutral-500)]">
                  v{run.modelVersion}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <section>
        <h6 className="text-[var(--color-neutral-500)]">Novidades no catálogo</h6>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.data.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </section>
    </div>
  );
}
