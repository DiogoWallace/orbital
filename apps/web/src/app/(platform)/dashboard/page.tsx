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
        <h1 className="text-2xl font-semibold tracking-tight">
          Bem-vindo, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Suas execuções salvas e o que há de novo no catálogo.
        </p>
      </header>

      <Panel>
        <PanelHeader
          title="Execuções salvas"
          description="Cada execução guarda os parâmetros e a versão do modelo que os interpretou."
        />

        {!runs || runs.data.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--color-ink-faint)]">
            Nenhuma execução salva ainda. Abra uma simulação e guarde um cenário.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {runs.data.map((run) => (
              <li key={run.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--color-ink)]">
                    {run.label ?? "Execução sem rótulo"}
                  </p>
                  {run.module ? (
                    <Link
                      href={`/modulos/${run.module.slug}`}
                      className="text-xs text-[var(--color-ink-faint)] hover:text-[var(--accent)]"
                    >
                      {run.module.title}
                    </Link>
                  ) : null}
                </div>
                <span className="tabular text-xs text-[var(--color-ink-faint)]">
                  v{run.modelVersion}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <section>
        <h2 className="text-xs tracking-wide text-[var(--color-ink-faint)] uppercase">
          Novidades no catálogo
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.data.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </section>
    </div>
  );
}
